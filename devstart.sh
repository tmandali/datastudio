#!/bin/bash

# Renkler
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Çıkışta temizlik yap
cleanup() {
    echo -e "\n${RED}Sunucular kapatılıyor...${NC}"
    # Arka plandaki tüm işlemleri durdur
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

echo -e "${BLUE}=== DataStudio Geliştirme Ortamı Başlatılıyor ===${NC}"

# Port kontrolü
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        return 1
    fi
    return 0
}

ROOT_DIR=$(pwd)
VENV_PATH="$ROOT_DIR/jupyterBridge/.datastudio/.venv"

# Sanal ortam kontrolü ve Python tespiti
if [ -d "$VENV_PATH" ]; then
    PYTHON_EXE="$VENV_PATH/bin/python3"
    [ ! -f "$PYTHON_EXE" ] && PYTHON_EXE="$VENV_PATH/bin/python"
    echo -e "${BLUE}[Sanal Ortam] Kullanılan Python: $PYTHON_EXE${NC}"
else
    echo -e "${RED}[Uyarı] Sanal ortam (.venv) bulunamadı. Lütfen önce kurulum yapın.${NC}"
    exit 1
fi

# 0. Jupyter Başlatma
if check_port 8888; then
    echo -e "${GREEN}[Jupyter] Başlatılıyor (Port: 8888)...${NC}"
    cd "$ROOT_DIR/jupyterBridge"
    > jupyter.log
    $PYTHON_EXE -m jupyter lab --no-browser --port 8888 --NotebookApp.token='your_token_here' --NotebookApp.allow_origin='*' --ServerApp.ip='0.0.0.0' > jupyter.log 2>&1 &
    JUPYTER_PID=$!
    echo -e "${BLUE}[Jupyter] Arka planda başlatıldı (PID: $JUPYTER_PID). Log: jupyterBridge/jupyter.log${NC}"
    cd "$ROOT_DIR"
    sleep 3
else
    echo -e "${BLUE}[Jupyter] Port 8888 kullanımda, zaten çalışıyor varsayılıyor.${NC}"
fi

# 1. Backend Başlatma
if check_port 8000; then
    echo -e "${GREEN}[Backend] Başlatılıyor (Port: 8000)...${NC}"
    cd "$ROOT_DIR/jupyterBridge/server"
    > backend.log
    $PYTHON_EXE -m uvicorn main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
    BACKEND_PID=$!
    echo -e "${BLUE}[Backend] FastAPI başlatıldı (PID: $BACKEND_PID). Log: jupyterBridge/server/backend.log${NC}"
    cd "$ROOT_DIR"
else
    echo -e "${BLUE}[Backend] Port 8000 kullanımda, zaten çalışıyor varsayılıyor.${NC}"
fi

# 2. Frontend Başlatma
if check_port 3000; then
    echo -e "${GREEN}[Frontend] Başlatılıyor (Port: 3000)...${NC}"
    cd "$ROOT_DIR/ui"
    > frontend.log
    # Portu zorla 3000 yapmak için -p ekliyoruz (bazı durumlarda Next.js 3001'e kayabiliyor)
    npm run dev -- -p 3000 > frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo -e "${BLUE}[Frontend] Next.js başlatıldı (PID: $FRONTEND_PID). Log: ui/frontend.log${NC}"
    cd "$ROOT_DIR"
else
    echo -e "${BLUE}[Frontend] Port 3000 kullanımda, zaten çalışıyor varsayılıyor.${NC}"
fi

echo -e "\n${BLUE}=== Sistem Hazır ===${NC}"
echo -e "Backend:  ${GREEN}http://localhost:8000${NC}"
echo -e "Frontend: ${GREEN}http://localhost:3000/ui-workspace${NC}"
echo -e "Jupyter:  ${GREEN}http://localhost:8888${NC}"
echo -e "${RED}Kapatmak için CTRL+C tuşlayın.${NC}\n"

# Logları izlemek isterseniz: tail -f jupyterBridge/server/backend.log
wait
