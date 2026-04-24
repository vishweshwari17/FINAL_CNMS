import sys
import os

# Add backend and backend/app to path
sys.path.append('/home/nms/Downloads/FINAL_CNMS-main/backend')

import asyncio
from app.database import SessionLocal
from app.models.audit_log import AuditLog
from sqlalchemy.orm import Session

async def check_audit():
    db = SessionLocal()
    try:
        print("Querying AuditLog...")
        logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(5).all()
        print(f"Successfully fetched {len(logs)} logs.")
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(check_audit())
