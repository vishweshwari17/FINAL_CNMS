# app/routers/alarms.py
"""
GET /alarms?status=&lnms_node_id=&severity=
Frontend reads: id, alarm_uid, lnms_node_id, device_name,
                alarm_type, severity, status, raised_at
"""
from typing import List, Optional
from fastapi import APIRouter, Query
from app.models import db
from app.schemas import Alarm

router = APIRouter(tags=["Alarms"])


@router.get("/alarms", response_model=List[Alarm])
async def get_alarms(
    status:       Optional[str] = Query(None),
    lnms_node_id: Optional[str] = Query(None),
    severity:     Optional[str] = Query(None),
    device_name:  Optional[str] = Query(None),
    start_date:   Optional[str] = Query(None),
    end_date:     Optional[str] = Query(None),
    is_correlated:Optional[bool] = Query(None),
):
    where, args = ["1=1"], []
    if status == "Active":
<<<<<<< HEAD
        where.append("status IN ('OPEN', 'ACK', 'ACTIVE') AND is_active = 1")
=======
        where.append("status IN ('OPEN', 'ACK', 'ACTIVE')")
>>>>>>> c479efac988271e703a2f56f5bee5c6883f6234c
    elif status == "Resolved":
        where.append("status IN ('RESOLVED', 'CLOSED')")
    elif status and status != "All":
        where.append("status=%s"); args.append(status)
    if lnms_node_id and lnms_node_id != "ALL":
        where.append("lnms_node_id=%s"); args.append(lnms_node_id)
    if severity and severity != "All":
        where.append("severity=%s"); args.append(severity)
    if device_name:
        where.append("device_name LIKE %s"); args.append(f"%{device_name}%")
    if start_date:
        where.append("raised_at >= %s"); args.append(start_date)
    if end_date:
        where.append("raised_at <= %s"); args.append(end_date)
    if is_correlated:
        where.append("correlation_id IS NOT NULL")

    sql = f"""
        SELECT id, alarm_uid, lnms_node_id, device_name, alarm_type,
               severity, status, raised_at, resolved_at
        FROM   alarms
        WHERE  {' AND '.join(where)}
        ORDER  BY raised_at DESC
        LIMIT  500
    """
    return await db.fetchall(sql, tuple(args))