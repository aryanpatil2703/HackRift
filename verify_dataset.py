import asyncio
import pandas as pd
from backend.models import DetectionResponse
from backend.utils import parse_csv
from backend.detectors import build_adjacency, find_cycles, find_smurfing, find_layered_shells
from backend.scoring import FraudScorer
from fastapi import UploadFile
import io

# Mock UploadFile
class MockUploadFile(UploadFile):
    def __init__(self, filename, content):
        self.filename = filename
        self.file = io.BytesIO(content)

async def main():
    print("--- Starting Verification on money-mulling.csv ---")
    
    # Read file content
    with open("money-mulling.csv", "rb") as f:
        content = f.read()
        
    mock_file = MockUploadFile("money-mulling.csv", content)
    
    # 1. Parse
    print("1. Parsing CSV...")
    df = await parse_csv(mock_file)
    print(f"   Parsed {len(df)} transactions.")
    
    # 2. Build Graph
    print("2. Building Graph...")
    adj, rev_adj, node_stats, nodes = build_adjacency(df)
    print(f"   Nodes: {len(nodes)}")
    
    # 3. Detect
    print("3. Running Detectors...")
    cycles = find_cycles(adj, nodes)
    print(f"   Cycles found: {len(cycles)}")
    for c in cycles:
        print(f"    - Cycle: {c}")

    smurfing = find_smurfing(df)
    print(f"   Smurfing patterns found: {len(smurfing)}")
    for s in smurfing:
        print(f"    - Smurf: {s['main']} ({s['type']}) - {s['unique_count']} txns")

    layered = find_layered_shells(adj, node_stats, nodes)
    print(f"   Layered Shells found: {len(layered)}")
    
    # 4. Score
    print("4. Scoring...")
    scorer = FraudScorer(df)
    whitelist = set() # No whitelist for this test to see raw results
    result = scorer.score(cycles, smurfing, layered, 0.5, whitelist)
    
    # 5. Report
    print("\n--- RESULTS ---")
    print(f"Total Suspicious Accounts: {len(result.suspicious_accounts)}")
    print(f"Total Fraud Rings: {len(result.fraud_rings)}")
    
    print("\nTop 5 Suspicious Accounts:")
    for acc in sorted(result.suspicious_accounts, key=lambda x: x.suspicion_score, reverse=True)[:5]:
        print(f" - {acc.account_id}: Score {acc.suspicion_score} ({acc.detected_patterns})")
        
    print("\nFraud Rings:")
    for ring in result.fraud_rings:
        print(f" - Ring {ring.ring_id}: {ring.pattern_type} (Score {ring.risk_score})")
        print(f"   Members: {ring.member_accounts}")

if __name__ == "__main__":
    asyncio.run(main())
