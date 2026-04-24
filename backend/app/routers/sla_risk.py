from fastapi import APIRouter
from app.models import db
from datetime import datetime

router = APIRouter(prefix="/sla", tags=["SLA Risk"])

@router.get("/risk")
async def get_sla_risk():
    # Only include tickets that are OPEN or ACK
    active_statuses = ["OPEN", "ACK"]
    
    query = """
        SELECT id, short_id, alarm_uid, lnms_node_id, device_name, severity, status, 
               created_at, sla_used, sla_status, 
               COALESCE(sla_limit_minutes, sla_minutes, 60) as sla_limit
        FROM tickets
        WHERE status IN (%s, %s)
    """
    
    rows = await db.fetchall(query, active_statuses)
    
    results = []
    for r in rows:
        sla_limit = r['sla_limit']
        elapsed_time = r['sla_used']
        remaining_time = max(0, sla_limit - elapsed_time)
        risk_percentage = min(100, int((elapsed_time / sla_limit) * 100))
        
        # Risk level determination logic
        if risk_percentage >= 100:
            risk_level = "Breached"
        elif risk_percentage >= 80:
            risk_level = "High"
        elif risk_percentage >= 50:
            risk_level = "Medium"
        else:
            risk_level = "Low"
            
        results.append({
            "ticket_id": r['id'],
            "short_id": r['short_id'],
            "alarm_id": r['alarm_uid'],
            "device_name": r['device_name'],
            "severity_original": r['severity'],
            "status": r['status'],
            "created_at": r['created_at'].isoformat() if r['created_at'] else None,
            "sla_limit": sla_limit,
            "elapsed_time": elapsed_time,
            "remaining_time": remaining_time,
            "risk_percentage": risk_percentage,
            "risk_level": risk_level,
            "sla_breached": elapsed_time >= sla_limit,
            "is_escalated": risk_percentage >= 85,
            "source_system": r['lnms_node_id']
        })
        
    return results
