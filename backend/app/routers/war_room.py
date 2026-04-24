"""
War Room Dashboard — Single consolidated endpoint.

GET /war-room/
Returns: clusters, incidents, events, impact_map
"""
from fastapi import APIRouter
from app.models import db
from app.services.ws_manager import ws_manager
import json
from datetime import datetime, timedelta

router = APIRouter(prefix="/war-room", tags=["War Room"])


@router.get("")
@router.get("/")
async def get_war_room_data(limit: int = 20, offset: int = 0):
    """
    Consolidated War Room endpoint.
    Returns critical/major clusters, active incidents linked to those clusters,
    live event stream, and an impact map for device relationships.
    """
    clusters_raw = await db.fetchall("""
        SELECT
            i.id,
            i.incident_uid,
            i.device_name,
            i.severity,
            i.title         AS root_cause,
            i.created_at,
            COALESCE(m.cluster_size, 0) AS cluster_size
        FROM correlation_incidents i
        LEFT JOIN (
            SELECT incident_id, COUNT(*) AS cluster_size
            FROM alarm_correlation_mapping
            GROUP BY incident_id
        ) m ON m.incident_id = i.id
        WHERE UPPER(i.severity) IN ('CRITICAL', 'MAJOR')
          AND i.status != 'RESOLVED'
          AND i.is_deleted = 0
        ORDER BY i.created_at DESC
        LIMIT %s OFFSET %s
    """, (limit, offset))

    clusters = []
    for c in clusters_raw:
        clusters.append({
            "id":           c["id"],
            "incident_uid": c["incident_uid"],
            "device_name":  c["device_name"],
            "severity":     c["severity"].title() if c["severity"] else "Minor",
            "root_cause":   c["root_cause"],
            "created_at":   c["created_at"].isoformat() if c["created_at"] else None,
            "cluster_size": c["cluster_size"],
            "priority":     "P1" if c["severity"].upper() == "CRITICAL" else "P2",
            "duration":     "45m",
            "affected_node": c["device_name"]
        })

    incidents_raw = await db.fetchall("""
        SELECT DISTINCT
            t.id,
            t.short_id                                                  AS ticket_id,
            t.device_name,
            t.severity,
            t.status,
            COALESCE(t.last_updated_by, 'L1 Support')                  AS assigned_team,
            t.sla_limit_minutes,
            t.created_at,
            TIMESTAMPDIFF(
                MINUTE,
                NOW(),
                DATE_ADD(t.created_at, INTERVAL t.sla_limit_minutes MINUTE)
            )                                                           AS sla_remaining
        FROM tickets t
        LEFT JOIN alarm_correlation_mapping m ON t.alarm_uid = m.alarm_uid
        LEFT JOIN correlation_incidents ci ON t.device_name = ci.device_name 
             AND ci.is_deleted = 0 
             AND ci.status != 'RESOLVED'
             AND UPPER(ci.severity) IN ('CRITICAL', 'MAJOR')
        WHERE t.status NOT IN ('RESOLVED', 'CLOSED')
          AND (m.incident_id IS NOT NULL OR ci.id IS NOT NULL)
        ORDER BY sla_remaining ASC
        LIMIT %s OFFSET %s
    """, (limit, offset))

    incidents = []
    for inc in incidents_raw:
        sla_limit    = inc.get("sla_limit_minutes") or 60
        sla_remaining = inc.get("sla_remaining")
        if sla_remaining is None: sla_remaining = 0
        if sla_remaining <= 0:
            sla_status = "Critical"
        elif sla_limit > 0 and sla_remaining < (sla_limit * 0.20):
            sla_status = "Warning"
        else:
            sla_status = "Stable"

        incidents.append({
            "id":            inc["id"],
            "ticket_id":     inc["ticket_id"],
            "device_name":   inc["device_name"],
            "severity":      inc["severity"].title() if inc["severity"] else "Minor",
            "status":        inc["status"],
            "assigned_team": inc["assigned_team"],
            "sla_remaining": sla_remaining,
            "sla_status":    sla_status,
            "created_at":    inc["created_at"].isoformat() if inc["created_at"] else None
        })

    events_raw = await db.fetchall("""
        SELECT device_name, alarm_type, severity, raised_at, description
        FROM alarms
        ORDER BY raised_at DESC
        LIMIT 20
    """)
    events = [
        {
            "time":        row["raised_at"].isoformat() if row["raised_at"] else None,
            "message":     f"{row['device_name']} - {row['alarm_type']} ({row['severity']})",
            "device_name": row["device_name"],
            "alarm_type":  row["alarm_type"],
            "severity":    row["severity"],
            "description": row["description"],
            "raised_at":   row["raised_at"].isoformat() if row["raised_at"] else None,
        }
        for row in events_raw
    ]

    impact_map = []
    try:
        impact_raw = await db.fetchall("""
            SELECT
                i.device_name   AS parent_name,
                a.device_name   AS child_name,
                a.status        AS alarm_status,
                a.severity      AS alarm_severity
            FROM correlation_incidents i
            JOIN alarm_correlation_mapping m ON m.incident_id = i.id
            JOIN alarms a ON a.alarm_uid = m.alarm_uid
            WHERE UPPER(i.severity) IN ('CRITICAL', 'MAJOR')
              AND i.status != 'RESOLVED'
              AND i.is_deleted = 0
            LIMIT 100
        """)
        impact_map = [
            {
                "parent":   r["parent_name"],
                "child":    r["child_name"],
                "status":   r["alarm_status"],
                "severity": r["alarm_severity"].title() if r["alarm_severity"] else "Minor",
            }
            for r in impact_raw
        ]
    except Exception as e:
        impact_map = []

    return {
        "clusters":   clusters,
        "incidents":  incidents,
        "events":     events,
        "impact_map": impact_map,
    }


def calculate_sla(cluster):
    """Calculates SLA metrics based on creation time."""
    start_time = cluster["created_at"]
    target_min = 60
    elapsed_td = datetime.now() - start_time
    elapsed_min = int(elapsed_td.total_seconds() / 60)
    remaining_min = target_min - elapsed_min
    
    status = "NOMINAL"
    if remaining_min < 15: status = "AT RISK"
    if remaining_min <= 0: status = "BREACHED"
    
    return {
        "status": status,
        "target": f"{target_min} Min",
        "elapsed": f"{elapsed_min//60:02d}:{elapsed_min%60:02d}:00",
        "remaining": remaining_min
    }


@router.get("/clusters/{cluster_id}")
async def get_cluster_details(cluster_id: int):
    """Enhanced cluster details for War Room deep analysis"""
    cluster = await db.fetchone("SELECT * FROM correlation_incidents WHERE id = %s", (cluster_id,))
    if not cluster:
        return {"error": "Incident not found"}

    # Fetch alarms for timeline and correlation
    alarms = await db.fetchall("""
        SELECT 
            a.raised_at AS timestamp,
            a.severity,
            a.device_name AS device,
            a.alarm_type AS alarm,
            a.alarm_type AS type,
            a.description,
            CASE 
                WHEN a.device_name = %s THEN 'ROOT CAUSE'
                ELSE 'IMPACT'
            END AS status
        FROM alarms a
        JOIN alarm_correlation_mapping m ON a.alarm_uid = m.alarm_uid
        WHERE m.incident_id = %s
        ORDER BY a.raised_at ASC
    """, (cluster["device_name"], cluster_id))

    if not alarms:
        return {"error": "No telemetry found"}

    # 1. Incident Summary
    incident_data = {
        "id": cluster["incident_uid"],
        "status": cluster["status"].upper(),
        "severity": cluster["severity"].upper(),
        "category": "Network",
        "subCategory": "L2 - Broadcast",
        "reportedBy": "System",
        "lastUpdated": cluster["updated_at"].strftime("%I:%M:%S %p") if cluster["updated_at"] else "N/A",
        "startedAt": cluster["created_at"].strftime("%d %b %Y, %I:%M:%S %p"),
        "affectedDevices": len(set(a["device"] for a in alarms)),
        "affectedAlarms": len(alarms),
        "linkedIncidents": 3
    }

    # 2. Root Cause
    root_cause = {
        "deviceId": cluster["device_name"],
        "deviceType": "Core Switch",
        "ipAddress": "10.10.10.1",
        "issue": cluster["title"],
        "severity": cluster["severity"].upper(),
        "firstSeen": cluster["created_at"].strftime("%d %b %Y, %I:%M:%S %p"),
        "confidence": 92,
        "category": "Layer 2 / Broadcast",
        "description": "Excessive broadcast traffic detected on CORE-SW-01 causing high CPU and network degradation.",
        "rootCauseScore": 92
    }

    # 3. Propagation Timeline
    timeline = []
    for i, a in enumerate(alarms[:5]): # Top 5 for the visual timeline
        timeline.append({
            "timestamp": a["timestamp"].strftime("%I:%M:%S %p"),
            "deviceId": a["device"],
            "issue": a["alarm"],
            "severity": a["severity"].upper(),
            "icon": "grid" if i == 0 else "alert"
        })

    # 4. Correlated Alarms (Serialized)
    correlated_alarms = []
    for a in alarms:
        correlated_alarms.append({
            "timestamp": a["timestamp"].strftime("%I:%M:%S %p"),
            "severity": a["severity"].upper(),
            "device": a["device"],
            "alarm": a["alarm"],
            "type": a["type"] or "L2",
            "status": a["status"]
        })

    # 5. Topology
    impacted_nodes = []
    for a in list(set(a["device"] for a in alarms)):
        if a != cluster["device_name"]:
            impacted_nodes.append({
                "deviceId": a,
                "label": a,
                "type": "IMPACTED",
                "status": "Warning",
                "severity": "MINOR",
                "connectionType": "critical_path"
            })
    
    topology = {
        "root": {
            "deviceId": cluster["device_name"],
            "label": cluster["device_name"],
            "type": "ROOT",
            "status": "Root Cause",
            "icon": "switch"
        },
        "impacted": impacted_nodes
    }

    # 6. Insights
    insights = {
        "rootCauseType": "Infrastructure",
        "failureDomain": "CORE NETWORK",
        "primaryImpact": "Multiple Segments",
        "blastRadius": incident_data["affectedDevices"],
        "servicesAffected": 7,
        "correlationScore": 92,
        "patternMatched": "Broadcast Storm"
    }

    # 7. SLA
    sla = calculate_sla(cluster)

    # 8. Notes
    notes_raw = await db.fetchall("""
        SELECT user_name, action, created_at 
        FROM audit_log 
        WHERE action LIKE %s 
        ORDER BY created_at DESC LIMIT 5
    """, (f"%Incident #{cluster_id}%",))
    
    notes = []
    for i, n in enumerate(notes_raw or []):
        notes.append({
            "id": i,
            "user": n["user_name"],
            "avatar": n["user_name"][:2].upper(),
            "timestamp": n["created_at"].strftime("%I:%M:%S %p"),
            "content": n["action"]
        })

    return {
        "incident": incident_data,
        "rootCause": root_cause,
        "propagationTimeline": timeline,
        "correlatedAlarms": correlated_alarms,
        "topology": topology,
        "insights": insights,
        "sla": sla,
        "notes": notes
    }


@router.put("/incidents/{incident_id}/acknowledge")
async def acknowledge_incident(incident_id: int):
    # 1. Update Incident Status
    await db.execute("UPDATE correlation_incidents SET status = 'ACK' WHERE id = %s", (incident_id,))
    
    # 2. Update Alarms Status
    await db.execute("""
        UPDATE alarms a
        JOIN alarm_correlation_mapping m ON a.alarm_uid = m.alarm_uid
        SET a.status = 'ACK'
        WHERE m.incident_id = %s
    """, (incident_id,))

    # 3. Update associated Tickets and Push to Source
    tickets = await db.fetchall("""
        SELECT t.* FROM tickets t
        JOIN alarm_correlation_mapping m ON t.alarm_uid = m.alarm_uid
        WHERE m.incident_id = %s
    """, (incident_id,))

    from app.services.dual_lnms_sync import push_status_to_source
    
    for tkt in tickets:
        await db.execute("UPDATE tickets SET status = 'ACK' WHERE id = %s", (tkt["id"],))
        # Sync to LNMS
        t_ref = tkt.get("lnms_ticket_id") or tkt.get("ticket_uid")
        await push_status_to_source(tkt["lnms_node_id"], t_ref, tkt["alarm_uid"], "ACK")

    await ws_manager.broadcast({
        "type": "WAR_ROOM_UPDATE",
        "data": {"incident_id": incident_id, "status": "ACK"}
    })
    
    await db.execute(
        "INSERT INTO audit_log (user_name, action, created_at) VALUES (%s, %s, NOW())",
        ("Admin", f"Acknowledged Incident #{incident_id} and synced {len(tickets)} tickets")
    )
    return {"status": "success", "synced_tickets": len(tickets)}


@router.put("/incidents/{incident_id}/resolve")
async def resolve_incident(incident_id: int):
    # 1. Update Incident Status
    await db.execute("UPDATE correlation_incidents SET status = 'RESOLVED' WHERE id = %s", (incident_id,))
    
    # 2. Update Alarms Status
    await db.execute("""
        UPDATE alarms a
        JOIN alarm_correlation_mapping m ON a.alarm_uid = m.alarm_uid
        SET a.status = 'RESOLVED', resolved_at = NOW()
        WHERE m.incident_id = %s
    """, (incident_id,))

    # 3. Update associated Tickets and Push to Source
    tickets = await db.fetchall("""
        SELECT t.* FROM tickets t
        JOIN alarm_correlation_mapping m ON t.alarm_uid = m.alarm_uid
        WHERE m.incident_id = %s
    """, (incident_id,))

    from app.services.dual_lnms_sync import push_status_to_source
    
    for tkt in tickets:
        await db.execute("""
            UPDATE tickets SET status = 'RESOLVED', resolved_at = NOW() 
            WHERE id = %s
        """, (tkt["id"],))
        # Sync to LNMS
        t_ref = tkt.get("lnms_ticket_id") or tkt.get("ticket_uid")
        await push_status_to_source(tkt["lnms_node_id"], t_ref, tkt["alarm_uid"], "RESOLVED")

    await ws_manager.broadcast({
        "type": "WAR_ROOM_UPDATE",
        "data": {"incident_id": incident_id, "status": "RESOLVED"}
    })
    
    await db.execute(
        "INSERT INTO audit_log (user_name, action, created_at) VALUES (%s, %s, NOW())",
        ("Admin", f"Resolved Incident #{incident_id} and synced {len(tickets)} tickets")
    )
    return {"status": "success", "synced_tickets": len(tickets)}
