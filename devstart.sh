#!/bin/bash

# Renkler
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Çıkışta temizlik yap
cleanup() {
    echo -e "\n${RED}Sunucular kapatılıyor...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

echo -e "${BLUE}=== DataStudio Geliştirme Ortamı Başlatılıyor ===${NC}"

# 1. Backend Başlatma
echo -e "${GREEN}[Backend] Başlatılıyor (FastAPI)...${NC}"
cd jupyterBridge
if [ -d ".datastudio/.venv" ]; then
    source .datastudio/.venv/bin/activate
else
    echo -e "${RED}[Uyarı] .datastudio/.venv bulunamadı. Global python kullanılıyor.${NC}"
fi

# Gerekli paketlerin kontrolü (opsiyonel, hızlı başlangıç için atlanabilir ama iyi bir pratiktir)
# pip install -r requirements.txt > /dev/null 2>&1
# cd .backend (Kaldirildi, dosyalar artik kok dizinde)
cd .datastudio
uvicorn main:app --port 8000 &
BACKEND_PID=$!
cd ..
cd .. # out of jupyterBridge? wait devstart enters jupyterBridge at line 22.

# Backend'in ayağa kalkması için kısa bir bekleme (opsiyonel)
sleep 2

# 2. Frontend Başlatma
echo -e "${GREEN}[Frontend] Başlatılıyor (Next.js)...${NC}"
cd ui
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "${BLUE}=== Sistem Hazır ===${NC}"
echo -e "Backend: http://localhost:8000"
echo -e "Frontend: http://localhost:3000/ui-workspace"
echo -e "${RED}Çıkmak için CTRL+C tuşlayın.${NC}"

# İşlemleri bekle
wait
