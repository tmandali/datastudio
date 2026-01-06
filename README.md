# DataStudio 👋

DataStudio, modern veri analizi, SQL sorgulama ve izole Python çalışma ortamları sunan güçlü bir platformdur. Jupyter altyapısını kullanarak tarayıcı üzerinden yüksek performanslı veri işleme imkanı sağlar.

---

## 🚀 Öne Çıkan Özellikler

- **İzole Çalışma Alanları (Workspaces):** Her proje için ayrı sanal ortam (`.venv`) ve Jupyter çekirdeği.
- **Yüksek Performans:** Apache Arrow kullanarak Backend'den UI'a hızlı veri akışı (Streaming).
- **Zengin Bağlantı Desteği:** SQL Server (ODBC), DuckDB, Polars ve Pandas entegrasyonu.
- **Modern Arayüz:** Next.js ve Tailwind CSS (shadcn/ui) ile geliştirilmiş, karanlık mod destekli premiun deneyim.
- **Dinamik Geliştirme:** SQL editörü, Python betik yürütme ve otomatik tablo görünümleri.

---

## 🛠 Kurulum ve Gereksinimler

### Ön Koşullar

- **Python:** 3.12+ (Önerilen: 3.13+)
- **Node.js:** v18.0.0+
- **Paket Yöneticisi:** `uv` (Hız ve güvenilirlik için şiddetle önerilir)
- **ODBC Sürücüsü:** Microsoft ODBC Driver 18 for SQL Server (MSSQL kullanacaklar için gereklidir)

### Adım Adım Kurulum

1. **Bağımlılıkları Hazırlayın:**

   ```bash
   # JupyterBridge (Backend) kurulumu
   cd jupyterBridge/.datastudio
   uv venv
   source .venv/bin/activate
   uv pip install -r requirements.txt
   ```

2. **Frontend Kurulumu:**

   ```bash
   cd ui
   npm install
   ```

3. **Çevre Değişkenleri:**
   `ui/.env` dosyasını oluşturun veya güncelleyin:

   ```text
   NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8000/ws/execute
   NEXT_PUBLIC_TERMINAL_WS_URL=ws://127.0.0.1:8000/ws/terminal
   NEXT_PUBLIC_WORKSPACES_ROOT=workspaces
   ```

---

## ⚡️ Çalıştırma

Tüm sistemi (Jupyter Lab, FastAPI Backend ve Next.js Frontend) tek bir komutla başlatabilirsiniz:

```bash
chmod +x devstart.sh
./devstart.sh
```

**Servisler:**

- **Frontend:** <http://localhost:3000/ui-workspace>
- **Backend (API):** <http://localhost:8000>
- **Jupyter Lab:** <http://localhost:8888> (Token: `your_token_here`)

---

## 📂 Proje Yapısı

```text
.
├── ui/                   # Next.js Frontend (React, Shadcn, Tailwind)
├── jupyterBridge/        # FastAPI Backend & Jupyter Entegrasyonu
│   ├── server/           # API Rotaları (Workspaces, Files, Execute)
│   ├── workspaces/       # Kullanıcı projeleri ve izole ortamlar
│   └── .datastudio/      # Sistem yapılandırması ve ana venv
├── devstart.sh           # Otomatik başlatma betiği (macOS/Linux)
└── devstart.ps1          # Otomatik başlatma betiği (Windows)
```

---

## 💡 İpuçları ve Sorun Giderme

- **macOS SQL Bağlantısı:** macOS üzerinde SQL Server'a bağlanırken `localhost` yerine `127.0.0.1` kullanın (DNS çözümleme sorunlarını önler).
- **Log Takibi:** Servis çıktıları artık ana dizindeki log dosyalarına yazılır:
  - `jupyterBridge/jupyter.log`
  - `jupyterBridge/server/backend.log`
  - `ui/frontend.log`
- **Port Çakışması:** Eğer portlar meşgul uyarısı alıyorsanız, servislerden biri arka planda kalmış olabilir. `cleanup` fonksiyonu (CTRL+C) bunları otomatik temizler.

---

## 🛠 Geliştirme Notları

Proje kapsamında veriler **Apache Arrow** formatında akıtılır. Bu sayede milyonlarca satırlık veri, tarayıcıyı dondurmadan "Streaming" yöntemiyle DataGrid üzerine yansıtılabilir.
