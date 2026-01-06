@echo off
set "PUBLISH_ROOT=%~dp0"
set "UI_DIR=%PUBLISH_ROOT%ui"
set "BACKEND_DIR=%PUBLISH_ROOT%backend\server"
set "JUPYTER_TOKEN=datastudio"

echo === Starting DataStudio Production ===

:: 0. Check and Setup Python Environment
if not exist "%BACKEND_DIR%\.venv" (
    echo [0/3] Setting up Python Environment...
    cd /d "%BACKEND_DIR%"
    python -m venv .venv
    call .venv\Scripts\activate
    echo Installing dependencies...
    pip install -r requirements.txt
    pip install jupyterlab uvicorn
) else (
   echo [0/3] Using existing Python Environment...
)

:: 1. Start Jupyter
echo [1/3] Starting Jupyter Lab...
start "DataStudio Jupyter" /d "%BACKEND_DIR%" cmd /k "call start_jupyter.bat"

:: 2. Start API Server
echo [2/3] Starting Backend API...
start "DataStudio Backend" /d "%BACKEND_DIR%" cmd /k "call .venv\Scripts\activate && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

:: 3. Start UI
echo [3/3] Starting UI...
cd /d "%UI_DIR%"
echo Starting Next.js Server...
node server.js

pause
