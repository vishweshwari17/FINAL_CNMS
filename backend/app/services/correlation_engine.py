# app/services/correlation_engine.py
import logging
from datetime import datetime, timedelta
from app.models import db

log = logging.getLogger("cnms.correlation")

async def correlate_incident(new_ticket_id: int, alarm_uid: str, device_name: str, lnms_node_id: str):
    """
    Search for existing open tickets on the same device or node within a 15-minute window.
    If found, link them (this is a simplified version of correlation).
    """
    try:
        # 1. Find potential related tickets
        # Criteria: exact same device_name, status != 'CLOSED', within last 15 mins
        window = datetime.utcnow() - timedelta(minutes=15)
        
        related = await db.fetchall(
            """SELECT id, title, alarm_uid FROM tickets 
               WHERE id != %s 
                 AND status != 'CLOSED'
                 AND device_name = %s
                 AND created_at >= %s
               ORDER BY id ASC""",
            (new_ticket_id, device_name, window)
        )
        
        if related:
            log.info(f"[CORRELATION] Ticket {new_ticket_id} matches {len(related)} existing tickets on {device_name}")
            
            # Use the oldest related ticket as the parent
            parent = related[0]
            corr_id = f"CORR-TKT-{parent['id']}"
            
            ids = [r["id"] for r in related]
            note = f"Linked to related incidents: {', '.join(map(str, ids))}"
            
            await db.execute(
                "UPDATE tickets SET description = CONCAT(description, %s) WHERE id = %s",
                (f"\n\n[AUTO-CORRELATION] {note}", new_ticket_id)
            )
            
            # Set the correlation_id for both the parent alarm and the new alarm
            await db.execute(
                "UPDATE alarms SET correlation_id = %s WHERE alarm_uid = %s OR alarm_uid = %s",
                (corr_id, alarm_uid, parent["alarm_uid"])
            )
            
            return True
            
    except Exception as e:
        log.error(f"[CORRELATION] Failed: {e}")
    
    return False

def predict_priority(severity: str, device_type: str = "Other") -> str:
    """
    Predict urgency based on severity and device criticality.
    """
    critical_devices = ["Router", "Switch", "Firewall", "Core"]
    
    if severity == "Critical":
        return "CRITICAL"
    if severity == "Major" and any(d in device_type for d in critical_devices):
        return "CRITICAL"
    if severity == "Major":
        return "HIGH"
    if severity == "Minor":
        return "MEDIUM"
        
    return "LOW"
