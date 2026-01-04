# Bu dosya Backend (FastAPI) tarafında çalışmalıdır.
# Kurulum: pip install fastapi uvicorn httpx websocket-client requests duckdb pandas pyarrow python-dotenv
import json
import uuid
import base64
import requests
import asyncio
from dotenv import load_dotenv
import os
import sys
import shutil
import datetime
import jinja2

# Get the directory of the current file
# Get the directory of the current file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# .env is now in the same directory as main.py (.datastudio)
load_dotenv(os.path.join(BASE_DIR, ".env"))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import pty
import tty
import termios
import select
import struct
import fcntl
import signal
import subprocess

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    print("Registered Routes:")
    for route in app.routes:
        print(f" - {route.path}")

load_dotenv()

JUPYTER_URL = os.getenv("JUPYTER_URL", "http://localhost:8888")
JUPYTER_TOKEN = os.getenv("JUPYTER_TOKEN", "your_token_here") 
HEADERS = {"Authorization": f"Token {JUPYTER_TOKEN}"}

# Workspaces are now siblings to this file in .datastudio
WORKSPACES_DIR = BASE_DIR

@app.get("/api/workspaces")
async def list_workspaces():
    """List all available workspaces"""
    workspaces = []
    
    # Dirs to exclude from workspace listing
    EXCLUDE_DIRS = {
        "__pycache__", ".venv", ".git", ".ipynb_checkpoints", 
        "node_modules", ".backend"
    }

    if os.path.exists(WORKSPACES_DIR):
        for name in os.listdir(WORKSPACES_DIR):
            path = os.path.join(WORKSPACES_DIR, name)
            
            # Filter out files (like main.py) and excluded dirs
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

class CreateWorkspaceRequest(json.JSONDecoder): # Just for typing hints implies dict
    pass

@app.post("/api/workspaces")
async def create_workspace(req: dict):
    """Create a new workspace with isolated environment"""
    name = req.get("name")
    if not name:
        return {"error": "Workspace name is required"}
    
    # Sanitize name
    safe_name = "".join([c for c in name if c.isalnum() or c in ('-', '_')])
    if not safe_name:
         return {"error": "Invalid workspace name"}

    ws_path = os.path.join(WORKSPACES_DIR, safe_name)
    
    if os.path.exists(ws_path):
        return {"error": "Workspace already exists"}

    try:
        # 1. Create Directory
        os.makedirs(ws_path)
        
        # 2. Create Virtual Environment
        print(f"Creating venv for workspace: {safe_name}...")
        venv_path = os.path.join(ws_path, ".venv")
        subprocess.check_call([sys.executable, "-m", "venv", venv_path])
        
        # 3. Create requirements.txt
        print(f"Creating requirements.txt for {safe_name}...")
        req_file_path = os.path.join(ws_path, "requirements.txt")
        DEFAULT_REQS = ["duckdb", "pandas", "pyarrow", "rich"]
        with open(req_file_path, "w") as f:
            f.write("\n".join(DEFAULT_REQS) + "\n")

        # 4. Install ipykernel and base reqs
        print(f"Installing ipykernel in {safe_name}...")
        pip_cmd = os.path.join(venv_path, "bin", "pip")
        # Ensure we upgrade pip first to avoid issues? Optional.
        subprocess.check_call([pip_cmd, "install", "ipykernel", *DEFAULT_REQS])
        
        # 4. Register Kernel
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
        # Cleanup on failure
        if os.path.exists(ws_path):
            shutil.rmtree(ws_path)
        print(f"Error creating workspace: {e}")
        return {"error": str(e)}

@app.get("/api/workspaces/{workspace}/packages")
async def get_workspace_packages(workspace: str):
    """Get installed packages and versions for a workspace"""
    venv_python = os.path.join(WORKSPACES_DIR, workspace, ".venv", "bin", "python")
    if not os.path.exists(venv_python):
        return {"error": "Workspace venv not found"}
        
    try:
        result = subprocess.run([venv_python, "-m", "pip", "list", "--format", "json"], capture_output=True, text=True)
        if result.returncode == 0:
            pkgs = json.loads(result.stdout)
            # Return as a simple dict for easy lookup
            return {pkg["name"].lower(): pkg["version"] for pkg in pkgs}
        return {"error": "Could not list packages"}
    except Exception as e:
        return {"error": str(e)}

@app.delete("/api/workspaces/{name}")
async def delete_workspace(name: str):
    """Delete a workspace and its files"""
    safe_name = "".join([c for c in name if c.isalnum() or c in ('-', '_')])
    ws_path = os.path.join(WORKSPACES_DIR, safe_name)
    
    if not os.path.exists(ws_path):
        return {"error": "Workspace not found"}
        
    try:
        # Remove directory
        shutil.rmtree(ws_path)
        
        # Optional: Unregister kernel
        # jupyter kernelspec remove ws_{safe_name} -y
        # We try to remove it, but don't fail if we can't
        try:
            subprocess.run(["jupyter", "kernelspec", "remove", f"ws_{safe_name}", "-y"], check=False)
        except: 
            pass
            
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}


# File System Base (Jupyter Root)
# Assuming main.py is in .datastudio, parent is the project root (jupyterBridge)
PROJECT_ROOT = os.path.dirname(BASE_DIR)

@app.get("/api/files")
async def list_files(path: str = ""):
    """Recursively list all files from local filesystem (bypassing Jupyter API hiding)"""
    all_files = []
    
    # Resolve target directory
    clean_path = path.strip("/")
    target_path = os.path.normpath(os.path.join(PROJECT_ROOT, clean_path))
    
    print(f">>> LIST FILES: path='{path}', resolved target_path='{target_path}'")
    
    if not os.path.exists(target_path):
        print(f"    ERROR: Path not found: {target_path}")
        return {"files": []}
    
    # Exclude patterns
    EXCLUDE_DIRS = {".git", "__pycache__", ".venv", ".ipynb_checkpoints", "node_modules", ".backend"}
    
    try:
        for root, dirs, files in os.walk(target_path):
            # Filtering
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            
            for file in files:
                # Don't hide the files we explicitly want to see
                if file.startswith(".") and file not in [".env", "requirements.txt"]:
                    continue
                
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, PROJECT_ROOT)
                
                # Determine language
                lang = "python"
                if file == ".env" or file == "requirements.txt": lang = "system"
                elif file.endswith(".sql"): lang = "sql"
                elif file.endswith(".ipynb"): lang = "jupyter"
                elif file.endswith(".md"): lang = "markdown"
                elif file.endswith(".json"): lang = "json"
                elif file.endswith(".txt"): lang = "markdown"
                
                try:
                    stat = os.stat(full_path)
                    size_kb = round(stat.st_size / 1024, 1)
                    mtime = datetime.datetime.fromtimestamp(stat.st_mtime).isoformat()
                except:
                    size_kb = 0
                    mtime = ""
                
                all_files.append({
                    "id": rel_path,
                    "name": file,
                    "path": rel_path,
                    "language": lang,
                    "updatedAt": mtime,
                    "size": f"{size_kb}kb",
                    "content": ""
                })
        print(f"    FOUND: {len(all_files)} files")
    except Exception as e:
        print(f"    CRITICAL ERROR listing files: {e}")
        return {"error": str(e)}

    return {"files": all_files}

@app.get("/api/files/{path:path}")
async def get_file_content(path: str):
    """Get specific file content from local disk"""
    full_path = os.path.join(PROJECT_ROOT, path)
    
    if not os.path.exists(full_path):
        return {"error": "File not found"}
        
    try:
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        # Format normalization for notebook
        file_format = "text"
        if path.endswith(".ipynb"):
             file_format = "json"
             # No need to parse/stringify if we send it as text but frontend expects?
             # Frontend expects stringified JSON for text editor view?
             # Current frontend logic just puts it in monaco.
             pass

        return {
            "name": os.path.basename(path),
            "path": path,
            "content": content,
            "format": file_format
        }
    except Exception as e:
        return {"error": str(e)}

@app.put("/api/files/{path:path}")
async def save_file_content(path: str, req: dict):
    """Save file content to local disk"""
    full_path = os.path.join(PROJECT_ROOT, path)
    
    try:
        content = req.get("content", "")
        # Create dirs if needed?
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        # If notebook and content is dict, convert to str
        if isinstance(content, dict) or (isinstance(content, list)):
            content = json.dumps(content, indent=2)
            
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
            
        return {"status": "success", "path": path}
    except Exception as e:
        print(f"Error saving {path}: {e}")
        return {"error": str(e)}

@app.post("/api/files")
async def create_file(req: dict):
    """Create a new file locally"""
    try:
        name = req.get("name")
        rel_path = req.get("path", "")
        content = req.get("content", "")
        
        dir_path = os.path.join(PROJECT_ROOT, rel_path.strip("/"))
        if not os.path.exists(dir_path):
            os.makedirs(dir_path)
            
        full_path = os.path.join(dir_path, name)
        
        # Avoid overwrite check for now or basic?
        # Just write it
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
            
        # Return file object
        lang = req.get("language", "text")
        stat = os.stat(full_path)
        
        return {
            "status": "success",
            "file": {
                "id": os.path.relpath(full_path, PROJECT_ROOT),
                "name": name,
                "path": os.path.relpath(full_path, PROJECT_ROOT),
                "language": lang,
                "updatedAt": datetime.datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "size": "0kb",
                "content": content
            }
        }
    except Exception as e:
        return {"error": str(e)}

@app.delete("/api/files/{path:path}")
async def delete_file(path: str):
    full_path = os.path.join(PROJECT_ROOT, path)
    try:
        if os.path.exists(full_path):
            if os.path.isdir(full_path):
                shutil.rmtree(full_path)
            else:
                os.remove(full_path)
        return {"status": "success"}
    except Exception as e:
         return {"error": str(e)}

@app.patch("/api/files/{path:path}")
async def rename_file(path: str, req: dict):
    old_full_path = os.path.join(PROJECT_ROOT, path)
    new_rel_path = req.get("path")
    new_full_path = os.path.join(PROJECT_ROOT, new_rel_path)
    
    try:
        os.renames(old_full_path, new_full_path)
        return {"status": "success"} 
    except Exception as e:
        return {"error": str(e)}


# --- REQUIREMENT LOADING ---
try:
    req_path = os.path.join(os.path.dirname(__file__), "requirements.txt")
    with open(req_path, "r") as f:
        REQUIRED_PACKAGES = [line.strip() for line in f if line.strip()]
except Exception as e:
    print(f"Warning: Could not read requirements.txt: {e}")
    REQUIRED_PACKAGES = ["duckdb", "pyarrow", "rich", "jinja2"]

# --- DUCKDB ENTEGRELİ BOOTSTRAP ---
# --- KERNEL SCRIPTS LOADER ---
def get_bootstrap_code():
    script_path = os.path.join(os.path.dirname(__file__), "scripts", "kernel_bootstrap.py")
    try:
        with open(script_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        print(f"Error loading bootstrap script: {e}")
        return "# Error loading bootstrap script"

BOOTSTRAP_CODE = get_bootstrap_code()

@app.websocket("/ws/execute")
async def execute_code(websocket: WebSocket, workspace: str = None):
    await websocket.accept()
    
    print(f"Connecting to Jupyter at {JUPYTER_URL}...")
    try:
        # Determine kernel name
        kernel_spec_name = "python3" # Default
        if workspace:
             kernel_spec_name = f"ws_{workspace}"
             print(f"Requesting Workspace Kernel: {kernel_spec_name}")

        payload = {"name": kernel_spec_name}
        
        resp = requests.post(f"{JUPYTER_URL}/api/kernels", headers=HEADERS, json=payload, timeout=5)
        print(f"Kernel creation response: {resp.status_code}")
        if resp.status_code != 201:
            print(f"Error creating kernel: {resp.text}")
            await websocket.send_json({"type": "error", "text": f"Jupyter Error: {resp.status_code} - {resp.text}"})
            return
    except requests.exceptions.ConnectionError:
        error_msg = f"Jupyter server is not running or unreachable at {JUPYTER_URL}. Please start Jupyter Lab/Notebook first."
        print(f"ERROR: {error_msg}")
        await websocket.send_json({"type": "error", "text": error_msg})
        return
    except Exception as e:
        error_msg = f"Failed to connect to Jupyter: {str(e)}"
        print(f"ERROR: {error_msg}")
        await websocket.send_json({"type": "error", "text": error_msg})
        return

    kernel = resp.json()
    kernel_id = kernel['id']
    print(f"Kernel ID: {kernel_id}")
    ws_url = f"ws://{JUPYTER_URL.split('//')[1]}/api/kernels/{kernel_id}/channels?token={JUPYTER_TOKEN}"
    print(f"Jupyter WebSocket URL: {ws_url}")
    
    try:
        import websocket as j_ws_lib
        try:
            j_ws = j_ws_lib.create_connection(ws_url, header={"Origin": JUPYTER_URL})
            print("Connected to Jupyter WebSocket")
        except Exception as e:
            print(f"Failed to connect to Jupyter WebSocket: {e}")
            await websocket.send_json({"type": "error", "text": f"Jupyter WebSocket Error: {str(e)}"})
            return

        # Jupyter Protocol Compliance
        session_id = uuid.uuid4().hex
        
        def create_jupyter_message(msg_type, content):
            return {
                "header": {
                    "msg_id": uuid.uuid4().hex,
                    "username": "datastudio_bridge",
                    "session": session_id,
                    "msg_type": msg_type,
                    "version": "5.3",
                    "date": datetime.datetime.now().isoformat()
                },
                "parent_header": {},
                "metadata": {},
                "content": content
            }

        import datetime # Ensure this is imported at top level typically, but adding here for scope safety if needed or move to top
        
        # Inject real kernel info and PER-WORKSPACE requirements into bootstrap code
        session_link = f"{JUPYTER_URL}/lab?token={JUPYTER_TOKEN}"
        
        # Load workspace specific requirements
        ws_reqs = ["duckdb", "pandas", "pyarrow", "rich"] # Fallback
        if workspace:
            ws_req_path = os.path.join(WORKSPACES_DIR, workspace, "requirements.txt")
            if os.path.exists(ws_req_path):
                try:
                    with open(ws_req_path, "r") as f:
                        ws_reqs = [line.strip() for line in f if line.strip() and not line.startswith("#")]
                except: pass

        injected_bootstrap = get_bootstrap_code().replace("{{KERNEL_ID}}", kernel_id)\
                                          .replace("{{SESSION_ID}}", session_id)\
                                          .replace("{{JUPYTER_URL}}", JUPYTER_URL)\
                                          .replace("{{SESSION_LINK}}", session_link)\
                                          .replace("{{REQUIRED_PACKAGES}}", json.dumps(ws_reqs))
        
        init_msg = create_jupyter_message("execute_request", {
            "code": injected_bootstrap, 
            "silent": False,
            "store_history": False,
            "user_expressions": {},
            "allow_stdin": False
        })
        j_ws.send(json.dumps(init_msg))

        async def listen_jupyter():
            while True:
                try:
                    # Blocking call offloaded to thread
                    raw = await asyncio.to_thread(j_ws.recv)
 
                    msg = json.loads(raw)
                    msg_type = msg.get("msg_type")
                    content = msg.get("content")
                    
                    if msg_type == "stream":
                        out_type = "stdout"
                        if content.get("name") == "stderr":
                            out_type = "error"
                        await websocket.send_json({"type": out_type, "text": content['text']})
                    elif msg_type == "error":
                        await websocket.send_json({"type": "error", "text": "\\n".join(content.get('traceback', []))})
                    elif msg_type in ["display_data", "execute_result"]:
                        bundle = content.get("data", {})
                        if "application/vnd.apache.arrow.stream" in bundle:
                            raw_arrow = bundle["application/vnd.apache.arrow.stream"]
                            binary_data = base64.b64decode(raw_arrow) if isinstance(raw_arrow, str) else raw_arrow
                            await websocket.send_bytes(binary_data)
                    
                    if msg_type == "status" and content.get("execution_state") == "idle":
                        await websocket.send_json({"type": "done"})
                except Exception as e:
                    print(f"Listen loop error: {e}")
                    break
                # await asyncio.sleep(0.01) # No longer needed with to_thread

        asyncio.create_task(listen_jupyter())
        
        # Notify frontend that the kernel is fully ready
        await websocket.send_json({"type": "status", "execution_state": "ready"})

        while True:
            data = await websocket.receive_text()
            req = json.loads(data)
            
            # Eğer SQL modu aktifse, kodu Python wrapper'a sar
            raw_code = req.get("code", "")
            mode = req.get("mode")
            filename = req.get("filename")

            # --- JINJA TEMPLATE PROCESSING ---
            # Pre-render the code with Jinja2 before sending to kernel
            try:
                # Build context for template
                # user_id can come from .env or default 'system'
                template_context = {
                    "user_id": os.getenv("USER_ID", os.getenv("USER", "system")),
                    "workspace": workspace,
                    "date": datetime.datetime.now().strftime("%Y-%m-%d"),
                    "env": dict(os.environ)
                }
                
                # Render the template
                template = jinja2.Template(raw_code)
                final_code = template.render(template_context)
            except Exception as te:
                # If rendering fails (e.g. syntax error in template), fall back to raw code but notify
                print(f"Jinja template error: {te}")
                final_code = raw_code

            if mode == "sql" and final_code:
                final_code = f"execute_sql_query(\"\"\"{final_code}\"\"\")"
            elif mode == "system" and filename == "requirements.txt" and final_code:
                # Wrap requirements in a pip install script with cleanup
                final_code = f"""
import sys
import subprocess
import os
import shutil
import site

# Bozuk paket kalıntılarını (~ ile başlayanlar) temizle
try:
    for d in site.getsitepackages():
        if os.path.exists(d):
            for item in os.listdir(d):
                if item.startswith("~"):
                    item_path = os.path.join(d, item)
                    try:
                        if os.path.isdir(item_path): shutil.rmtree(item_path)
                        else: os.remove(item_path)
                        print(f"Gereksiz kalıntı temizlendi: {{item}}")
                    except: pass
except: pass

req_file = "{filename}"
packages = [line.strip() for line in \"\"\"{final_code}\"\"\".split('\\n') if line.strip() and not line.startswith('#')]
if packages:
    print(f"Paketler yükleniyor: {{packages}}")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", *packages])
        print("\\n[SUCCESS] Tüm paketler başarıyla yüklendi.")
    except Exception as e:
        print(f"\\n[ERROR] Yükleme sırasında hata oluştu: {{e}}")
else:
    print("Yüklenecek paket bulunamadı.")
"""
            elif mode == "system" and filename == ".env" and final_code:
                # Wrap .env in a parser script
                final_code = f"""
import os
import io

env_content = \"\"\"{final_code}\"\"\"
updated_vars = []

for line in env_content.split('\\n'):
    line = line.strip()
    if not line or line.startswith('#'):
        continue
    
    if '=' in line:
        key, value = line.split('=', 1)
        key = key.strip()
        value = value.strip()
        
        # Strip quotes if present
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        
        os.environ[key] = value
        updated_vars.append(key)

if updated_vars:
    print(f"Ortam değişkenleri güncellendi ({{len(updated_vars)}} adet):")
    for var in updated_vars:
        print(f"  [SET] {{var}}")
    print("\\n[SUCCESS] Tüm değişkenler sisteme yüklendi.")
else:
    print("Yüklenecek ortam değişkeni bulunamadı.")
"""

            if req.get("action") == "execute" and final_code:
                exec_msg = create_jupyter_message("execute_request", {
                    "code": final_code, 
                    "silent": False,
                    "store_history": True,
                    "user_expressions": {},
                    "allow_stdin": False
                })
                try:
                    await asyncio.to_thread(j_ws.send, json.dumps(exec_msg))
                except Exception as e:
                    print(f"Error sending to Jupyter: {e}")
                    await websocket.send_json({"type": "error", "text": "Lost connection to Jupyter Kernel."})
                    break # Stop handling client messages if Jupyter connection is lost
            elif req.get("action") == "interrupt":
                try:
                    requests.post(f"{JUPYTER_URL}/api/kernels/{kernel_id}/interrupt", headers=HEADERS, timeout=2)
                except: pass

    except WebSocketDisconnect: pass
    finally:
        try:
            requests.delete(f"{JUPYTER_URL}/api/kernels/{kernel_id}", headers=HEADERS, timeout=2)
        except: pass
        try: j_ws.close()
        except: pass

@app.websocket("/ws/terminal")
async def system_terminal(websocket: WebSocket):
    await websocket.accept()
    print("Terminal connection accepted (Bridged to Jupyter)")

    terminal_name = None
    j_ws = None

    try:
        # 1. Create Terminal on Jupyter
        try:
            print(f"Creating terminal at {JUPYTER_URL}/api/terminals...")
            resp = requests.post(f"{JUPYTER_URL}/api/terminals", headers=HEADERS, timeout=5)
            if resp.status_code != 200:
                print(f"Error creating terminal: {resp.text}")
                await websocket.send_text(f"Error creating terminal: {resp.status_code} {resp.text}\r\n")
                await websocket.close()
                return
            
            term_info = resp.json()
            terminal_name = term_info["name"]
            print(f"Terminal created: {terminal_name}")
        except Exception as e:
            await websocket.send_text(f"Error creating Jupyter terminal: {e}\r\n")
            await websocket.close()
            return

        # 2. Connect to Jupyter Terminal WebSocket
        ws_url = f"ws://{JUPYTER_URL.split('//')[1]}/terminals/websocket/{terminal_name}?token={JUPYTER_TOKEN}"
        print(f"Connecting to Jupyter Terminal WS: {ws_url}")

        import websocket as j_ws_lib
        try:
            j_ws = j_ws_lib.create_connection(ws_url, header={"Origin": JUPYTER_URL})
        except Exception as e:
             await websocket.send_text(f"Error connecting to Jupyter terminal socket: {e}\r\n")
             await websocket.close()
             return

        # 3. Proxy Loops
        
        # Jupyter -> Browser
        async def listen_jupyter():
            while True:
                try:
                    # Blocking receive from Jupyter
                    data = await asyncio.to_thread(j_ws.recv)
                    # Jupyter terminal sends raw text/json list sometimes? 
                    # Usually sends a list like ["stdout", "content"] or simply raw string for older versions?
                    # Modern JupyterLab sends: ["stdout", "decoded_text"]
                    
                    if isinstance(data, str):
                        try:
                            msg_list = json.loads(data)
                            if isinstance(msg_list, list) and len(msg_list) >= 2:
                                # msg_list[0] is usually 'stdout', 'stdin', 'setup'
                                # We just forward the content part as raw bytes/text to xterm.js
                                if msg_list[0] == 'stdout':
                                    content = msg_list[1]
                                    await websocket.send_text(content)
                        except json.JSONDecodeError:
                            # If not json, assume raw text
                             await websocket.send_text(data)

                except Exception as e:
                    print(f"Jupyter Terminal Listen Error: {e}")
                    break
            
            try: await websocket.close()
            except: pass

        listener = asyncio.create_task(listen_jupyter())

        # Browser -> Jupyter
        while True:
            try:
                text = await websocket.receive_text()
                try:
                    msg = json.loads(text)
                    if msg.get('type') == 'input':
                        data = msg.get('data')
                        if data:
                            # Send to Jupyter [type, content]
                            j_msg = json.dumps(['stdin', data])
                            await asyncio.to_thread(j_ws.send, j_msg)
                            
                    elif msg.get('type') == 'resize':
                        cols = msg.get('cols')
                        rows = msg.get('rows')
                        if cols and rows:
                            j_msg = json.dumps(['setup', {'rows': rows, 'cols': cols}])
                            await asyncio.to_thread(j_ws.send, j_msg)
                            # Also often needs separate REST call for some versions
                            try:
                                requests.patch(f"{JUPYTER_URL}/api/terminals/{terminal_name}/size", 
                                             headers=HEADERS, 
                                             json={"rows": rows, "cols": cols}, timeout=1)
                            except: pass

                except json.JSONDecodeError:
                    pass
            except WebSocketDisconnect:
                print("Client disconnected")
                break
        
        # Cancel listener if main loop breaks
        listener.cancel()

    except Exception as e:
        print(f"Terminal Proxy Error: {e}")
    finally:
        # Cleanup
        print("Cleaning up Terminal...")
        if terminal_name:
            try:
                requests.delete(f"{JUPYTER_URL}/api/terminals/{terminal_name}", headers=HEADERS, timeout=2)
            except: pass
        if j_ws:
            try: j_ws.close()
            except: pass
