from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from app.models import db
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/incidents", tags=["Incidents"])

# Request model for creating a new incident
class IncidentCreate(BaseModel):
    incident_uid: str
    device_name: str
    main_anomaly: str
    severity: str
    impact: str
    title: Optional[str] = None

class IncidentResponse(BaseModel):
    id: int
    incident_uid: str
    title: str
    severity: str
    status: str
    device_name: str
    created_at: datetime
    child_alarms_count: int

# POST endpoint to insert a new correlated incident
@router.post("/", response_model=dict)
async def create_incident(incident: IncidentCreate):
    """
    Insert a new correlated incident into the database.
    """
    query = """
        INSERT INTO correlation_incidents (incident_uid, device_name, main_anomaly, severity, impact, title, status, created_at, is_deleted)
        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), 0)
        RETURNING id
    """
    # Default status to OPEN, title to main_anomaly if not provided
    status = "OPEN"
    title = incident.title or incident.main_anomaly
    params = [
        incident.incident_uid,
        incident.device_name,
        incident.main_anomaly,
        incident.severity,
        incident.impact,
        title,
        status
    ]
    res = await db.fetchone(query, params)
    return {"id": res["id"], "status": "created"}

@router.get("", response_model=dict)
@router.get("/", response_model=dict)
async def get_incidents(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    severity: Optional[str] = None,
    status: Optional[str] = None,
    device_name: Optional[str] = None
):
    """
    Fetch correlated incidents with pagination and filtering.
    """
    query = """
        SELECT i.*, 
               (SELECT COUNT(*) FROM alarm_correlation_mapping WHERE incident_id = i.id) as child_alarms_count
        FROM correlation_incidents i
        WHERE is_deleted = 0
    """
    params = []

    if severity:
        query += " AND UPPER(i.severity) = UPPER(%s)"
        params.append(severity)
    if status:
        query += " AND UPPER(i.status) = UPPER(%s)"
        params.append(status)
    if device_name:
        query += " AND i.device_name LIKE %s"
        params.append(f"%{device_name}%")

    # Get total count for pagination metadata
    count_query = f"SELECT COUNT(*) as total FROM ({query}) as sub"
    total_res = await db.fetchone(count_query, params)
    total = total_res['total'] if total_res else 0

    # Add sorting and pagination
    query += " ORDER BY i.created_at DESC LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    items = await db.fetchall(query, params)
    
    # Normalize severity in output
    for item in items:
        if item.get("severity"):
            item["severity"] = item["severity"].title()
    
    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.get("/{incident_id}/alarms")
async def get_incident_alarms(incident_id: int):
    """
    Fetch all raw alarms mapping to a specific incident.
    """
    alarms = await db.fetchall("""
        SELECT a.*, m.is_root_cause
        FROM alarms a
        JOIN alarm_correlation_mapping m ON a.alarm_uid = m.alarm_uid
        WHERE m.incident_id = %s
        ORDER BY a.raised_at ASC
    """, (incident_id,))
    
    return alarms

@router.put("/{incident_id}/status")
async def update_incident_status(incident_id: int, status: str):
    """
    Update incident status and propagate to child alarms if needed.
    """
    await db.execute("UPDATE correlation_incidents SET status = %s WHERE id = %s", (status, incident_id))
    return {"status": "success"}
