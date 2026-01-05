
--kullanıcı listesi
SELECT id, first_name, last_name
FROM users;

SELECT 1 as ID, 'Timur' as Name;

SELECT '{{user_id}}' as current_user, '{{date}}' as execution_date;

select * from duckdb_logs;

SELECT * FROM sqlite_master;

CREATE TABLE IF NOT EXISTS deneme (
    kod INTEGER PRIMARY KEY,
    tanim TEXT
);