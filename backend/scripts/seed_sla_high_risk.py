import asyncio
import pymysql
import os
import uuid
from datetime import datetime, timedelta

# DB Configuration
DB_HOST = "localhost"
DB_USER = os.getenv("DB_USER", "cnms_user")
DB_PASS = os.getenv("DB_PASSWORD", "cnms1234")
DB_NAME = os.getenv("DB_NAME", "cnms_db")
SOCKET  = "/var/lib/mysql/mysql.sock"

async def seed_sla_data():
    conn = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        unix_socket=SOCKET,
        cursorclass=pymysql.cursors.DictCursor
    )
    
    try:
        with conn.cursor() as cursor:
            print("--- Seeding High SLA Risk Intelligence Data ---")
            
            now = datetime.now()
            
            # Sample Risk Profiles
            risks = [
                ("CRITICAL", "CORE-RTR-01", "BGP Session Flap", 120, 115, "L1-SUPPORT"), # 95% used
                ("MAJOR", "EDGE-SW-05", "Broadcast Storm", 60, 52, "SYSTEM-SEED"),      # 86% used
                ("CRITICAL", "FW-MAIN", "Unauthorized Access", 30, 28, "L1-SUPPORT"),    # 93% used
                ("MAJOR", "DC1-SW-A", "Interface Error Rate", 180, 45, "SYSTEM-SEED"),  # 25% used
                ("MINOR", "SRV-PROD-10", "High Disk I/O", 240, 200, "L1-SUPPORT"),      # 83% used
            ]
            
            for sev, dev, title, limit, used, node in risks:
                ticket_uid = f"TKT-{uuid.uuid4().hex[:6].upper()}"
                short_id = f"TKT-{uuid.uuid4().hex[:4].upper()}"
                
                cursor.execute("""
                    INSERT INTO tickets 
                    (ticket_uid, short_id, lnms_node_id, device_name, title, severity, status, 
                     sla_limit_minutes, sla_used, description, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, 'OPEN', %s, %s, %s, %s)
                """, (ticket_uid, short_id, node, dev, title, sev, limit, used, 
                      f"Predictive SLA risk alert for {dev}. Processing threshold breach imminent.", 
                      now - timedelta(minutes=used)))

            conn.commit()
            print(f"✓ Seeded {len(risks)} high-risk SLA vectors.")

    except Exception as e:
        print(f"Error seeding SLA data: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    asyncio.run(seed_sla_data())
