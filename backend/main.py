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

# --- CORE LOGIC ---
async def logic_add_whitelist(req: WhitelistRequest):
    global whitelist
    with _whitelist_lock:
        whitelist.update(req.account_ids)
        try:
            with open(WHITELIST_FILE, "w") as f:
                json.dump(list(whitelist), f)
        except Exception as e:
            print(f"Failed to save whitelist: {e}")
    return {"message": f"Added {len(req.account_ids)} accounts to whitelist", "total_whitelisted": len(whitelist)}

async def logic_get_whitelist():
    return {"whitelisted_accounts": list(whitelist)}

# Global cache for simplicity in hackathon context
latest_result = None

async def logic_upload(file: UploadFile):
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
    
    result = scorer.score(cycles, smurfing, layered, 0.0, whitelist)
    
    end_time = time.perf_counter()
    final_processing_time = round(end_time - start_time, 4)
    
    # Update the summary with the correct time
    result.summary.processing_time_seconds = final_processing_time
    
    latest_result = result
    return result

async def logic_download():
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

# --- DUAL ROUTING (Root + /api prefix) ---
# This ensures that whether Vercel strips the prefix or not, the route is found.
# It also handles local dev (usually root or whatever vite proxy sends).

# Helper to register routes
def register_route(path, endpoint, methods, response_model=None):
    app.add_api_route(path, endpoint, methods=methods, response_model=response_model)
    # Register explicitly properly
    # Note: add_api_route takes 'endpoint' which is the function.

# 1. Whitelist Add
app.add_api_route("/whitelist/add", logic_add_whitelist, methods=["POST"])
app.add_api_route("/api/whitelist/add", logic_add_whitelist, methods=["POST"])

# 2. Whitelist Get
app.add_api_route("/whitelist", logic_get_whitelist, methods=["GET"])
app.add_api_route("/api/whitelist", logic_get_whitelist, methods=["GET"])

# 3. Upload
app.add_api_route("/upload", logic_upload, methods=["POST"], response_model=DetectionResponse)
app.add_api_route("/api/upload", logic_upload, methods=["POST"], response_model=DetectionResponse)

# 4. Download
app.add_api_route("/download-json", logic_download, methods=["GET"], response_model=DetectionResponse)
app.add_api_route("/api/download-json", logic_download, methods=["GET"], response_model=DetectionResponse)

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Backend is running"}

@app.get("/api")
def health_check_api():
    return {"status": "ok", "message": "Backend API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
