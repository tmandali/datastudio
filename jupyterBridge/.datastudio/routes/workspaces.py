import os
import sys
import shutil
import subprocess
import json
from fastapi import APIRouter
from config import WORKSPACES_DIR

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])

@router.get("")
async def list_workspaces():
    """List all available workspaces"""
    workspaces = []
    
    EXCLUDE_DIRS = {
        "__pycache__", ".venv", ".git", ".ipynb_checkpoints", 
        "node_modules", ".backend", "routes" # Added routes to exclude
    }

    if os.path.exists(WORKSPACES_DIR):
        for name in os.listdir(WORKSPACES_DIR):
            path = os.path.join(WORKSPACES_DIR, name)
            
            if not os.path.isdir(path):
                continue
            if name in EXCLUDE_DIRS or name.startswith("."):
                continue

            workspaces.append({
                "name": name,
                "path": path,
                "created_at": os.path.getctime(path)
            })
    return {"workspaces": workspaces}

@router.post("")
async def create_workspace(req: dict):
    """Create a new workspace with isolated environment"""
    name = req.get("name")
    if not name:
        return {"error": "Workspace name is required"}
    
    safe_name = "".join([c for c in name if c.isalnum() or c in ('-', '_')])
    if not safe_name:
         return {"error": "Invalid workspace name"}

    ws_path = os.path.join(WORKSPACES_DIR, safe_name)
    
    if os.path.exists(ws_path):
        return {"error": "Workspace already exists"}

    try:
        os.makedirs(ws_path)
        
        print(f"Creating venv for workspace: {safe_name}...")
        venv_path = os.path.join(ws_path, ".venv")
        subprocess.check_call([sys.executable, "-m", "venv", venv_path])
        
        print(f"Creating requirements.txt for {safe_name}...")
        req_file_path = os.path.join(ws_path, "requirements.txt")
        DEFAULT_REQS = ["duckdb", "pandas", "pyarrow", "rich"]
        with open(req_file_path, "w") as f:
            f.write("\n".join(DEFAULT_REQS) + "\n")

        print(f"Installing ipykernel in {safe_name}...")
        pip_cmd = os.path.join(venv_path, "bin", "pip")
        subprocess.check_call([pip_cmd, "install", "ipykernel", *DEFAULT_REQS])
        
        print(f"Registering kernel for {safe_name}...")
        python_cmd = os.path.join(venv_path, "bin", "python")
        kernel_name = f"ws_{safe_name}"
        display_name = f"Workspace: {safe_name}"
        
        subprocess.check_call([
            python_cmd, "-m", "ipykernel", "install",
            "--user",
            "--name", kernel_name,
            "--display-name", display_name
        ])
        
        return {
            "status": "success", 
            "workspace": {
                "name": safe_name,
                "path": ws_path,
                "kernel": kernel_name
            }
        }
    except Exception as e:
        if os.path.exists(ws_path):
            shutil.rmtree(ws_path)
        print(f"Error creating workspace: {e}")
        return {"error": str(e)}

@router.get("/{workspace}/packages")
async def get_workspace_packages(workspace: str):
    """Get installed packages and versions for a workspace"""
    venv_python = os.path.join(WORKSPACES_DIR, workspace, ".venv", "bin", "python")
    if not os.path.exists(venv_python):
        return {"error": "Workspace venv not found"}
        
    try:
        result = subprocess.run([venv_python, "-m", "pip", "list", "--format", "json"], capture_output=True, text=True)
        if result.returncode == 0:
            pkgs = json.loads(result.stdout)
            return {pkg["name"].lower(): pkg["version"] for pkg in pkgs}
        return {"error": "Could not list packages"}
    except Exception as e:
        return {"error": str(e)}

@router.delete("/{name}")
async def delete_workspace(name: str):
    """Delete a workspace and its files"""
    safe_name = "".join([c for c in name if c.isalnum() or c in ('-', '_')])
    ws_path = os.path.join(WORKSPACES_DIR, safe_name)
    
    if not os.path.exists(ws_path):
        return {"error": "Workspace not found"}
        
    try:
        shutil.rmtree(ws_path)
        try:
            subprocess.run(["jupyter", "kernelspec", "remove", f"ws_{safe_name}", "-y"], check=False)
        except: 
            pass
            
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}
