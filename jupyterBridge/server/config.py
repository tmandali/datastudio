import os
import json
from dotenv import load_dotenv

# Get the directory of the current file (server)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR) # jupyterBridge

# Load .env
load_dotenv(os.path.join(BASE_DIR, ".env"))

JUPYTER_URL = os.getenv("JUPYTER_URL", "http://localhost:8888")
JUPYTER_TOKEN = os.getenv("JUPYTER_TOKEN", "your_token_here")
HEADERS = {"Authorization": f"Token {JUPYTER_TOKEN}"}

# Workspaces are now in ../workspaces
WORKSPACES_DIR = os.path.join(PROJECT_ROOT, "workspaces")

# requirement loading
try:
    req_path = os.path.join(BASE_DIR, "requirements.txt")
    with open(req_path, "r") as f:
        REQUIRED_PACKAGES = [line.strip() for line in f if line.strip()]
except Exception as e:
    REQUIRED_PACKAGES = ["duckdb", "pyarrow", "rich", "jinja2"]

def get_bootstrap_code():
    script_path = os.path.join(BASE_DIR, "kernel_bootstrap.py")
    try:
        with open(script_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        print(f"Error loading bootstrap script: {e}")
        return "# Error loading bootstrap script"

BOOTSTRAP_CODE = get_bootstrap_code()
