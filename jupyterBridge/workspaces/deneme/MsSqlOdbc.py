import sys
import os
from os import getenv
from time import sleep
from argparse import ArgumentParser
from dotenv import load_dotenv
import pyodbc  # SQL bağlantısı için
from pyodbc import Connection, Cursor, connect
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn

_connection = None

def get_connection() -> Connection:
   global _connection
   if not _connection:
       load_dotenv()
       orig_conn_str = getenv("SQL_CONNECTION_STRING")
       # Add timeout to prevent hanging
       conn_str_with_timeout = f"{orig_conn_str};LoginTimeout=5"
       _connection = connect(conn_str_with_timeout)  # type: ignore
   return _connection

def query_sql() -> Cursor:

   SQL_QUERY = """
     select top 10 * from users u
   """

   conn = get_connection()
   cursor = conn.cursor()
   cursor.execute(SQL_QUERY)
   return cursor

def get_results(sleep_time: int = 0) -> None:
     # print("Connecting to SQL...", flush=True)

     cursor = query_sql()

     if sleep_time > 0:
         sleep(sleep_time)

     # print("Formatting results...", flush=True)

     table = Table(title="Users")
     table.add_column("ID", style="bright_blue", justify="center")
     table.add_column("First Name", style="bright_white", justify="left")
     table.add_column("Last Name", style="bold green", justify="right")

     records = cursor.fetchall()
     print(f"Fetched {len(records)} rows from database.", flush=True)

     for r in records:
         table.add_row(str(r.id), str(r.first_name), str(r.last_name))

     if cursor:
         cursor.close()

     if sleep_time > 0:
         sleep(sleep_time)

     # Use capture to ensure we get the string, then print it using standard print
     # which we know works in this environment.
     console = Console(width=120, force_terminal=True)
     with console.capture() as capture:
         console.print(table)
     
     print(capture.get(), flush=True)

def main() -> None:
   parser = ArgumentParser()
   parser.add_argument("--sleep-time", type=int, default=0,
                       help="Time to sleep in seconds to simulate slow connection")
   args, _ = parser.parse_known_args()

   if args.sleep_time > 0:
       get_results(args.sleep_time)
   else:
       get_results()

   if _connection:
       _connection.close()

if __name__ == "__main__":
    try:
        # Load env logic
        env_path = ".env"
        if not os.path.exists(env_path):
             if os.path.exists("jupyterBridge/.env"): env_path = "jupyterBridge/.env"
             elif os.path.exists("../jupyterBridge/.env"): env_path = "../jupyterBridge/.env"
        
        load_dotenv(env_path)
        
        if not getenv("SQL_CONNECTION_STRING"):
            print("ERROR: SQL_CONNECTION_STRING not found in environment variables.", flush=True)
        else:
            main()
    except Exception as e:
        print(f"CRITICAL ERROR: {e}", flush=True)
        import traceback
        traceback.print_exc()