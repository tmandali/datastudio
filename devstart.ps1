# Türkçe karakter sorununu çözmek için encoding ayarını zorla
$OutputEncoding = [console]::InputEncoding = [console]::OutputEncoding = New-Object System.Text.UTF8Encoding

# Proxy ve Encoding Ayarlari
$env:NO_PROXY = "localhost,127.0.0.1,::1"
$env:no_proxy = "localhost,127.0.0.1,::1"

# Mevcut konumu al
$RootPath = Get-Location

Write-Host "=== DataStudio Gelistirme Ortami Baslatiliyor ===" -ForegroundColor Cyan

# 0. Jupyter Servisi Baslatma
Write-Host "[Jupyter] Baslatiliyor (Port 8888)..." -ForegroundColor Green

$JupyterCommand = "
    `$host.UI.RawUI.WindowTitle = 'DataStudio Jupyter Server';
    Set-Location '$RootPath\jupyterBridge\server';
    
    `$pythonCmd = 'python';
    if (Test-Path '.venv') {
        try { 
            . '.\.venv\Scripts\Activate.ps1';
            `$pythonCmd = 'python';
        } catch { 
             Write-Host 'Venv aktivasyon hatasi.' -ForegroundColor Red
        }
    }

    # Jupyter'in calisabilir oldugunu kontrol et
    if ((Get-Command 'jupyter' -ErrorAction SilentlyContinue) -or (Test-Path '.venv\Scripts\jupyter.exe')) {
         # Token ve Allow Origin ayarlariyla baslat
         Write-Host 'Jupyter Lab baslatiliyor...' -ForegroundColor Green
         & `$pythonCmd -m jupyter lab --no-browser --port 8888 --NotebookApp.token='your_token_here' --NotebookApp.allow_origin='*' --ServerApp.ip='0.0.0.0'
    } else {
        Write-Host 'HATA: Jupyter bulunamadi.' -ForegroundColor Red
        Write-Host 'Lutfen: pip install jupyterlab' -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        exit 1
    }
"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $JupyterCommand
Start-Sleep -Seconds 5 # Jupyter'in ayaga kalkmasi icin bekle

# 1. Backend Baslatma
Write-Host "[Backend] Baslatiliyor (FastAPI)..." -ForegroundColor Green

$BackendCommand = "
    `$host.UI.RawUI.WindowTitle = 'DataStudio Backend';
    Set-Location '$RootPath\jupyterBridge\server';
    
    `$pythonCmd = 'python';
    if (Test-Path '.venv') {
        try { 
            . '.\.venv\Scripts\Activate.ps1';
            `$pythonCmd = 'python';
        } catch { 
            `$pythonCmd = '.\.venv\Scripts\python.exe';
        }
    }
    
    Write-Host 'Module kontrol ediliyor...' -ForegroundColor Gray;
    try {
        & `$pythonCmd -c 'import fastapi, uvicorn, requests, jinja2, jupyterlab';
    } catch {
        Write-Host 'HATA: Gerekli moduller eksik.' -ForegroundColor Red;
        Write-Host 'pip install -r requirements.txt' -ForegroundColor Yellow;
        Start-Sleep -Seconds 5;
        exit 1;
    }

    & `$pythonCmd -m uvicorn main:app --port 8000;
"

Start-Process powershell -ArgumentList "-NoExit", "-Command", $BackendCommand
Start-Sleep -Seconds 2

# 2. Frontend Baslatma
Write-Host "[Frontend] Baslatiliyor (Next.js)..." -ForegroundColor Green

$FrontendCommand = "
    `$host.UI.RawUI.WindowTitle = 'DataStudio Frontend';
    Set-Location '$RootPath\ui';
    npm run dev;
"

Start-Process powershell -ArgumentList "-NoExit", "-Command", $FrontendCommand

Write-Host "=== Sistem Hazir ===" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:8000"
Write-Host "Frontend: http://localhost:3000/ui-workspace"
Write-Host "Jupyter: http://localhost:8888"
Write-Host "Cikmak icin acilan diger pencereleri kapatabilirsiniz." -ForegroundColor Red
