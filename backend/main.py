from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from .models import DetectionResponse, AnalysisSummary
from .utils import parse_csv
from .detectors import build_adjacency, find_cycles, find_smurfing, find_layered_shells
from .scoring import FraudScorer
import time

app = FastAPI(title="RIFT 2026 Money Muling Detection")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from pydantic import BaseModel
from typing import List, Set

import json
import os

import threading
from .config import WHITELIST_FILE

# Thread lock for whitelist file
_whitelist_lock = threading.Lock()

# Global whitelist cache
whitelist = set()

# Load whitelist on startup
if os.path.exists(WHITELIST_FILE):
    try:
        with open(WHITELIST_FILE, "r") as f:
            data = json.load(f)
            if isinstance(data, list):
                whitelist = set(data)
    except Exception as e:
        print(f"Failed to load whitelist: {e}")
        # Valid: fallback to empty, maybe backup corrupt file? 
        # For now, just log.

class WhitelistRequest(BaseModel):
    account_ids: List[str]

@app.post("/whitelist/add")
async def add_to_whitelist(req: WhitelistRequest):
    global whitelist
    
    with _whitelist_lock: # Thread-safe update
        whitelist.update(req.account_ids)
        # Save to file
        try:
            with open(WHITELIST_FILE, "w") as f:
                json.dump(list(whitelist), f)
        except Exception as e:
            print(f"Failed to save whitelist: {e}")
        
    return {"message": f"Added {len(req.account_ids)} accounts to whitelist", "total_whitelisted": len(whitelist)}

@app.get("/whitelist")
async def get_whitelist():
    return {"whitelisted_accounts": list(whitelist)}

# Global cache for simplicity in hackathon context
latest_result = None

@app.post("/upload", response_model=DetectionResponse)
async def upload_transactions(file: UploadFile = File(...)):
    global latest_result
    start_time = time.perf_counter()
    
    # 1. Parse CSV
    df = await parse_csv(file)
    
    # 2. Build Graph & Stats
    adj, rev_adj, node_stats, nodes = build_adjacency(df)
    
    # 3. Run Detectors
    cycles = find_cycles(adj, nodes)
    smurfing = find_smurfing(df)
    layered = find_layered_shells(adj, node_stats, nodes)
    
    # 4. Scoring & Grouping
    scorer = FraudScorer(df)
    
    # Pass 0.0 initially, we update summary later or just pass current diff?
    # We want processing_time to include scoring.
    # So we score first, THEN measure end time.
    # But scorer.score expects processing_time.
    # Let's pass 0.0 and update the summary object after.
    
    result = scorer.score(cycles, smurfing, layered, 0.0, whitelist)
    
    end_time = time.perf_counter()
    final_processing_time = round(end_time - start_time, 4)
    
    # Update the summary with the correct time
    result.summary.processing_time_seconds = final_processing_time
    
    latest_result = result
    return result

@app.get("/download-json", response_model=DetectionResponse)
async def download_json():
    global latest_result
    if latest_result:
        return latest_result
    return DetectionResponse(
        suspicious_accounts=[], 
        fraud_rings=[], 
        summary=AnalysisSummary(
            total_accounts_analyzed=0,
            suspicious_accounts_flagged=0,
            fraud_rings_detected=0,
            processing_time_seconds=0.0
        ),
        graph_data={"nodes": [], "edges": []}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
