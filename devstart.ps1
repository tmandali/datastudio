# Renkler
$Green = "Green"
$Blue = "Cyan"
$Red = "Red"
$Reset = "White"

# Türkçe karakter sorununu çözmek için encoding ayarını zorla
$OutputEncoding = [console]::InputEncoding = [console]::OutputEncoding = New-Object System.Text.UTF8Encoding

# Mevcut konumu al
$RootPath = Get-Location

Write-Host "=== DataStudio Geliştirme Ortamı Başlatılıyor ===" -ForegroundColor $Blue

# 1. Backend Başlatma
Write-Host "[Backend] Başlatılıyor (FastAPI)..." -ForegroundColor $Green

# Backend için yeni bir PowerShell penceresi aç
$BackendCommand = "
    `$host.UI.RawUI.WindowTitle = 'DataStudio Backend';
    Set-Location '$RootPath\jupyterBridge';
    
    `$pythonCmd = 'python';
    if (Test-Path '.datastudio\.venv') {
        Write-Host 'Venv aktif ediliyor...' -ForegroundColor Green;
        try { 
            . '.\.datastudio\.venv\Scripts\Activate.ps1';
            `$pythonCmd = 'python'; # Activate puts venv python first in path
        } catch { 
            Write-Host 'Venv aktivasyon hatası: ' + `$_ -ForegroundColor Red 
            # Fallback to direct path if activation fails
            `$pythonCmd = '.\.datastudio\.venv\Scripts\python.exe';
        }
    } else {
        Write-Host '[Uyarı] .datastudio\.venv bulunamadı. Global python kullanılıyor.' -ForegroundColor Red;
    }
    
    Set-Location '.datastudio';
    
    # Check for requirements
    Write-Host 'Module kontrol ediliyor...' -ForegroundColor Gray;
    try {
        & `$pythonCmd -c 'import fastapi, uvicorn';
    } catch {
        Write-Host 'HATA: Gerekli modüller (fastapi, uvicorn) eksik.' -ForegroundColor Red;
        Write-Host 'Lütfen şu komutu çalıştırın:' -ForegroundColor Yellow;
        Write-Host 'pip install -r requirements.txt' -ForegroundColor Yellow;
        Write-Host 'Çıkış yapılıyor...' -ForegroundColor Red;
        Start-Sleep -Seconds 10;
        exit 1;
    }

    # Start uvicorn using module syntax to avoid path issues
    & `$pythonCmd -m uvicorn main:app --port 8000;
"

Start-Process powershell -ArgumentList "-NoExit", "-Command", $BackendCommand

# Backend'in başlaması için kısa bir süre bekle
Start-Sleep -Seconds 2

# 2. Frontend Başlatma
Write-Host "[Frontend] Başlatılıyor (Next.js)..." -ForegroundColor $Green

# Frontend için yeni bir PowerShell penceresi aç
$FrontendCommand = "
    `$host.UI.RawUI.WindowTitle = 'DataStudio Frontend';
    Set-Location '$RootPath\ui';
    npm run dev;
"

Start-Process powershell -ArgumentList "-NoExit", "-Command", $FrontendCommand

Write-Host "=== Sistem Hazır ===" -ForegroundColor $Blue
Write-Host "Backend: http://localhost:8000"
Write-Host "Frontend: http://localhost:3000/ui-workspace"
Write-Host "Çıkmak için açılan diğer pencereleri kapatabilirsiniz." -ForegroundColor $Red

