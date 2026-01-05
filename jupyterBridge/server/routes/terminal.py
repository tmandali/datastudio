import json
import asyncio
import requests
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from config import JUPYTER_URL, JUPYTER_TOKEN, HEADERS

router = APIRouter(tags=["terminal"])

@router.websocket("/ws/terminal")
async def system_terminal(websocket: WebSocket):
    await websocket.accept()
    print("Terminal connection accepted (Bridged to Jupyter)")

    terminal_name = None
    j_ws = None

    try:
        try:
            resp = requests.post(f"{JUPYTER_URL}/api/terminals", headers=HEADERS, timeout=5)
            if resp.status_code != 200:
                await websocket.send_text(f"Error creating terminal: {resp.status_code} {resp.text}\r\n")
                await websocket.close()
                return
            
            term_info = resp.json()
            terminal_name = term_info["name"]
        except Exception as e:
            await websocket.send_text(f"Error creating Jupyter terminal: {e}\r\n")
            await websocket.close()
            return

        ws_url = f"ws://{JUPYTER_URL.split('//')[1]}/terminals/websocket/{terminal_name}?token={JUPYTER_TOKEN}"
        
        import websocket as j_ws_lib
        try:
            j_ws = j_ws_lib.create_connection(ws_url, header={"Origin": JUPYTER_URL})
        except Exception as e:
             await websocket.send_text(f"Error connecting to Jupyter terminal socket: {e}\r\n")
             await websocket.close()
             return

        async def listen_jupyter():
            while True:
                try:
                    data = await asyncio.to_thread(j_ws.recv)
                    if isinstance(data, str):
                        try:
                            msg_list = json.loads(data)
                            if isinstance(msg_list, list) and len(msg_list) >= 2:
                                if msg_list[0] == 'stdout':
                                    content = msg_list[1]
                                    await websocket.send_text(content)
                        except json.JSONDecodeError:
                             await websocket.send_text(data)
                except Exception:
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
                            j_msg = json.dumps(['stdin', data])
                            await asyncio.to_thread(j_ws.send, j_msg)
                            
                    elif msg.get('type') == 'resize':
                        cols = msg.get('cols')
                        rows = msg.get('rows')
                        if cols and rows:
                            j_msg = json.dumps(['setup', {'rows': rows, 'cols': cols}])
                            await asyncio.to_thread(j_ws.send, j_msg)
                            try:
                                requests.patch(f"{JUPYTER_URL}/api/terminals/{terminal_name}/size", 
                                             headers=HEADERS, json={"rows": rows, "cols": cols}, timeout=1)
                            except: pass
                except json.JSONDecodeError: pass
            except WebSocketDisconnect: break
        
        listener.cancel()
    except Exception as e:
        print(f"Terminal Proxy Error: {e}")
    finally:
        if terminal_name:
            try: requests.delete(f"{JUPYTER_URL}/api/terminals/{terminal_name}", headers=HEADERS, timeout=2)
            except: pass
        if j_ws:
            try: j_ws.close()
            except: pass
