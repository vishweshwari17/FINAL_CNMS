import sys
import os

# Add backend and backend/app to path
sys.path.append('/home/nms/Downloads/FINAL_CNMS-main/backend')

import asyncio
from app.models import db

async def check_tables():
    await db.init_pool()
    try:
        print("Checking tables...")
        rows = await db.fetchall("SHOW TABLES")
        print("Tables in database:")
        for r in rows:
            print(f"- {list(r.values())[0]}")
            
        print("\nChecking audit_log table status...")
        audit_exists = any(list(r.values())[0] == 'audit_log' for r in rows)
        if audit_exists:
            count = await db.fetchone("SELECT COUNT(*) as c FROM audit_log")
            print(f"audit_log exists with {count['c']} records.")
        else:
            print("audit_log table does NOT exist.")
            
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        await db.close_pool()

if __name__ == "__main__":
    asyncio.run(check_tables())
