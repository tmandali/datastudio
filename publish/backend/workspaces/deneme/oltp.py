import pyodbc

# 1. Bağlantı Bilgilerini Tanımlama
server = "testoltp.lcwaikiki.local"
database = "retail"

try:
    # 2. Bağlantıyı Kurma
    connection_string = (
        "DRIVER={ODBC Driver 18 for SQL Server};"
        f"SERVER={server};"
        f"DATABASE={database};"
        "TrustServerCertificate=yes;"
        "UID={{env.SQLUSER}};"
        "PWD={{env.SQLPASSWORD}};"
        "Encrypt=no;"
    )
    
    conn = pyodbc.connect(connection_string)
    
    # Configure encoding for character types using pyodbc's standard method
    # conn.setdecoding(pyodbc.SQL_CHAR, encoding='cp1254')
    # conn.setdecoding(pyodbc.SQL_WCHAR, encoding='cp1254')
    
    cursor = conn.cursor()

    # 3. Sorgu Çalıştırma
    sql_query = "SELECT top 100000 * FROM tb_Urun (NOLOCK)"
    cursor.execute(sql_query)

    # stream function is likely explicitly imported or available in the user's environment context. 
    # If not, we might need to assume it's there or mock it. 
    # The user's original code had 'stream(cursor)' as a global.
    if 'stream' in globals():
        stream(cursor)
    else:
        # Fallback if stream is not defined (e.g. running standalone)
        print("Function 'stream' not found. Fetching first 5 rows:")
        rows = cursor.fetchmany(5)
        for row in rows:
            print(row)

except Exception as e:
    print(f"Bir hata oluştu: {e}")
