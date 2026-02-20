import requests
import subprocess
import time
import sys
import os

WHITELIST_FILE = "whitelist.json"

def cleanup():
    if os.path.exists(WHITELIST_FILE):
        os.remove(WHITELIST_FILE)

def start_server():
    process = subprocess.Popen(
        ["venv/bin/uvicorn", "backend.main:app", "--port", "8001"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    time.sleep(3)
    return process

def test_persistence():
    print("Test Persistence: Clean start")
    cleanup()
    
    # 1. Start Server
    p1 = start_server()
    base_url = "http://localhost:8001"
    
    try:
        # 2. Add to Whitelist
        print("Adding 'TEST_ACC_1' to whitelist...")
        requests.post(f"{base_url}/whitelist/add", json={"account_ids": ["TEST_ACC_1"]})
        
        # Verify it's there
        resp = requests.get(f"{base_url}/whitelist").json()
        print(f"Current whitelist: {resp}")
        assert "TEST_ACC_1" in resp["whitelisted_accounts"]
        
    finally:
        p1.terminate()
        p1.wait()
        print("Server stopped.")
        
    # 3. Restart Server
    print("Restarting server...")
    p2 = start_server()
    
    try:
        # 4. Check Whitelist
        print("Checking whitelist after restart...")
        resp = requests.get(f"{base_url}/whitelist").json()
        print(f"Current whitelist: {resp}")
        
        if "TEST_ACC_1" in resp["whitelisted_accounts"]:
            print("PASSED: Whitelist persisted.")
        else:
            print("FAILED: Whitelist did NOT persist.")
            sys.exit(1)
            
    finally:
        p2.terminate()
        p2.wait()
        cleanup()
        print("Test Teardown Complete.")

if __name__ == "__main__":
    test_persistence()
