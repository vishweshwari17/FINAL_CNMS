import pymysql
import os
from dotenv import load_dotenv

def rectify_schema_v3():
    load_dotenv()
    
    # Use Unix socket as found in app/models/db.py
    unix_socket = "/var/lib/mysql/mysql.sock"
    db_user = os.getenv("DB_USER", "cnms_user")
    db_pass = os.getenv("DB_PASSWORD", "cnms1234")
    db_name = os.getenv("DB_NAME", "cnms_db")

    try:
        conn = pymysql.connect(
            unix_socket=unix_socket,
            user=db_user,
            password=db_pass,
            database=db_name,
            cursorclass=pymysql.cursors.DictCursor
        )
    except Exception as e:
        print(f"Failed to connect via Unix socket: {e}. Trying localhost...")
        db_host = os.getenv("DB_HOST", "localhost")
        conn = pymysql.connect(
            host=db_host,
            user=db_user,
            password=db_pass,
            database=db_name,
            cursorclass=pymysql.cursors.DictCursor
        )

    try:
        with conn.cursor() as cursor:
            print("Checking for missing columns in 'alarms' table...")
            cursor.execute("DESCRIBE alarms")
            columns = [row['Field'] for row in cursor.fetchall()]
            
            if 'created_at' not in columns:
                print("Adding 'created_at' column...")
                # Adding it as DATETIME NULL for existing rows to be safe, or DEFAULT CURRENT_TIMESTAMP
                cursor.execute("ALTER TABLE alarms ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP")
                print("Success.")
            else:
                print("'created_at' already exists.")

            if 'updated_at' not in columns:
                print("Adding 'updated_at' column...")
                cursor.execute("ALTER TABLE alarms ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
                print("Success.")
            else:
                print("'updated_at' already exists.")

            conn.commit()
            print("Schema rectification complete.")

    except Exception as e:
        print(f"Error during schema rectification: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    rectify_schema_v3()
