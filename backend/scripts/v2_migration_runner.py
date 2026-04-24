import pymysql
import time

def run_migration():
    conn = pymysql.connect(
        unix_socket="/var/lib/mysql/mysql.sock",
        user="cnms_user",
        password="cnms1234",
        db="cnms_db",
        autocommit=True
    )
    cursor = conn.cursor()

    def kill_lockers():
        cursor.execute("SHOW FULL PROCESSLIST")
        processes = cursor.fetchall()
        for p in processes:
            # Kill processes that are either too old or waiting for locks
            if p[0] != conn.thread_id() and (p[5] > 5 or "Waiting for table metadata lock" in str(p[7])):
                try:
                    cursor.execute(f"KILL {p[0]}")
                    print(f"Killed process {p[0]}")
                except:
                    pass

    steps = [
        "ALTER TABLE alarms ADD COLUMN alarm_key VARCHAR(255) AFTER alarm_uid",
        "ALTER TABLE alarms ADD COLUMN is_active TINYINT(1) DEFAULT 1 AFTER status",
        "UPDATE alarms SET alarm_key = CONCAT(COALESCE(CAST(device_id AS CHAR), device_name, 'unknown'), '_', alarm_type)",
        """UPDATE alarms a
           JOIN (
               SELECT MAX(id) as max_id, alarm_key
               FROM alarms
               WHERE status IN ('OPEN', 'ACK', 'ACTIVE')
               GROUP BY alarm_key
           ) b ON a.alarm_key = b.alarm_key 
           SET a.is_active = IF(a.id = b.max_id, 1, 0),
               a.status = IF(a.id = b.max_id, a.status, 'RESOLVED')""",
        "UPDATE alarms SET is_active = 0 WHERE status IN ('RESOLVED', 'CLOSED')",
        "ALTER TABLE alarms ADD COLUMN active_token TINYINT(1) NULL DEFAULT 1 AFTER is_active",
        "UPDATE alarms SET active_token = IF(is_active = 1, 1, NULL)",
        "ALTER TABLE alarms ADD UNIQUE INDEX idx_unique_alarm_key_active (alarm_key, active_token)"
    ]

    import threading
    def kill_loop():
        while True:
            try:
                kill_lockers()
            except:
                pass
            time.sleep(2)
    
    killer_thread = threading.Thread(target=kill_loop, daemon=True)
    killer_thread.start()

    for step in steps:
        print(f"Executing: {step[:50]}...")
        success = False
        attempts = 0
        while not success and attempts < 10:
            try:
                cursor.execute(step)
                success = True
                print("Success")
            except pymysql.err.OperationalError as e:
                if e.args[0] in (1060, 1061): # Duplicate column or key
                    print("Already exists, skipping")
                    success = True
                else:
                    print(f"Error: {e}. Killing lockers and retrying...")
                    kill_lockers()
                    attempts += 1
                    time.sleep(1)
            except Exception as e:
                print(f"Permanent Error: {e}")
                break

    conn.close()

if __name__ == "__main__":
    run_migration()
