import pytest
import pandas as pd
from backend.detectors import build_adjacency, find_cycles

def test_simple_3_cycle():
    data = [
        ("TX_001","ACC_A","ACC_B",1000.0,"2025-01-01 10:00:00"),
        ("TX_002","ACC_B","ACC_C",950.0,"2025-01-01 10:30:00"),
        ("TX_003","ACC_C","ACC_A",900.0,"2025-01-01 11:00:00"),
    ]
    df = pd.DataFrame(data, columns=["transaction_id","sender_id","receiver_id","amount","timestamp"])
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    adj, rev_adj, node_stats, nodes = build_adjacency(df)

    cycles = find_cycles(adj, nodes, min_len=3, max_len=3)
    assert len(cycles) == 1
    assert any(set(c) == {"ACC_A","ACC_B","ACC_C"} for c in cycles)

def test_no_cycle():
    data = [
        ("TX_001","ACC_A","ACC_B",1000.0,"2025-01-01 10:00:00"),
        ("TX_002","ACC_B","ACC_C",950.0,"2025-01-01 10:30:00"),
    ]
    df = pd.DataFrame(data, columns=["transaction_id","sender_id","receiver_id","amount","timestamp"])
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    adj, rev_adj, node_stats, nodes = build_adjacency(df)

    cycles = find_cycles(adj, nodes, min_len=3, max_len=3)
    assert len(cycles) == 0

def test_self_loop_ignored():
    data = [
        ("TX_001","ACC_A","ACC_A",1000.0,"2025-01-01 10:00:00"),
    ]
    df = pd.DataFrame(data, columns=["transaction_id","sender_id","receiver_id","amount","timestamp"])
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    adj, rev_adj, node_stats, nodes = build_adjacency(df)

    cycles = find_cycles(adj, nodes, min_len=1, max_len=3)
    # The implementation explicitly ignores self-loops: nei != n
    assert len(cycles) == 0
