import sys
import subprocess
import os
import traceback
import io
import json
import time
import platform
import psutil
from datetime import datetime

# --- 1. KÜTÜPHANE YÜKLEYİCİ ---
# Bu kısım main.py tarafından {{REQUIRED_PACKAGES}} ile doldurulacak
required_packages = {{REQUIRED_PACKAGES}}
if required_packages:
    try:
        # Pip'i sessiz modda çalıştır
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "-q", "--disable-pip-version-check", *required_packages],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.STDOUT
        )
    except Exception:
        pass

# --- 2. ÇEKİRDEK ÖZELLİKLER ---
try:
    import duckdb
    import pyarrow as pa
    from IPython import get_ipython
    from IPython.display import display
    
    # Rich Konfigürasyonu
    try:
        from rich import print as rprint
        from rich.console import Console
        from rich.pretty import install as install_rich_pretty
        from rich.table import Table
        
        console = Console(force_terminal=True, width=120) 
        install_rich_pretty(console=console)
        
        table = Table(title="Jupyter Kernel Status")
        table.add_column("Component", style="cyan")
        table.add_column("Status", style="green")
        table.add_row("Rich", "Active")
        table.add_row("DuckDB", "Connected")
        console.print(table)
    except ImportError:
        print("Rich library not found.")

    # DuckDB Bağlantısı
    con = duckdb.connect(':memory:')

    class ArrowWrapper:
        def __init__(self, obj):
            if isinstance(obj, pa.RecordBatch):
                self.table = pa.Table.from_batches([obj])
            elif isinstance(obj, pa.Table):
                self.table = obj
            else:
                self.table = obj

        def _repr_mimebundle_(self, include=None, exclude=None):
            sink = io.BytesIO()
            with pa.ipc.new_stream(sink, self.table.schema) as writer:
                writer.write_table(self.table)
            return {'application/vnd.apache.arrow.stream': sink.getvalue()}

        def _ipython_display_(self):
            ip = get_ipython()
            if ip:
                ip.display_pub.publish(data=self._repr_mimebundle_())

    # Global Streaming ve Kayıt Yardımcısı
    def stream(obj, name=None, batch_size=5000, silent=False):
        '''
        Veriyi UI'a (DataGrid) akıtır veya DuckDB'ye tablo olarak kaydeder.
        '''
        batches = []
        total_rows = 0
        
        try:
            # 1. DuckDB Relation Tespiti
            if hasattr(obj, 'record_batch_reader'):
                if silent and name:
                    con.register(name, obj.record_batch_reader().read_all())
                    return f"-- Registered {name} from Relation"
                
                reader = obj.record_batch_reader(batch_size=batch_size)
                for batch in reader:
                    if not silent: display(ArrowWrapper(batch))
                    if name: batches.append(batch)
                    total_rows += len(batch)
                
                if name and batches:
                    con.register(name, pa.Table.from_batches(batches))
                return

            # 2. Standart Cursor (mssql_python, sqlite3 vb.)
            if hasattr(obj, 'fetchmany') and hasattr(obj, 'description'):
                cursor = obj
                col_names = [col[0].lower() for col in cursor.description]
                
                while True:
                    rows = cursor.fetchmany(batch_size)
                    if not rows: break
                    
                    batch = pa.RecordBatch.from_arrays(
                        [pa.array(c) for c in zip(*rows)], 
                        names=col_names
                    )
                    total_rows += len(rows)
                    
                    if not silent: display(ArrowWrapper(batch))
                    if name: batches.append(batch)
                
                if name and batches:
                    con.register(name, pa.Table.from_batches(batches))
                    print(f"\x1b[32m✔ '{name}' tablosu {total_rows} satırla hazır.\x1b[0m", flush=True)
                return
                
            # 3. Genel Obje (Arrow Table, RecordBatch vb.)
            if not silent: display(ArrowWrapper(obj))
            if name:
                wrapped = ArrowWrapper(obj)
                con.register(name, wrapped.table)
                
        except KeyboardInterrupt:
            print(f"\n\x1b[33m[!] Akış kullanıcı tarafından kesildi.\x1b[0m", flush=True)
            if name and batches:
                con.register(name, pa.Table.from_batches(batches))
                print(f"\x1b[32m✔ '{name}' tablosu buraya kadar olan ({total_rows} satır) veriyle kaydedildi.\x1b[0m", flush=True)
            return  # Traceback'i engellemek için sessizce çık

    # SQL Çalıştırma Yardımcısı
    def execute_sql_query(query):
        raw_statements = [s.strip() for s in query.split(';') if s.strip()]
        
        def is_real_code(s):
            lines = s.split('\n')
            for l in lines:
                l = l.strip()
                if l and not l.startswith('--') and not l.startswith('#') and not (l.startswith('/*') and l.endswith('*/')):
                    return True
            return False

        statements = [s for s in raw_statements if is_real_code(s)]
        if not statements:
            print("\x1b[33m[UYARI]\x1b[0m Çalıştırılacak SQL ifadesi bulunamadı.", flush=True)
            return

        total = len(statements)
        last_result_df = None
        start_time_all = time.time()
        
        print(f"\n\x1b[35;1m▶ SQL Script İşleme Başlatıldı ({total} Adım)\x1b[0m", flush=True)
        print("\x1b[90m" + "─" * 50 + "\x1b[0m", flush=True)

        for i, stmt in enumerate(statements):
            idx = i + 1
            now = datetime.now().strftime("%H:%M:%S")
            short_stmt = stmt.replace('\n', ' ').strip()
            if len(short_stmt) > 60: short_stmt = short_stmt[:57] + "..."
            
            print(f"\x1b[34m[{now}] [{idx}/{total}]\x1b[0m \x1b[1mÇALIŞTIRILIYOR:\x1b[0m {short_stmt}", flush=True)
            
            step_start = time.time()
            try:
                rel = con.sql(stmt)
                duration = time.time() - step_start
                
                if rel is not None and rel.description is not None and len(rel.description) > 0:
                    res_arrow = rel.fetch_arrow_table()
                    print(f"\x1b[32m  ✔ SONUÇ:\x1b[0m {len(res_arrow)} satır ({duration:.3f} sn)", flush=True)
                    last_result_df = res_arrow
                else:
                    print(f"\x1b[32m  ✔ BAŞARILI\x1b[0m ({duration:.3f} sn)", flush=True)
                
                time.sleep(0.1)
                
            except KeyboardInterrupt:
                duration = time.time() - step_start
                print(f"\x1b[33m  ⚠ DURDURULDU\x1b[0m ({duration:.3f} sn)", flush=True)
                break
            except Exception as e:
                duration = time.time() - step_start
                print(f"\x1b[31m  ✘ HATA\x1b[0m ({duration:.3f} sn): {str(e)}", flush=True)
                break
            
            if idx < total:
                print("\x1b[90m" + "  " + "·" * 20 + "\x1b[0m", flush=True)

        if last_result_df is not None:
            display(ArrowWrapper(last_result_df))

        total_duration = time.time() - start_time_all
        print("\x1b[90m" + "─" * 50 + "\x1b[0m", flush=True)
        print(f"\x1b[35;1m■ Tamamlandı.\x1b[0m Toplam Süre: {total_duration:.3f} sn\n", flush=True)

    # Sistem Bilgisi Raporlama
    sys_info = {
        "python": platform.python_version(),
        "os": f"{platform.system()} {platform.release()}",
        "ram_total": f"{round(psutil.virtual_memory().total / (1024**3), 2)} GB",
        "ram_available": f"{round(psutil.virtual_memory().available / (1024**3), 2)} GB",
        "processor": platform.processor(),
        "kernel_id": "{{KERNEL_ID}}",
        "session_id": "{{SESSION_ID}}",
        "jupyter_url": "{{JUPYTER_URL}}",
        "session_link": "{{SESSION_LINK}}"
    }
    print(f"__SYS_INFO__{json.dumps(sys_info)}__SYS_INFO_END__")
    print("Kernel Bootstrap Successful.")

except Exception as e:
    print(f"\n!!! KERNEL BOOTSTRAP ERROR !!!")
    traceback.print_exc()
