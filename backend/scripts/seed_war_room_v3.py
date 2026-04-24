import asyncio
import pymysql
import os
import uuid
import time
from datetime import datetime, timedelta

# DB Configuration
DB_HOST = "localhost"
DB_USER = os.getenv("DB_USER", "cnms_user")
DB_PASS = os.getenv("DB_PASSWORD", "cnms1234")
DB_NAME = os.getenv("DB_NAME", "cnms_db")
SOCKET  = "/var/lib/mysql/mysql.sock"

async def seed_data():
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
            print("--- Seeding War Room Forensic Data ---")
            
            # 0. Seed required node
            cursor.execute("""
                INSERT INTO lnms_nodes (node_id, display_name, ip_address, port, status)
                VALUES ('SYSTEM-SEED', 'Forensic Seed Node', '127.0.0.1', 8000, 'CONNECTED')
                ON DUPLICATE KEY UPDATE status='CONNECTED'
            """)

            # 1. Clear existing correlation data to avoid duplicates
            cursor.execute("DELETE FROM alarm_correlation_mapping")
            cursor.execute("DELETE FROM correlation_incidents")
            
            now = datetime.now()
            
            # --- INCIDENT 1: CORE BROADCAST STORM ---
            incident_uid = f"INC-{uuid.uuid4().hex[:8].upper()}"
            cursor.execute("""
                INSERT INTO correlation_incidents 
                (incident_uid, device_name, main_anomaly, severity, impact, title, status, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (incident_uid, "CORE-SW-01", "Broadcast Storm", "CRITICAL", "6 Devices", 
                  "Network Degradation via CORE-SW-01", "OPEN", now - timedelta(minutes=15), now))
            
            inc_id = cursor.lastrowid
            
            # Seed Alarms for Incident 1
            alarms = [
                # Root Cause
                ("ALM-RC-001", "CORE-SW-01", "Broadcast Storm", "Critical", "High broadcast traffic detected on Core-SW-01", now - timedelta(minutes=15), 1),
                # Propagated Alarms
                ("ALM-PR-001", "CORE-SW-02", "High CPU Usage", "Major", "CPU processing capacity reached 98% due to storm", now - timedelta(minutes=12), 0),
                ("ALM-PR-002", "EDGE-SW-10", "Interface Flapping", "Major", "Multiple ports flapping on Edge-SW-10", now - timedelta(minutes=10), 0),
                ("ALM-PR-003", "SRV-PROD-01", "Latency Breach", "Minor", "Standard ICMP response time > 500ms", now - timedelta(minutes=5), 0),
            ]
            
            for uid, dev, typ, sev, desc, raised, is_rc in alarms:
                cursor.execute("""
                    INSERT INTO alarms (alarm_uid, alarm_key, lnms_node_id, device_name, alarm_type, severity, status, description, is_active, raised_at, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 1, %s, NOW())
                    ON DUPLICATE KEY UPDATE status='ACTIVE', is_active=1
                """, (uid, f"{dev}_{typ}", "SYSTEM-SEED", dev, typ, sev, "ACTIVE", desc, raised))
                
                cursor.execute("""
                    INSERT INTO alarm_correlation_mapping (incident_id, alarm_uid, is_root_cause)
                    VALUES (%s, %s, %s)
                """, (inc_id, uid, is_rc))

            # Linked Ticket for Incident 1
            cursor.execute("""
                INSERT INTO tickets (ticket_uid, short_id, alarm_uid, lnms_node_id, device_name, title, severity, status, sla_limit_minutes, description, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (f"TKT-{uuid.uuid4().hex[:6].upper()}", "TKT-1001", "ALM-RC-001", "SYSTEM-SEED", "CORE-SW-01", 
                  "Emergency: Core Broadcast Storm", "CRITICAL", "OPEN", 60, 
                  "Forensic correlation identified CORE-SW-01 as root cause of cluster INC-B201", now - timedelta(minutes=15)))

            print(f"✓ Seeded Incident {incident_uid} (CORE-SW-01) with 4 correlated alarms.")

            # --- INCIDENT 2: BGP PEERING FLAP ---
            incident_uid_2 = f"INC-{uuid.uuid4().hex[:8].upper()}"
            cursor.execute("""
                INSERT INTO correlation_incidents 
                (incident_uid, device_name, main_anomaly, severity, impact, title, status, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (incident_uid_2, "EDGE-RTR-02", "BGP Peering Down", "MAJOR", "WAN Connectivity", 
                  "BGP Session Loss - Peer 1.1.1.2", "OPEN", now - timedelta(hours=1), now))
            
            inc_id_2 = cursor.lastrowid
            
            cursor.execute("""
                INSERT INTO alarms (alarm_uid, alarm_key, lnms_node_id, device_name, alarm_type, severity, status, description, is_active, raised_at, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 1, %s, NOW())
                ON DUPLICATE KEY UPDATE status='ACTIVE', is_active=1
            """, ("ALM-BGP-001", "EDGE-RTR-02_BGP", "SYSTEM-SEED", "EDGE-RTR-02", "BGP Peering Down", "Major", "ACTIVE", "Secondary WAN link peer disconnected", now - timedelta(hours=1)))
            
            cursor.execute("INSERT INTO alarm_correlation_mapping (incident_id, alarm_uid, is_root_cause) VALUES (%s, %s, 1)", (inc_id_2, "ALM-BGP-001"))

            print(f"✓ Seeded Incident {incident_uid_2} (EDGE-RTR-02).")

            conn.commit()
            print("\nDatabase successfully populated with forensic data.")

    except Exception as e:
        print(f"Error seeding data: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
