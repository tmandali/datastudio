
import os
import sys
import subprocess
import shutil

# .datastudio directory path (current dir)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
WORKSPACES_DIR = os.path.join(PROJECT_ROOT, "workspaces")

def fix_kernels():
    print(f"Scanning for workspaces in {WORKSPACES_DIR}...")
    
    if not os.path.exists(WORKSPACES_DIR):
        print(f"Workspaces directory not found: {WORKSPACES_DIR}")
        return

    # Iterate over all items in workspaces dir
    for name in os.listdir(WORKSPACES_DIR):
        workspace_path = os.path.join(WORKSPACES_DIR, name)
        
        # Skip if not a directory or is a hidden/system dir
        if not os.path.isdir(workspace_path) or name.startswith('.'):
            continue
            
        venv_path = os.path.join(workspace_path, ".venv")
        if not os.path.exists(venv_path):
            print(f"Skipping {name}: No .venv found")
            continue
            
        print(f"Fixing kernel for workspace: {name}")
        
        if sys.platform == "win32":
            python_cmd = os.path.join(venv_path, "Scripts", "python.exe")
        else:
            python_cmd = os.path.join(venv_path, "bin", "python")

        if not os.path.exists(python_cmd):
            # Try alternative locations just in case
            alts = [
                os.path.join(venv_path, "bin", "python"),
                os.path.join(venv_path, "Result", "python"),
                 os.path.join(venv_path, "Scripts", "python")
            ]
            found = False
            for alt in alts:
                if os.path.exists(alt):
                    python_cmd = alt
                    found = True
                    break
            
            if not found:
                 print(f"  Error: Python interpreter not found at {python_cmd}")
                 continue

        kernel_name = f"ws_{name}"
        display_name = f"Workspace: {name}"
        
        try:
            # Re-install kernelspec
            # This overwrites the existing spec with the new path
            cmd = [
                python_cmd, "-m", "ipykernel", "install",
                "--user",
                "--name", kernel_name,
                "--display-name", display_name
            ]
            subprocess.check_call(cmd)
            print(f"  Successfully updated kernel: {kernel_name}")
        except subprocess.CalledProcessError as e:
            print(f"  Failed to update kernel {kernel_name}: {e}")
        except Exception as e:
            print(f"  An error occurred: {e}")

if __name__ == "__main__":
    fix_kernels()
