import pandas as pd
from datetime import timedelta
from typing import List, Dict, Set, Tuple
from collections import defaultdict
from .config import CYCLE_MIN_LEN, CYCLE_MAX_LEN, SMURF_WINDOW_HOURS, SMURF_THRESHOLD, SHELL_MIN_TX, SHELL_MAX_TX

# --- Graph Structure Helper ---
def build_adjacency(df: pd.DataFrame):
    """
    Builds adjacency list from DataFrame.
    Returns: adj (outgoing), rev_adj (incoming), node_stats (degree info)
    """
    adj = defaultdict(list)
    rev_adj = defaultdict(list)
    nodes = set()
    
    # Pre-calculate node statistics for layered shell detection
    node_stats = defaultdict(lambda: {'in_degree': 0, 'out_degree': 0, 'total_tx': 0})

    for _, row in df.iterrows():
        src, dst = row['sender_id'], row['receiver_id']
        amt, ts = row['amount'], row['timestamp']
        tx_id = row['transaction_id']
        
        nodes.add(src)
        nodes.add(dst)
        
        adj[src].append((dst, tx_id, amt, ts))
        rev_adj[dst].append((src, tx_id, amt, ts))
        
        node_stats[src]['out_degree'] += 1
        node_stats[dst]['in_degree'] += 1

    for n in nodes:
        node_stats[n]['total_tx'] = node_stats[n]['in_degree'] + node_stats[n]['out_degree']

    return adj, rev_adj, node_stats, nodes


# --- Algorithm 1: Cycle Detection (Length-bounded simple DFS) ---
def find_cycles(
    adj: Dict[str, List[Tuple[str, str, float, "datetime"]]],
    nodes: Set[str],
    min_len: int = CYCLE_MIN_LEN,
    max_len: int = CYCLE_MAX_LEN,
    scc_size_limit: int = 10,
    amount_ratio_threshold: float = 1.5,
    max_cycle_duration_hours: int = 72,
    max_cycles: int = 10000,
) -> List[List[str]]:
    """
    Constrained cycle finder for AML use:
      - Only searches inside SCCs (Tarjan).
      - Skips SCCs larger than scc_size_limit (prevents explosion).
      - Enforces strictly increasing timestamps along the cycle.
      - Enforces total cycle duration <= max_cycle_duration_hours.
      - Enforces amount similarity: max(amounts)/min(amounts) <= amount_ratio_threshold.
      - Returns list of cycles (each is list of node ids), canonicalized (rotation).
    Parameters:
      adj: mapping node -> list of (neighbor, tx_id, amount, timestamp)
      nodes: set of nodes to consider
    """
    # Build pure-neighbor graph for Tarjan & basic degree filtering
    G = {n: {nei for (nei, *_rest) in adj.get(n, []) if nei in nodes and nei != n} for n in nodes}

    # Quick filter: keep only nodes with in & out degree > 0
    indeg = defaultdict(int)
    outdeg = defaultdict(int)
    for u in G:
        outdeg[u] = len(G[u])
        for v in G[u]:
            indeg[v] += 1
    cycle_nodes = {n for n in nodes if indeg.get(n, 0) > 0 and outdeg.get(n, 0) > 0}
    if not cycle_nodes:
        return []

    # Deterministic ordering + index map (for canonical rotation/pruning)
    ordered_nodes = sorted(cycle_nodes)
    index = {n: i for i, n in enumerate(ordered_nodes)}

    # --- Tarjan SCC ---
    def tarjan_scc(nodes_subset: Set[str], graph: Dict[str, Set[str]]):
        """
        Recursive Tarjan can blow the Python recursion limit on adversarial graphs.
        To keep the service robust, we:
          - Hard-cap the number of nodes we will analyze in one call.
          - Catch RecursionError and fall back to "no SCCs" for this subset.
        This preserves correctness on realistic-size rings (including moderately
        large SCCs) while preventing 500s on extremely large / deeply nested
        components.
        """
        MAX_TARJAN_NODES = 5000
        if len(nodes_subset) > MAX_TARJAN_NODES:
            # Graph is too large for safe recursive Tarjan; skip cycle search here.
            return []

        index_counter = 0
        index_map = {}
        lowlink = {}
        stack = []
        onstack = set()
        sccs = []

        def strongconnect(v):
            nonlocal index_counter
            index_map[v] = index_counter
            lowlink[v] = index_counter
            index_counter += 1
            stack.append(v)
            onstack.add(v)

            for w in graph.get(v, set()):
                if w not in nodes_subset:
                    continue
                if w not in index_map:
                    strongconnect(w)
                    lowlink[v] = min(lowlink[v], lowlink[w])
                elif w in onstack:
                    lowlink[v] = min(lowlink[v], index_map[w])

            if lowlink[v] == index_map[v]:
                scc = []
                while True:
                    w = stack.pop()
                    onstack.remove(w)
                    scc.append(w)
                    if w == v:
                        break
                sccs.append(scc)

        try:
            for v in list(nodes_subset):
                if v not in index_map:
                    strongconnect(v)
        except RecursionError:
            # Safety: if recursion depth explodes, abandon SCCs for this subset.
            return []

        return sccs

    # canonicalize cycle by rotating to smallest index node
    def canonicalize_cycle(path: Tuple[str, ...]) -> Tuple[str, ...]:
        n = len(path)
        min_i = min(range(n), key=lambda i: index.get(path[i], 0))
        return tuple(path[min_i:] + path[:min_i])

    cycles = set()
    # We'll DFS inside each small SCC. Use iterative stack to avoid recursion limits.
    remaining = set(ordered_nodes)

    for s in ordered_nodes:
        if s not in remaining:
            continue

        # Build subgraph of nodes with index >= index[s] and still remaining
        sub_nodes = {v for v in remaining if index[v] >= index[s]}
        if not sub_nodes:
            remaining.discard(s)
            continue

        sccs = tarjan_scc(sub_nodes, G)

        # Pick SCCs that can contain cycles and are not too large
        target_scc = None
        min_scc_node = None
        for scc in sccs:
            if len(scc) == 1:
                v = scc[0]
                if v in G and v in G[v]:
                    valid = True
                else:
                    valid = False
            else:
                valid = True
            if not valid:
                continue
            # choose smallest index vertex in this SCC that's >= s
            scc_min = min(scc, key=lambda x: index[x])
            if min_scc_node is None or index[scc_min] < index[min_scc_node]:
                min_scc_node = scc_min
                target_scc = set(scc)

        if not target_scc:
            remaining.discard(s)
            continue

        # Skip very large SCCs to avoid explosion (they will generate many cycles)
        if len(target_scc) > scc_size_limit:
            # remove the minimal node of the SCC (Johnson style) and continue
            remaining.discard(min_scc_node)
            # also remove edges into it in G to shrink future SCCs
            for u in G:
                if min_scc_node in G[u]:
                    G[u].remove(min_scc_node)
            continue

        # We will root DFS at the smallest node s0 in this SCC
        s0 = min(target_scc, key=lambda x: index[x])

        # Iterative DFS stack entries:
        # (current_node, path_nodes_list, edge_amounts_list, edge_timestamps_list)
        stack = [(s0, [s0], [], [])]

        while stack:
            curr, path, amounts, timestamps = stack.pop()

            # Depth prune
            if len(path) > max_len:
                continue

            # Explore all outgoing edges from curr (use full adj entries)
            for (nei, tx_id, amt, ts) in adj.get(curr, []):
                # must stay inside this SCC
                if nei not in target_scc:
                    continue

                # lexicographic pruning to avoid rotated duplicates: only explore neighbors with index >= s0's index
                if index.get(nei, -1) < index.get(s0, -1):
                    continue

                # if neighbor is start node -> candidate cycle closing
                if nei == s0:
                    # there is a closing edge with timestamp ts and amount amt
                    cycle_len = len(path)
                    if cycle_len >= min_len:
                        # Build timestamps list for full cycle: existing timestamps + closing edge ts
                        full_ts = timestamps + [ts]
                        full_amts = amounts + [amt]

                        # timestamps must be strictly increasing along path:
                        # i.e., timestamp[i] < timestamp[i+1] for all i
                        monotonic = True
                        for a, b in zip(full_ts, full_ts[1:]):
                            if not (a < b):
                                monotonic = False
                                break
                        if not monotonic:
                            continue

                        # total duration constraint (first -> last)
                        duration = full_ts[-1] - full_ts[0]
                        if duration > timedelta(hours=max_cycle_duration_hours):
                            continue

                        # amount similarity constraint
                        if min(full_amts) <= 0:
                            # avoid division by zero / invalid amounts; skip if non-positive
                            continue
                        if (max(full_amts) / min(full_amts)) > amount_ratio_threshold:
                            continue

                        # canonicalize path (nodes only)
                        can = canonicalize_cycle(tuple(path))
                        cycles.add(can)
                        if len(cycles) >= max_cycles:
                            break
                    # else not long enough
                    continue

                # otherwise neighbor is an intermediate node; avoid revisits
                if nei in path:
                    continue

                # timestamp monotonic check for extension:
                if timestamps:
                    last_ts = timestamps[-1]
                    if not (last_ts < ts):
                        # next edge timestamp must be strictly greater than previous
                        continue

                # amount check for partial path: we allow extending, but we keep amounts list to evaluate when cycle closes
                new_path = path + [nei]
                new_amounts = amounts + [amt]
                new_timestamps = timestamps + [ts]

                # Only push if we haven't exceeded max_len
                if len(new_path) <= max_len:
                    stack.append((nei, new_path, new_amounts, new_timestamps))

            if len(cycles) >= max_cycles:
                break

        # Johnson-style vertex removal and edge trimming
        remaining.discard(s0)
        for u in G:
            if s0 in G[u]:
                G[u].remove(s0)

        if len(cycles) >= max_cycles:
            break

    # stable ordering
    sorted_cycles = sorted(list(cycles), key=lambda t: (len(t), tuple(t)))
    return [list(c) for c in sorted_cycles]



# --- Algorithm 2: Smurfing Detection (Fan-in/Fan-out) ---
def find_smurfing(df: pd.DataFrame) -> List[Dict]:
    """
    Detects smurfing: High volume of small transactions.
    Fan-in: Many unique senders -> One receiver (within window)
    Fan-out: One sender -> Many unique receivers (within window)
    Threshold: >= SMURF_THRESHOLD unique counterparties (default 10)
    """
    events = []
    
    # helper
    def check_window(sub_df, main_col, other_col, type_label):
        # Group by main account
        grouped = sub_df.groupby(main_col)
        
        for main_acc, group in grouped:
            if len(group) < 5:
                continue
                
            group = group.sort_values('timestamp')
            timestamps = group['timestamp'].tolist()
            others = group[other_col].tolist()
            
            # Sliding window 72h
            left = 0
            # We want to find a window with >= 5 unique 'others'
            # We can just iterate all windows?
            # Optimization: Max unique count in window.
            # But we need to report the specific event window.
            # Let's greedily find the first valid window? 
            # Or best window? Summary said "prefer largest or earliest".
            # Let's simple sliding window scan.
            
            current_window_others = defaultdict(int) 
            # sliding window pointers
            
            # actually pure sliding window on timestamps is O(N)
            # but we need unique count of others.
            
            l = 0
            unique_in_window = 0
            counter = defaultdict(int)
            
            # We'll stick to a simple approach: 
            # For each transaction as start, check if next transactions within 72h form a set >=5
            # To avoid duplicates, if we find a window starting at i, we can skip overlapping ones or merge?
            # "Deduplicating smurfing detection events and preferring representative windows."
            
            i = 0
            while i < len(timestamps):
                # Window start
                start_time = timestamps[i]
                end_time = start_time + timedelta(hours=SMURF_WINDOW_HOURS)
                
                # Expand window
                j = i
                window_others = set()
                window_indices = []
                
                while j < len(timestamps) and timestamps[j] <= end_time:
                    window_others.add(others[j])
                    window_indices.append(j)
                    j += 1
                
                if len(window_others) >= SMURF_THRESHOLD:
                    # Found a pattern
                    events.append({
                        "main": str(main_acc),
                        "type": type_label,
                        "members": list(window_others),
                        "start_time": str(start_time),
                        "end_time": str(timestamps[j-1]),
                        "unique_count": len(window_others)
                    })
                    # Skip to end of this window to avoid overlapping duplicates (greedy dedupe)
                    i = j 
                else:
                    i += 1
                    
    check_window(df, 'receiver_id', 'sender_id', 'fan_in')
    check_window(df, 'sender_id', 'receiver_id', 'fan_out')
    
    return events

# --- Algorithm 3: Layered Shell Detection ---
def find_layered_shells(adj: Dict, node_stats: Dict, nodes: Set) -> List[List[str]]:
    """
    Detects layered shell chains: Paths of length >= 3 hops (4 nodes) 
    where intermediate nodes are 'shells' (low total tx count, e.g. 2-3).
    Optimized: Only records maximal paths.
    """
    layered_paths = set()
    
    # Pre-compute shell candidates
    shell_candidates = {
        n for n in nodes 
        if SHELL_MIN_TX <= node_stats[n].get('total_tx', 0) <= SHELL_MAX_TX
    }
    
    for start in nodes:
        # Start DFS
        stack = [(start, [start])]
        
        while stack:
            curr, path = stack.pop()
            
            if len(path) > 10: # Safety break
                continue
            
            can_extend = False
            
            for neighbor, _, _, _ in adj.get(curr, []):
                if neighbor in path: 
                    continue
                
                is_start = (curr == start)
                current_is_shell = (curr in shell_candidates)
                neighbor_is_shell = (neighbor in shell_candidates)
                
                # Check if we can extend from 'curr'
                # To extend, 'curr' must be a valid intermediate (shell) OR start
                if not is_start and not current_is_shell:
                     continue
                
                new_path = path + [neighbor]

                # If neighbor is shell, we extend but don't record yet (wait for non-shell end)
                # If neighbor is NOT shell, we stop and record if valid
                
                if neighbor_is_shell:
                    stack.append((neighbor, new_path))
                    can_extend = True
                else:
                    # Maximal path found (cannot extend further into shells)
                    if len(new_path) >= 4:
                        layered_paths.add(tuple(new_path))
            
            # If we reached a shell that has no outgoing edges/valid neighbors,
            # it might be a maximal path ending in a shell?
            # Prompt implies shell chains should ideally connect real accounts.
            # But "intermediate accounts are shell-like".
            # Usually implies Source -> Shell -> Shell -> Dest.
            # If Dest is a Shell, is it a layered shell network? Technically yes?
            # But our maximality logic handles non-shell ends.
            # If a path ends in a shell and cannot extend, we might miss it if we only record on non-shell neighbors.
            # Let's add a check: if we didn't extend, and length >=4, record it.
            
            if not can_extend and len(path) >= 4:
                 # Check if valid chain (intermediates are shells)
                 # Our traversal ensures intermediates are shells.
                 layered_paths.add(tuple(path))

    return [list(p) for p in layered_paths]
