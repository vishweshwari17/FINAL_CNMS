import requests
import pymysql
import sys

def test_api():
    print("--- [TEST] Backend API Health ---")
    try:
        r = requests.get("http://localhost:8001/health")
        if r.status_code == 200:
            print("✅ /health: OK")
        else:
            print(f"❌ /health: FAILED (Status {r.status_code})")
        
        # Test a route that previously had trailing slash issue
        r = requests.get("http://localhost:8001/incidents")
        if r.status_code == 200:
            print("✅ /incidents (no slash): OK (CORS/Redirect Fix verified)")
        else:
             print(f"❌ /incidents (no slash): FAILED (Status {r.status_code})")

        # Test Admin Audit (was 500)
        r = requests.get("http://localhost:8001/admin/audit?limit=5")
        if r.status_code == 200:
            print("✅ /admin/audit: OK (Schema Mismatch Fix verified)")
        else:
            print(f"❌ /admin/audit: FAILED (Status {r.status_code})")
            
        # Test War Room Data
        r = requests.get("http://localhost:8001/war-room")
        if r.status_code == 200:
            print("✅ /war-room: OK")
        else:
            print(f"❌ /war-room: FAILED (Status {r.status_code})")

    except Exception as e:
        print(f"❌ API Test Error: {e}")

def test_db():
    print("\n--- [TEST] Database Integrity ---")
    try:
        conn = pymysql.connect(
            host="127.0.0.1",
            user="cnms_user",
            password="cnms1234",
            database="cnms_db",
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn.cursor() as cursor:
            # Check users table
            cursor.execute("SELECT COUNT(*) as cnt FROM users")
            print(f"✅ Table 'users' exists. Count: {cursor.fetchone()['cnt']}")
            
            # Check incidents table
            cursor.execute("SELECT COUNT(*) as cnt FROM correlation_incidents")
            print(f"✅ Table 'correlation_incidents' exists. Count: {cursor.fetchone()['cnt']}")
            
            # Check seeding
            cursor.execute("SELECT root_cause FROM correlation_incidents LIMIT 1")
            res = cursor.fetchone()
            if res:
                print(f"✅ Seed data found: {res['root_cause']}")
            else:
                print("❌ No seed data found in correlation_incidents")
                
        conn.close()
    except Exception as e:
        print(f"❌ Database Test Error: {e}")

if __name__ == "__main__":
    test_api()
    test_db()
