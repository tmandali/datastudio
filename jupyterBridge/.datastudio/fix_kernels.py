
import os
import sys
import subprocess

# .datastudio directory path (current dir)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def fix_kernels():
    print(f"Scanning for workspaces in {BASE_DIR}...")
    
    # Iterate over all items in .datastudio
    for name in os.listdir(BASE_DIR):
        workspace_path = os.path.join(BASE_DIR, name)
        
        # Skip if not a directory or is a hidden/system dir
        if not os.path.isdir(workspace_path) or name.startswith('.'):
            continue
            
        venv_path = os.path.join(workspace_path, ".venv")
        if not os.path.exists(venv_path):
            print(f"Skipping {name}: No .venv found")
            continue
            
        print(f"Fixing kernel for workspace: {name}")
        
        # Path to python in the workspace's venv
        python_cmd = os.path.join(venv_path, "bin", "python")
        if not os.path.exists(python_cmd):
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
