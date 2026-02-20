import requests
import subprocess
import time
import sys
import json
import os

def run_tests():
    print("Killing old servers...")
    subprocess.run(["pkill", "-f", "uvicorn"], check=False)
    time.sleep(1)

    try:
        if os.path.exists("whitelist.json"):
            os.remove("whitelist.json")
    except:
        pass

    print("Starting backend server...")
    # Start server in background
    process = subprocess.Popen(
        ["venv/bin/uvicorn", "backend.main:app", "--port", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    time.sleep(5) # Wait for server startup
    
    try:
        base_url = "http://localhost:8000"
        
        # --- Phase 1: Initial Upload ---
        print("\n--- Phase 1: Initial Upload ---")
        url = f"{base_url}/upload"
        files = {'file': open('sample_data.csv', 'rb')}
        
        print(f"Sending request to {url}...")
        response = requests.post(url, files=files)
        
        if response.status_code == 200:
            print("Initial upload successful!")
            data = response.json()
            
            # Validation
            assert "suspicious_accounts" in data
            assert "fraud_rings" in data
            assert "summary" in data
            
            suspicious_ids = {sa['account_id'] for sa in data['suspicious_accounts']}
            print(f"Suspicious IDs found: {suspicious_ids}")
            
            # Expecting ACC_HERDER, ACC_MULE_1, ACC_SHELL_SRC
            if "ACC_MULE_1" in suspicious_ids and "ACC_SHELL_SRC" in suspicious_ids:
                 print("PASSED: Target accounts found in initial scan.")
            else:
                 print("FAILED: Target accounts NOT found initially.")
                 sys.exit(1)
        else:
            print(f"Request failed with status {response.status_code}")
            sys.exit(1)
            
        # --- Phase 2: Whitelisting ---
        print("\n--- Phase 2: Whitelisting ---")
        whitelist_url = f"{base_url}/whitelist/add"
        # We whitelist ACC_A to break the Cycle ring, 
        # but keep MULE_1 and SHELL_SRC to verify Smurfing and Layered rings survive.
        whitelist_payload = {"account_ids": ["ACC_A"]}
        
        print(f"Adding to whitelist: {whitelist_payload}")
        resp = requests.post(whitelist_url, json=whitelist_payload)
        assert resp.status_code == 200
        print("Whitelist response:", resp.json())
        
        # --- Phase 3: Re-Upload & Verify ---
        print("\n--- Phase 3: Re-Upload & Verify ---")
        files = {'file': open('sample_data.csv', 'rb')}
        response = requests.post(url, files=files)
        
        assert response.status_code == 200
        data = response.json()
        suspicious_ids_2 = {sa['account_id'] for sa in data['suspicious_accounts']}
        print(f"Suspicious IDs after whitelist: {suspicious_ids_2}")
        
        # 1. ACC_A should be gone
        if "ACC_A" not in suspicious_ids_2:
            print("PASSED: Whitelisted account ACC_A ignored.")
        else:
            print("FAILED: ACC_A still present!")
            sys.exit(1)
            
        # 2. Layered Shell (SRC) and Smurfing (Herder) should be PRESENT now
        if "ACC_SHELL_SRC" in suspicious_ids_2 and "ACC_HERDER" in suspicious_ids_2:
             print("PASSED: Layered and Smurfing rings survived.")
        else:
             print("FAILED: Non-whitelisted rings disappeared unexpectedly.")
             sys.exit(1)

        print("\nAll integration tests passed!")
            
    except Exception as e:
        print(f"Test Exception: {e}")
        sys.exit(1)
    finally:
        print("Stopping server...")
        process.terminate()
        process.wait()

if __name__ == "__main__":
    run_tests()
