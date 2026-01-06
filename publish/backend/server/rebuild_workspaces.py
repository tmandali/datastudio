import os
import sys
import subprocess
import shutil

# jupyterBridge/server
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# jupyterBridge
PROJECT_ROOT = os.path.dirname(BASE_DIR)
WORKSPACES_DIR = os.path.join(PROJECT_ROOT, "workspaces")

DEFAULT_REQS = ["duckdb", "pandas", "pyarrow", "rich", "ipykernel"]

def rebuild_workspaces():
    print(f"Scanning for workspaces in {WORKSPACES_DIR}...")
    
    if not os.path.exists(WORKSPACES_DIR):
        print(f"Workspaces directory not found: {WORKSPACES_DIR}")
        return

    for name in os.listdir(WORKSPACES_DIR):
        ws_path = os.path.join(WORKSPACES_DIR, name)
        
        if not os.path.isdir(ws_path) or name.startswith('.'):
            continue
            
        print(f"Rebuilding venv for workspace: {name}")
        
        venv_path = os.path.join(ws_path, ".venv")
        
        # 1. Remove broken venv
        if os.path.exists(venv_path):
            print(f"  Removing old venv at {venv_path}...")
            shutil.rmtree(venv_path)
            
        # 2. Create new venv
        print(f"  Creating new venv...")
        subprocess.check_call([sys.executable, "-m", "venv", venv_path])
        
        # 3. Determine paths
        bin_dir = "Scripts" if sys.platform == "win32" else "bin"
        pip_cmd = os.path.join(venv_path, bin_dir, "pip")
        python_cmd = os.path.join(venv_path, bin_dir, "python")
        
        # 4. Install requirements
        req_file = os.path.join(ws_path, "requirements.txt")
        if os.path.exists(req_file):
            print(f"  Installing from requirements.txt...")
            subprocess.check_call([pip_cmd, "install", "-r", req_file, "ipykernel"])
        else:
            print(f"  Installing default requirements...")
            subprocess.check_call([pip_cmd, "install", *DEFAULT_REQS])

        # 5. Register kernel
        kernel_name = f"ws_{name}"
        display_name = f"Workspace: {name}"
        print(f"  Registering kernel {kernel_name}...")
        
        subprocess.check_call([
            python_cmd, "-m", "ipykernel", "install",
            "--user",
            "--name", kernel_name,
            "--display-name", display_name
        ])
        
        print(f"  Successfully rebuilt {name}")

if __name__ == "__main__":
    rebuild_workspaces()
