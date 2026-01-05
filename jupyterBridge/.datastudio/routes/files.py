import os
import shutil
import datetime
import json
from fastapi import APIRouter
from config import PROJECT_ROOT

router = APIRouter(prefix="/api/files", tags=["files"])

@router.get("")
async def list_files(path: str = ""):
    """Recursively list all files from local filesystem"""
    all_files = []
    clean_path = path.strip("/")
    target_path = os.path.normpath(os.path.join(PROJECT_ROOT, clean_path))
    
    if not os.path.exists(target_path):
        return {"files": []}
    
    EXCLUDE_DIRS = {".git", "__pycache__", ".venv", ".ipynb_checkpoints", "node_modules", ".backend"}
    
    try:
        for root, dirs, files in os.walk(target_path):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for file in files:
                if file.startswith(".") and file not in [".env", "requirements.txt"]:
                    continue
                
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, PROJECT_ROOT)
                
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
    except Exception as e:
        return {"error": str(e)}

    return {"files": all_files}

@router.get("/{path:path}")
async def get_file_content(path: str):
    """Get specific file content from local disk"""
    full_path = os.path.join(PROJECT_ROOT, path)
    if not os.path.exists(full_path):
        return {"error": "File not found"}
        
    try:
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        file_format = "text"
        if path.endswith(".ipynb"):
             file_format = "json"

        return {
            "name": os.path.basename(path),
            "path": path,
            "content": content,
            "format": file_format
        }
    except Exception as e:
        return {"error": str(e)}

@router.put("/{path:path}")
async def save_file_content(path: str, req: dict):
    """Save file content to local disk"""
    full_path = os.path.join(PROJECT_ROOT, path)
    try:
        content = req.get("content", "")
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        if isinstance(content, (dict, list)):
            content = json.dumps(content, indent=2)
            
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
        return {"status": "success", "path": path}
    except Exception as e:
        return {"error": str(e)}

@router.post("")
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
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
            
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

@router.delete("/{path:path}")
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

@router.patch("/{path:path}")
async def rename_file(path: str, req: dict):
    old_full_path = os.path.join(PROJECT_ROOT, path)
    new_rel_path = req.get("path")
    new_full_path = os.path.join(PROJECT_ROOT, new_rel_path)
    
    try:
        os.renames(old_full_path, new_full_path)
        return {"status": "success"} 
    except Exception as e:
        return {"error": str(e)}
