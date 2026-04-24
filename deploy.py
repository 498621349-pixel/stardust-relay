#!/usr/bin/env python3
import os
import json
import base64
import requests
import hashlib
import time
import sys

***REMOVED***
PROJECT = "stardust-relay"
***REMOVED***

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}

def get_all_files(dist_path):
    files = []
    for root, dirs, filenames in os.walk(dist_path):
        for filename in filenames:
            filepath = os.path.join(root, filename)
            with open(filepath, "rb") as f:
                content = f.read()
            rel = os.path.relpath(filepath, dist_path)
            files.append((rel, content))
    return files

def sha1_hex(data):
    return hashlib.sha1(data).hexdigest()

def upload_file(token, team_id, project_name, filename, content):
    # Step 1: get upload URL
    payload = {
        "filename": filename,
        "sha": sha1_hex(content),
        "size": len(content),
        "teamId": team_id,
    }
    r = requests.get(
        f"https://api.vercel.com/v2/deployments/upload",
        params={"teamId": team_id, "project": project_name, "filename": filename, "sha": sha1_hex(content), "size": len(content)},
        headers=HEADERS,
        timeout=30,
    )
    print(f"Upload URL response for {filename}: {r.status_code} {r.text[:200]}")
    if r.status_code in (200, 201):
        upload_url = r.json().get("uploadUrl")
        if upload_url:
            # Step 2: PUT content to upload URL
            r2 = requests.put(upload_url, data=content, timeout=60)
            print(f"  PUT to upload URL: {r2.status_code}")
            return True
    return False

def main():
    dist = os.path.join(os.path.dirname(__file__), "dist")
    files = get_all_files(dist)
    print(f"Found {len(files)} files to deploy")

    # Create deployment
    system = {
        "version": 2,
        "name": PROJECT,
        "teamId": TEAM,
        "project": PROJECT,
        "files": [{"file": name, "sha": sha1_hex(content), "size": len(content)} for name, content in files],
    }
    r = requests.post(
        "https://api.vercel.com/v13/deployments",
        headers=HEADERS,
        json=system,
        timeout=30,
    )
    print(f"Create deployment: {r.status_code}")
    if r.status_code not in (200, 201):
        print(r.text[:500])
        sys.exit(1)

    deployment = r.json()
    dep_id = deployment["id"]
    deploy_url = deployment["url"]
    print(f"Deployment created: {dep_id}")
    print(f"URL: https://{deploy_url}")

    # Upload files
    for name, content in files:
        sha = sha1_hex(content)
        r = requests.post(
            f"https://api.vercel.com/v2/deployments/{dep_id}/files",
            headers=HEADERS,
            json={"file": name, "data": base64.b64encode(content).decode(), "encoding": "base64"},
            timeout=30,
        )
        status = "OK" if r.status_code in (200, 201) else f"FAIL {r.status_code}: {r.text[:100]}"
        print(f"  {name}: {status}")

    # Wait for ready
    for i in range(30):
        r = requests.get(f"https://api.vercel.com/v13/deployments/{dep_id}", headers=HEADERS, timeout=30)
        state = r.json().get("readyState")
        print(f"[{i+1}] State: {state}")
        if state == "READY":
            print(f"\nLive: https://{deploy_url}")
            return
        if state in ("ERROR", "CANCELED", "DELETED"):
            print(f"Deployment failed: {state}")
            return
        time.sleep(5)

if __name__ == "__main__":
    main()
