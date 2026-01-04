import mssql_python
connection_string = "Server=localhost,1433;Database=testDb;UID=sa;PWD=Passw@rd;TrustServerCertificate=yes;Authentication=SqlPassword"
# conn_str = Server=<your_server_name>;Database=<your_database_name>;UID=<your_user_id>;PWD=<your_password>;Trusted_Connection=yes;Encrypt=yes;TrustServerCertificate=yes;Authentication=<SqlPassword>;

# conn.setencoding(encoding='utf-8')
conn = mssql_python.connect(connection_string)
conn.setdecoding(mssql_python.SQL_CHAR, encoding='utf-8')

# One-off query with automatic cleanup
row = conn.execute("SELECT first_name FROM users WHERE id = ?", 123).fetchone()
print("User name:", row[0])

# Explicit resource management for large result sets
# cursor = conn.execute("SELECT top 1000 * FROM users")
# try:
#     rows = cursor.fetchall()
#     for row in rows:
#         print(row)
# finally:
#     cursor.close()  # Explicitly close the cursor