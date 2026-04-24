import asyncio
import pymysql
import os
from datetime import datetime, timedelta

# DB Configuration
DB_HOST = "localhost"
DB_USER = "cnms_user"
DB_PASS = "cnms1234"
DB_NAME = "cnms_db"

async def seed():
    conn = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        unix_socket="/var/lib/mysql/mysql.sock",
        cursorclass=pymysql.cursors.DictCursor
    )
    
    try:
        with conn.cursor() as cursor:
            # Check if table exists
            cursor.execute("SHOW TABLES LIKE 'correlation_incidents'")
            if not cursor.fetchone():
                print("Table correlation_incidents does not exist. Skipping.")
                return

            # Sample incidents
            incidents = [
                ("BGP Flapping - Core Node", "CRITICAL", "OPEN", "CORE-RTR-01", 0),
                ("High Latency Detected - Edge 1", "MAJOR", "OPEN", "EDGE-SW-05", 5),
                ("Database Synchronization Delay", "MINOR", "RESOLVED", "SRV-DB-PROD", 10),
                ("Unauthorized Access Attempt", "CRITICAL", "OPEN", "FW-MAIN", 15),
                ("Power Cycle Detected", "MAJOR", "OPEN", "UPS-NOC-A", 20),
                ("Interface CRC Errors", "MINOR", "OPEN", "DIST-SW-02", 25),
            ]

            now = datetime.now()
            
            # Clear existing for fresh look? (Optional)
            # cursor.execute("DELETE FROM correlation_incidents")
            
            sql = """
            INSERT INTO correlation_incidents 
            (title, severity, status, device_name, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """
            
            for title, sev, status, dev, m_ago in incidents:
                ts = now - timedelta(minutes=m_ago)
                cursor.execute(sql, (title, sev, status, dev, ts, ts))
            
            conn.commit()
            print(f"Successfully seeded {len(incidents)} incidents.")

    finally:
        conn.close()

if __name__ == "__main__":
    asyncio.run(seed())
