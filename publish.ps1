$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$publishDir = Join-Path $root "publish"

Write-Host "Starting Publish Process..." -ForegroundColor Green

# 1. Clean Publish Directory
if (Test-Path $publishDir) {
    Write-Host "Cleaning existing publish directory..." -ForegroundColor Cyan
    Remove-Item -Path $publishDir -Recurse -Force
}
New-Item -Path $publishDir -ItemType Directory | Out-Null

# 2. Build UI
Write-Host "Building UI (Next.js)..." -ForegroundColor Cyan
Push-Location "$root\ui"
try {
    # Check if node_modules exists, valid check for ensuring we can build
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing dependencies..." -ForegroundColor Yellow
        npm install
    }
    
    # Run Build
    # Run Build
    # Force npm.cmd for Windows environment
    $npmCommand = "npm.cmd" 
    $buildProcess = Start-Process -FilePath $npmCommand -ArgumentList "run", "build" -Wait -PassThru -NoNewWindow
    if ($buildProcess.ExitCode -ne 0) {
        throw "UI Build failed with exit code $($buildProcess.ExitCode)"
    }
}
finally {
    Pop-Location
}

# 3. Publish UI Files
Write-Host "Copying UI Artifacts..." -ForegroundColor Cyan
$uiPublishDir = Join-Path $publishDir "ui"
New-Item -Path $uiPublishDir -ItemType Directory | Out-Null

# Check if standalone exists (it should if next.config.ts has output: 'standalone')
$standalonePath = "$root\ui\.next\standalone"
if (Test-Path $standalonePath) {
    Write-Host "Detected Standalone Build. Copying..." -ForegroundColor Gray
    Copy-Item -Path "$standalonePath\*" -Destination $uiPublishDir -Recurse -Force
    
    # Copy Static Assets for Standalone
    # .next/static -> .next/static
    $destStatic = Join-Path $uiPublishDir ".next\static"
    New-Item -Path (Join-Path $uiPublishDir ".next") -ItemType Directory -Force | Out-Null
    Copy-Item -Path "$root\ui\.next\static" -Destination $destStatic -Recurse -Force
    
    # public -> public
    $destPublic = Join-Path $uiPublishDir "public"
    Copy-Item -Path "$root\ui\public" -Destination $destPublic -Recurse -Force
}
else {
    Write-Warning "Standalone build not found. Copying standard .next folder. (Add output: 'standalone' to next.config.ts for better optimization)"
    Copy-Item -Path "$root\ui\.next" -Destination $uiPublishDir -Recurse -Force
    Copy-Item -Path "$root\ui\package.json" -Destination $uiPublishDir -Force
    Copy-Item -Path "$root\ui\public" -Destination "$uiPublishDir\public" -Recurse -Force
    # Note: Traditional build requires node_modules which is huge, ignoring here for 'publish' unless requested.
    # We strongly rely on standalone being enabled.
}

# 4. Copy Backend
Write-Host "Copying Backend (JupyterBridge)..." -ForegroundColor Cyan
$backendDir = Join-Path $root "jupyterBridge"
$backendPublishDir = Join-Path $publishDir "backend"
New-Item -Path $backendPublishDir -ItemType Directory | Out-Null

Copy-Item -Path "$backendDir\*" -Destination $backendPublishDir -Recurse -Force 

# Cleanup Backend (remove venv, pycache)
Get-ChildItem -Path $backendPublishDir -Recurse -Include "__pycache__", "*.pyc", "venv", ".git", ".env" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# 5. Create a convenience starter script in publish folder
$startScriptContent = @"
@echo off
set "PUBLISH_ROOT=%~dp0"
set "UI_DIR=%PUBLISH_ROOT%ui"
set "BACKEND_DIR=%PUBLISH_ROOT%backend\server"

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
start "DataStudio Jupyter" /d "%BACKEND_DIR%" cmd /k "call .venv\Scripts\activate && python -m jupyter lab --no-browser --port 8888 --NotebookApp.token='your_token_here' --NotebookApp.allow_origin='*' --ServerApp.ip='0.0.0.0' --ServerApp.allow_remote_access=True"

:: 2. Start API Server
echo [2/3] Starting Backend API...
start "DataStudio Backend" /d "%BACKEND_DIR%" cmd /k "call .venv\Scripts\activate && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

:: 3. Start UI
echo [3/3] Starting UI...
cd /d "%UI_DIR%"
echo Starting Next.js Server...
node server.js

pause
"@
Set-Content -Path "$publishDir\start.bat" -Value $startScriptContent

Write-Host "Publish Completed Successfully!" -ForegroundColor Green
Write-Host "Output located at: $publishDir" -ForegroundColor Green
Write-Host "Use 'start.bat' in the publish directory to launch the application." -ForegroundColor Gray
