import pandas as pd
import pytest
from backend.detectors import build_adjacency, find_cycles, find_smurfing, find_layered_shells
from io import StringIO
from datetime import datetime, timedelta

def make_df(csv_text):
    return pd.read_csv(StringIO(csv_text), parse_dates=['timestamp'])

def test_cycle_detection():
    # A -> B -> C -> A (Cycle of length 3)
    csv = """transaction_id,sender_id,receiver_id,amount,timestamp
TX_1,A,B,100,2025-01-01 10:00:00
TX_2,B,C,100,2025-01-01 11:00:00
TX_3,C,A,100,2025-01-01 12:00:00
"""
    df = make_df(csv)
    adj, rev, stats, nodes = build_adjacency(df)
    cycles = find_cycles(adj, nodes)
    
    assert len(cycles) == 1
    assert sorted(cycles[0]) == ['A', 'B', 'C']

def test_smurfing_fan_in():
    # 10 senders -> 1 receiver (Threshold is 10)
    csv = "transaction_id,sender_id,receiver_id,amount,timestamp\n"
    for i in range(1, 11):
        csv += f"TX_{i},SENDER_{i},RECEIVER,10,2025-01-01 10:{i:02d}:00\n"
        
    df = make_df(csv)
    events = find_smurfing(df)
    
    assert len(events) == 1
    assert events[0]['type'] == 'fan_in'
    assert events[0]['main'] == 'RECEIVER'
    assert events[0]['unique_count'] == 10

def test_smurfing_fan_out():
    # 1 sender -> 10 receivers
    csv = "transaction_id,sender_id,receiver_id,amount,timestamp\n"
    for i in range(1, 11):
        csv += f"TX_{i},SENDER,RECEIVER_{i},10,2025-01-01 10:{i:02d}:00\n"
        
    df = make_df(csv)
    events = find_smurfing(df)
    
    assert len(events) == 1
    assert events[0]['type'] == 'fan_out'
    assert events[0]['main'] == 'SENDER'

def test_layered_shells():
    # A -> Shell1 -> Shell2 -> B
    # Shells have low activity (2-3 txs)
    # A: Out(1)
    # Shell1: In(1), Out(1) -> Total 2
    # Shell2: In(1), Out(1) -> Total 2
    # B: In(1)
    
    csv = """transaction_id,sender_id,receiver_id,amount,timestamp
TX_1,A,Shell1,100,2025-01-01 10:00:00
TX_2,Shell1,Shell2,100,2025-01-01 11:00:00
TX_3,Shell2,B,100,2025-01-01 12:00:00
"""
    df = make_df(csv)
    adj, rev, stats, nodes = build_adjacency(df)
    
    # Layered shell detector needs node stats
    # Check stats first
    assert stats['Shell1']['total_tx'] == 2
    assert stats['Shell2']['total_tx'] == 2
    
    shells = find_layered_shells(adj, stats, nodes)
    
    # Expect: A -> Shell1 -> Shell2 -> B (Length 4)
    assert len(shells) >= 1
    path = shells[0]
    assert len(path) == 4
    assert path[1] == 'Shell1'
    assert path[2] == 'Shell2'
