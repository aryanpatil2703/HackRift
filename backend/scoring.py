import pandas as pd
import math
from collections import defaultdict
from typing import List, Dict, Set
from .models import SuspiciousAccount, FraudRing, DetectionResponse, AnalysisSummary

class UnionFind:
    def __init__(self, elements):
        self.parent = {e: e for e in elements}

    def union(self, a, b):
        root_a = self.find(a)
        root_b = self.find(b)
        if root_a != root_b:
            self.parent[root_b] = root_a

    def find(self, a):
        if self.parent[a] == a:
            return a
        self.parent[a] = self.find(self.parent[a])
        return self.parent[a]
    
    def get_groups(self):
        groups = defaultdict(list)
        for node in self.parent:
            root = self.find(node)
            groups[root].append(node)
        return list(groups.values())

class FraudScorer:
    def __init__(self, df: pd.DataFrame):
        self.df = df
        self.nodes = set(df['sender_id']).union(set(df['receiver_id']))
        self.stats = self._compute_base_stats()
        
    def _compute_base_stats(self):
        stats = defaultdict(lambda: {'tx_count': 0, 'total_amt': 0, 'avg_amt': 0, 'unique_neighbors': set()})
        
        node_timestamps = defaultdict(list)
        for _, row in self.df.iterrows():
            src, dst = row['sender_id'], row['receiver_id']
            ts, amt = row['timestamp'], row['amount']
            
            node_timestamps[src].append(ts)
            node_timestamps[dst].append(ts)
            
            stats[src]['total_amt'] += amt
            stats[dst]['total_amt'] += amt
            stats[src]['tx_count'] += 1
            stats[dst]['tx_count'] += 1
            
            stats[src]['unique_neighbors'].add(dst)
            stats[dst]['unique_neighbors'].add(src)

        # Compute Max 72h Velocity
        for node, timestamps in node_timestamps.items():
            timestamps.sort()
            max_in_72h = 0
            if not timestamps:
                stats[node]['velocity'] = 0
                continue
                
            left = 0
            for right in range(len(timestamps)):
                while (timestamps[right] - timestamps[left]).total_seconds() > 72 * 3600:
                    left += 1
                max_in_72h = max(max_in_72h, right - left + 1)
            
            stats[node]['velocity'] = max_in_72h
            if stats[node]['tx_count'] > 0:
                stats[node]['avg_amt'] = stats[node]['total_amt'] / stats[node]['tx_count']
                
        return stats

    def compute_node_score(self, node, flags, s, N, weights):
        """Helper to compute score for a single node with heuristics"""
        f = flags[node]
        
        # Binary Flags
        cycle_score = 1.0 if any(x.startswith('cycle') for x in f) else 0.0
        fan_in_score = 1.0 if 'fan_in' in f else 0.0
        fan_out_score = 1.0 if 'fan_out' in f else 0.0
        layered_score = 1.0 if 'layered_shell' in f else 0.0
        
        # Continuous Scores
        velocity_val = s['velocity']
        velocity_score = min(1.0, velocity_val / 50.0)
        
        avg_amt = s['avg_amt']
        avg_amount_score = min(1.0, math.log10(avg_amt + 1) / 6.0) if avg_amt > 0 else 0
        
        degree = len(s['unique_neighbors']) 
        centrality_score = degree / max(1, N - 1)

        raw_score = (
            weights['cycle'] * cycle_score +
            weights['fan_in'] * fan_in_score +
            weights['fan_out'] * fan_out_score +
            weights['layered'] * layered_score +
            weights['velocity'] * velocity_score +
            weights['avg_amount'] * avg_amount_score +
            weights['centrality'] * centrality_score
        )
        
        # --- Merchant Heuristic ---
        # 1. High Volume Heuristic (Legacy/Large Scale)
        if degree >= 50 and s['tx_count'] >= 200 and avg_amt < 1000:
             raw_score *= 0.25 

        # 2. Ratio Heuristic (Small Scale / Pattern Based)
        # Merchants typically receive money (high in-degree) but rarely send to mules (low out-degree).
        # We check for high Fan-In behavior with zero or near-zero Fan-Out.
        # Check actual directionality from stats?
        # s['unique_neighbors'] is undirected set. We need directed counts.
        # But we can infer from 'fan_in' flag + absence of 'fan_out' flag + moderate volume.
        
        if 'fan_in' in f and 'fan_out' not in f and 'cycle' not in ''.join(f) and s['tx_count'] >= 10:
             # Likely a merchant or payroll account receiving funds.
             # If they are just receiving (Fan-In) and not sending (Fan-Out) or cycling, 
             # they are a sink, not a mule.
             raw_score *= 0.25

        return round(raw_score * 100, 1)

    def score(self, cycles: List[List[str]], smurfing_events: List[Dict], layered_shells: List[List[str]], processing_time: float, whitelist: Set[str] = set()) -> DetectionResponse:
        
        # 1. Initialize Flags
        flags = defaultdict(set)
        
        # 1a. Filter out Merchant/Payroll Smurfing Events
        # We identify "Safe Hubs" to avoid falst positives on Retail Merchants.
        # Heuristic: Hub has many incoming (Fan-In) but NO outgoing (Fan-Out) or Cycles.
        
        filtered_smurfing = []
        for event in smurfing_events:
            main_node = event['main']
            # Check if main_node is involved in any cycles
            in_cycle = False
            for c in cycles:
                if main_node in c:
                    in_cycle = True
                    break
            
            # Check if main_node is a source in any Fan-Out event
            is_fan_out_source = False
            for e2 in smurfing_events:
                if e2['type'] == 'fan_out' and e2['main'] == main_node:
                    is_fan_out_source = True
                    break
            
            # Merchant Detection Logic
            # If it's a Fan-In (money coming in), not in a cycle, and not sending money out (Fan-Out)
            # It is likely a sink (Merchant).
            if event['type'] == 'fan_in' and not in_cycle and not is_fan_out_source:
                # Retrieve stats
                stats = self.stats[main_node]
                # High volume check
                # AND Low Average Amount check (Distinguishes Retail from Mule Sinks)
                if stats['tx_count'] >= 10 and stats['avg_amt'] < 800:
                     # This is a Merchant. Skip this event.
                     continue
            
            filtered_smurfing.append(event)

        smurfing_events = filtered_smurfing

        # 2. Process Detections & Build Rings
        affected_nodes = set()
        
        for cycle in cycles:
            if any(n in whitelist for n in cycle): continue
            for node in cycle:
                flags[node].add(f'cycle_length_{len(cycle)}')
                affected_nodes.add(node)
                
        for event in smurfing_events:
            if event['main'] in whitelist: continue
            affected_nodes.add(event['main'])
            flags[event['main']].add(event['type'])
            
            for node in event['members']:
                if node in whitelist: continue
                flags[node].add(event['type'])
                affected_nodes.add(node)
        
        for path in layered_shells:
            if any(n in whitelist for n in path): continue
            for node in path:
                flags[node].add('layered_shell')
                affected_nodes.add(node)

        # 3. Union Find for Rings
        uf = UnionFind(affected_nodes)
        
        for cycle in cycles:
            if any(n in whitelist for n in cycle): continue
            for i in range(len(cycle) - 1):
                uf.union(cycle[i], cycle[i+1])
        
        for event in smurfing_events:
            if event['main'] in whitelist: continue
            main = event['main']
            for member in event['members']:
                if member in whitelist: continue
                uf.union(main, member)
                
        for path in layered_shells:
            if any(n in whitelist for n in path): continue
            for i in range(len(path) - 1):
                uf.union(path[i], path[i+1])

        # 4. Calculate Scores
        suspicious_accounts = []
        node_scores = {}
        
        weights = {
            'cycle': 0.35, 'fan_in': 0.10, 'fan_out': 0.10, 'layered': 0.15,
            'velocity': 0.10, 'avg_amount': 0.10, 'centrality': 0.10
        }
        
        N = len(self.nodes)
        
        for node in affected_nodes:
            if node in whitelist: continue
            
            final_score = self.compute_node_score(node, flags, self.stats[node], N, weights)
            node_scores[node] = final_score
            
            if final_score >= 10.0:
                 suspicious_accounts.append({
                     'account_id': node,
                     'suspicion_score': final_score,
                     'detected_patterns': sorted(list(flags[node]))
                 })

        # 5. Build Rings
        groups = uf.get_groups()
        fraud_rings = []
        
        # node_scores already computed

        # Sort suspicious accounts
        suspicious_list = sorted(
            [s for s in suspicious_accounts], 
            key=lambda x: x['suspicion_score'], 
            reverse=True
        )

        # Build Ring Objects
        ring_map = {} # node -> ring_id
        
        for idx, group in enumerate(groups):
            valid_members = [m for m in group if m not in whitelist]
            if not valid_members: continue
            
            # Risk Score: Average of member suspicion scores
            scores = [node_scores.get(m, 0.0) for m in valid_members]
            avg_risk = sum(scores) / len(scores) if scores else 0
            
            # Determine Main Pattern
            all_patterns = []
            for n in valid_members:
                all_patterns.extend(flags[n])
            
            unique_patterns = set(all_patterns)
            if any(p.startswith('cycle') for p in unique_patterns):
                pattern_type = 'cycle'
            elif 'layered_shell' in unique_patterns:
                pattern_type = 'layered_shell'
            elif 'fan_in' in unique_patterns:
                pattern_type = 'smurfing_fan_in'
            elif 'fan_out' in unique_patterns:
                 pattern_type = 'smurfing_fan_out'
            else:
                pattern_type = 'mixed'
            
            fraud_rings.append({
                'members': sorted(valid_members),
                'risk_score': round(avg_risk, 1),
                'pattern_type': pattern_type
            })

        # Sort Rings by Risk
        fraud_rings.sort(key=lambda x: x['risk_score'], reverse=True)
        
        final_rings_output = []
        for i, r in enumerate(fraud_rings):
            ring_id = f"RING_{i+1:03d}"
            r['ring_id'] = ring_id
            
            # Update suspicious accounts with Ring ID
            for m in r['members']:
                ring_map[m] = ring_id
                
            final_rings_output.append(FraudRing(
                ring_id=ring_id,
                member_accounts=r['members'],
                pattern_type=r['pattern_type'],
                risk_score=r['risk_score']
            ))
            
        # Backfill Ring ID to Suspicious Accounts
        final_suspicious = []
        for s in suspicious_list:
            if s['account_id'] in ring_map:
                s['ring_id'] = ring_map[s['account_id']]
            final_suspicious.append(SuspiciousAccount(**s))

        # 6. Generate Graph Data (Cytoscape format)
        cytoscape_elements = {
            "nodes": [],
            "edges": []
        }
        
        # Add Nodes
        for node in self.nodes:
            score = node_scores.get(node, 0.0)
            is_suspicious = score >= 10.0
            patterns = list(flags[node])
            
            cytoscape_elements["nodes"].append({
                "data": {
                    "id": str(node),
                    "suspicion_score": score,
                    "is_suspicious": is_suspicious,
                    "patterns": patterns,
                    "ring_id": ring_map.get(node)
                }
            })
            
        # Add Edges
        # Group parallel edges? Or just list them? 
        # Large graph: maybe aggregate? Or just limit?
        # Let's list individual transactions but limit edge count if huge.
        # For hackathon/10k, full list is OK.
        
        for _, row in self.df.iterrows():
            cytoscape_elements["edges"].append({
                "data": {
                    "id": str(row['transaction_id']),
                    "source": str(row['sender_id']),
                    "target": str(row['receiver_id']),
                    "amount": float(row['amount']),
                    "timestamp": str(row['timestamp'])
                }
            })

        return DetectionResponse(
            suspicious_accounts=final_suspicious,
            fraud_rings=final_rings_output,
            summary=AnalysisSummary(
                total_accounts_analyzed=N,
                suspicious_accounts_flagged=len(final_suspicious),
                fraud_rings_detected=len(final_rings_output),
                processing_time_seconds=processing_time
            ),
            graph_data=cytoscape_elements
        )
