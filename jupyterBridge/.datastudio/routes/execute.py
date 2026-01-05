import os
import json
import uuid
import base64
import asyncio
import datetime
import requests
import jinja2
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from config import JUPYTER_URL, JUPYTER_TOKEN, HEADERS, WORKSPACES_DIR, BOOTSTRAP_CODE, get_bootstrap_code

router = APIRouter(tags=["execute"])

def create_jupyter_message(session_id, msg_type, content):
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

@router.websocket("/ws/execute")
async def execute_code(websocket: WebSocket, workspace: str = None):
    await websocket.accept()
    
    print(f"Connecting to Jupyter at {JUPYTER_URL}...")
    try:
        kernel_spec_name = "python3"
        if workspace:
             kernel_spec_name = f"ws_{workspace}"
             print(f"Requesting Workspace Kernel: {kernel_spec_name}")

        payload = {"name": kernel_spec_name}
        resp = requests.post(f"{JUPYTER_URL}/api/kernels", headers=HEADERS, json=payload, timeout=5)
        
        if resp.status_code != 201:
            await websocket.send_json({"type": "error", "text": f"Jupyter Error: {resp.status_code} - {resp.text}"})
            return
    except Exception as e:
        await websocket.send_json({"type": "error", "text": f"Failed to connect to Jupyter: {str(e)}"})
        return

    kernel = resp.json()
    kernel_id = kernel['id']
    ws_url = f"ws://{JUPYTER_URL.split('//')[1]}/api/kernels/{kernel_id}/channels?token={JUPYTER_TOKEN}"
    
    try:
        import websocket as j_ws_lib
        j_ws = j_ws_lib.create_connection(ws_url, header={"Origin": JUPYTER_URL})
        
        session_id = uuid.uuid4().hex
        
        # Workspace specific requirements
        ws_reqs = ["duckdb", "pandas", "pyarrow", "rich"]
        if workspace:
            ws_req_path = os.path.join(WORKSPACES_DIR, workspace, "requirements.txt")
            if os.path.exists(ws_req_path):
                try:
                    with open(ws_req_path, "r") as f:
                        ws_reqs = [line.strip() for line in f if line.strip() and not line.startswith("#")]
                except: pass

        session_link = f"{JUPYTER_URL}/lab?token={JUPYTER_TOKEN}"
        injected_bootstrap = get_bootstrap_code().replace("{{KERNEL_ID}}", kernel_id)\
                                          .replace("{{SESSION_ID}}", session_id)\
                                          .replace("{{JUPYTER_URL}}", JUPYTER_URL)\
                                          .replace("{{SESSION_LINK}}", session_link)\
                                          .replace("{{REQUIRED_PACKAGES}}", json.dumps(ws_reqs))
        
        init_msg = create_jupyter_message(session_id, "execute_request", {
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
                    break

        asyncio.create_task(listen_jupyter())
        await websocket.send_json({"type": "status", "execution_state": "ready"})

        while True:
            data = await websocket.receive_text()
            req = json.loads(data)
            raw_code = req.get("code", "")
            mode = req.get("mode")
            filename = req.get("filename")

            # Jinja Processing
            try:
                template_context = {
                    "user_id": os.getenv("USER_ID", os.getenv("USER", "system")),
                    "workspace": workspace,
                    "date": datetime.datetime.now().strftime("%Y-%m-%d"),
                    "env": dict(os.environ)
                }
                template = jinja2.Template(raw_code)
                final_code = template.render(template_context)
            except Exception:
                final_code = raw_code

            if mode == "sql" and final_code:
                final_code = f"execute_sql_query(\"\"\"{final_code}\"\"\")"
            elif mode == "system" and filename == "requirements.txt" and final_code:
                final_code = f"""
import sys
import subprocess
import os
import shutil
import site

try:
    for d in site.getsitepackages():
        if os.path.exists(d):
            for item in os.listdir(d):
                if item.startswith("~"):
                    item_path = os.path.join(d, item)
                    try:
                        if os.path.isdir(item_path): shutil.rmtree(item_path)
                        else: os.remove(item_path)
                    except: pass
except: pass

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
                final_code = f"""
import os
env_content = \"\"\"{final_code}\"\"\"
updated_vars = []
for line in env_content.split('\\n'):
    line = line.strip()
    if not line or line.startswith('#'): continue
    if '=' in line:
        key, value = line.split('=', 1)
        key, value = key.strip(), value.strip()
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        os.environ[key] = value
        updated_vars.append(key)
if updated_vars:
    print(f"Ortam değişkenleri güncellendi ({{len(updated_vars)}} adet)")
else:
    print("Değişken bulunamadı.")
"""

            if req.get("action") == "execute" and final_code:
                exec_msg = create_jupyter_message(session_id, "execute_request", {
                    "code": final_code, 
                    "silent": False,
                    "store_history": True,
                    "user_expressions": {},
                    "allow_stdin": False
                })
                try:
                    await asyncio.to_thread(j_ws.send, json.dumps(exec_msg))
                except Exception:
                    await websocket.send_json({"type": "error", "text": "Lost connection to Jupyter Kernel."})
                    break
            elif req.get("action") == "interrupt":
                try:
                    requests.post(f"{JUPYTER_URL}/api/kernels/{kernel_id}/interrupt", headers=HEADERS, timeout=2)
                except: pass

    except WebSocketDisconnect: pass
    finally:
        try: requests.delete(f"{JUPYTER_URL}/api/kernels/{kernel_id}", headers=HEADERS, timeout=2)
        except: pass
        try: j_ws.close()
        except: pass
