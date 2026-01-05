import requests
import json

try:
    # 1. List Workspaces
    print("--- Workspaces ---")
    r = requests.get("http://localhost:8000/api/workspaces")
    workspaces = r.json().get("workspaces", [])
    print(json.dumps(workspaces, indent=2))

    if not workspaces:
        print("No workspaces found.")
        exit()

    # 2. List Files for the first workspace
    first_ws = workspaces[0]
    ws_path = first_ws["path"] # Absolute path
    print(f"\n--- Files in {ws_path} ---")
    
    # Try with absolute path
    r = requests.get("http://localhost:8000/api/files", params={"path": ws_path})
    files = r.json().get("files", [])
    
    print(f"Count: {len(files)}")
    if files:
        print("First 3 files:")
        print(json.dumps(files[:3], indent=2))
    else:
        print("No files returned.")

    # Try with relative path just in case
    rel_path = f"workspaces/{first_ws['name']}"
    print(f"\n--- Files in relative path {rel_path} ---")
    r = requests.get("http://localhost:8000/api/files", params={"path": rel_path})
    files2 = r.json().get("files", [])
    print(f"Count: {len(files2)}")

except Exception as e:
    print(f"Error: {e}")
