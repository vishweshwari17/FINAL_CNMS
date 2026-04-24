from fastapi import APIRouter
from app.models import db
from datetime import datetime

router = APIRouter(prefix="/major-incidents", tags=["Major Incidents"])

@router.get("/")
async def get_major_incidents():
    # Fetch critical incidents that are not resolved
    query = """
        SELECT id, short_id, device_name, title, severity, status, created_at, 
               COALESCE(sla_limit_minutes, 30) as sla_limit,
               TIMESTAMPDIFF(MINUTE, created_at, NOW()) as elapsed
        FROM tickets
        WHERE severity = 'Critical' AND status NOT IN ('RESOLVED', 'CLOSED')
        ORDER BY created_at DESC
    """
    
    rows = await db.fetchall(query)
    
    response = []
    for r in rows:
        sla_limit = r['sla_limit']
        elapsed = r['elapsed'] if r['elapsed'] else 0
        sla_remaining = max(0, sla_limit - int(elapsed))
        
        response.append({
            "ticket_id": r['short_id'],
            "device": r['device_name'],
            "host": r['title'],
            "severity": r['severity'],
            "status": r['status'],
            "created_at": r['created_at'].isoformat() if r['created_at'] else None,
            "sla_remaining": sla_remaining
        })
        
    return response
