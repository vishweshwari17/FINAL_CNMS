import asyncio
import os
import sys

# Add the backend directory to sys.path
sys.path.append('/home/nms/Downloads/FINAL_CNMS-main/backend')

from app.models import db

async def check():
    await db.init_pool()
    try:
        # Check tickets for MajorIncidents
        tickets = await db.fetchall("SELECT id, short_id, severity, status FROM tickets WHERE severity='Critical' AND status NOT IN ('RESOLVED', 'CLOSED')")
        print(f"Active Critical Tickets: {len(tickets)}")
        for t in tickets:
            print(f"  {t['short_id']} - {t['status']}")
            
        # Check correlation_incidents for WarRoom
        incidents = await db.fetchall("SELECT id, incident_uid, status FROM correlation_incidents WHERE status != 'RESOLVED'")
        print(f"Active Correlation Incidents: {len(incidents)}")
        for i in incidents:
            print(f"  {i['incident_uid']} - {i['status']}")
    finally:
        await db.close_pool()

if __name__ == "__main__":
    asyncio.run(check())
