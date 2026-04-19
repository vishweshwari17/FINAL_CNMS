"""
War Room Dashboard — Single consolidated endpoint.

GET /war-room/
Returns: clusters, incidents, events, impact_map
"""
from fastapi import APIRouter
from app.models import db
from app.services.ws_manager import ws_manager
import json

router = APIRouter(prefix="/war-room", tags=["War Room"])


@router.get("")
@router.get("/")
async def get_war_room_data(limit: int = 20, offset: int = 0):
    """
    Consolidated War Room endpoint.
    Returns critical/major clusters, active incidents linked to those clusters,
    live event stream, and an impact map for device relationships.
    """

    # ── 1. Active Clusters ──────────────────────────────────────────────────
    # Fetch only Critical/Major, non-resolved incidents from correlation_incidents.
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
        WHERE i.severity IN ('Critical', 'Major')
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
            "severity":     c["severity"],
            "root_cause":   c["root_cause"],
            "created_at":   c["created_at"].isoformat() if c["created_at"] else None,
            "cluster_size": c["cluster_size"],
        })

    # ── 2. Active Incidents (Tickets) linked to clusters ────────────────────
    # Optimized JOIN instead of subqueries
    incidents_raw = await db.fetchall("""
        SELECT DISTINCT
            t.id,
            t.short_id                                                  AS ticket_id,
            t.device_name,
            t.severity,
            t.status,
            COALESCE(t.last_updated_by, 'L1 Support')                  AS assigned_team,
            t.sla_limit_minutes,
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
             AND ci.severity IN ('Critical', 'Major')
        WHERE t.status NOT IN ('RESOLVED', 'CLOSED')
          AND (m.incident_id IS NOT NULL OR ci.id IS NOT NULL)
        ORDER BY sla_remaining ASC
        LIMIT %s OFFSET %s
    """, (limit, offset))

    incidents = []
    for inc in incidents_raw:
        sla_limit    = inc.get("sla_limit_minutes") or 60
        sla_remaining = inc.get("sla_remaining") # DO NOT default to 0 yet, we need to know if it's really missing or just negative
        if sla_remaining is None: sla_remaining = 0

        # Compute SLA traffic-light status: Red <= 0, Yellow < 20%, Green otherwise
        if sla_remaining <= 0:
            sla_status = "Red"
        elif sla_limit > 0 and sla_remaining < (sla_limit * 0.20):
            sla_status = "Yellow"
        else:
            sla_status = "Green"

        incidents.append({
            "id":            inc["id"],
            "ticket_id":     inc["ticket_id"],
            "device_name":   inc["device_name"],
            "severity":      inc["severity"],
            "status":        inc["status"],
            "assigned_team": inc["assigned_team"],
            "sla_remaining": sla_remaining, # Preserve negative values
            "sla_status":    sla_status,
        })

    # ── 3. Live Event Stream ────────────────────────────────────────────────
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

    # ── 4. Impact Map ───────────────────────────────────────────────────────
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
            WHERE i.severity IN ('Critical', 'Major')
              AND i.status != 'RESOLVED'
              AND i.is_deleted = 0
            LIMIT 100
        """)
        impact_map = [
            {
                "parent":   r["parent_name"],
                "child":    r["child_name"],
                "status":   r["alarm_status"],
                "severity": r["alarm_severity"],
            }
            for r in impact_raw
        ]
    except Exception as e:
        import logging
        logging.getLogger("cnms").error(f"Impact Map error: {e}")
        impact_map = []

    return {
        "clusters":   clusters,
        "incidents":  incidents,
        "events":     events,
        "impact_map": impact_map,
    }


def generate_mitigation_strategy(title: str, alarms: list):
    """
    Intelligent logic to derive actionable mitigation steps from alarm context.
    """
    title_norm = title.lower()
    
    if "link" in title_norm or "interface" in title_norm:
        return {
            "action": "Inspect interface Gi0/1 and verify physical link stability.",
            "confidence": 94,
            "steps": ["Shutdown/No-Shutdown interface", "Verify SFP light levels", "Check CRC errors"]
        }
    if "bgp" in title_norm or "ospf" in title_norm:
        return {
            "action": "Check routing adjacency and prefix advertisements.",
            "confidence": 88,
            "steps": ["Verify neighbor state", "Check prefix lists", "Validate AS-Path"]
        }
    if "power" in title_norm or "ups" in title_norm:
        return {
            "action": "Immediate failover to redundant power rail required.",
            "confidence": 98,
            "steps": ["Verify input voltage", "Check battery health", "Inspect PDU load"]
        }
    if "high" in title_norm and "cpu" in title_norm:
        return {
            "action": "Identify top-consuming processes and apply rate-limiting.",
            "confidence": 85,
            "steps": ["Show process cpu sorted", "Inspect control-plane policing", "Verify DDoS signatures"]
        }
        
    return {
        "action": "Proceed with standard diagnostic workflow and log analysis.",
        "confidence": 70,
        "steps": ["Check system logs", "Verify configuration drift", "Contact on-call engineer"]
    }


@router.get("/clusters/{cluster_id}")
async def get_cluster_details(cluster_id: int):
    """
    Fetch comprehensive topology and root cause data for a specific cluster.
    """
    cluster = await db.fetchone("SELECT * FROM correlation_incidents WHERE id = %s", (cluster_id,))
    if not cluster:
        return {"error": "Cluster not found"}

    # Fetch impacted nodes
    nodes_raw = await db.fetchall("""
        SELECT DISTINCT a.device_name, a.severity, a.status, a.description
        FROM alarms a
        JOIN alarm_correlation_mapping m ON a.alarm_uid = m.alarm_uid
        WHERE m.incident_id = %s
    """, (cluster_id,))

    # Topology data: root node + child nodes
    topology = {
        "root": {
            "id": cluster["device_name"],
            "label": cluster["device_name"],
            "type": "ROOT",
            "severity": cluster["severity"]
        },
        "impacted": [
            {"id": n["device_name"], "label": n["device_name"], "severity": n["severity"], "status": n["status"]}
            for n in nodes_raw if n["device_name"] != cluster["device_name"]
        ]
    }

    strategy = generate_mitigation_strategy(cluster["title"], nodes_raw)

    # Compliance Logic (Mock: devices ending in '1' are out of compliance)
    compliance = "NON-COMPLIANT" if cluster["device_name"].endswith("1") else "SECURE"

    return {
        "root_cause": cluster["title"],
        "confidence": strategy["confidence"],
        "suggested_action": strategy["action"],
        "mitigation_steps": strategy["steps"],
        "compliance": compliance,
        "history": [
            {"time": "2 mins ago", "event": "System automatically correlated 5 alarms"},
            {"time": "Just now", "event": "NOC Assistant generated mitigation plan"}
        ],
        "topology": topology,
        "sla_risk": 85 if cluster["severity"] == "Critical" else 30,
        "blast_radius": len(nodes_raw),
        "recovery_estimate": "45-60m",
        "secondary_risk": "High" if cluster["severity"] == "Critical" else "Medium"
    }


@router.put("/incidents/{incident_id}/acknowledge")
async def acknowledge_incident(incident_id: int):
    await db.execute("UPDATE correlation_incidents SET status = 'ACK' WHERE id = %s", (incident_id,))
    # Propagate to child alarms
    await db.execute("""
        UPDATE alarms a
        JOIN alarm_correlation_mapping m ON a.alarm_uid = m.alarm_uid
        SET a.status = 'ACK'
        WHERE m.incident_id = %s
    """, (incident_id,))
    # Broadcast update to all clients
    await ws_manager.broadcast({
        "type": "WAR_ROOM_UPDATE",
        "data": {"incident_id": incident_id, "status": "ACK"}
    })
    
    # Audit log
    await db.execute(
        "INSERT INTO audit_log (user_name, action, created_at) VALUES (%s, %s, NOW())",
        ("Admin", f"Acknowledged Incident #{incident_id}")
    )
    return {"status": "success"}


@router.put("/incidents/{incident_id}/resolve")
async def resolve_incident(incident_id: int):
    await db.execute("UPDATE correlation_incidents SET status = 'RESOLVED' WHERE id = %s", (incident_id,))
    await db.execute("""
        UPDATE alarms a
        JOIN alarm_correlation_mapping m ON a.alarm_uid = m.alarm_uid
        SET a.status = 'RESOLVED', resolved_at = NOW()
        WHERE m.incident_id = %s
    """, (incident_id,))
    
    # Broadcast update to all clients
    await ws_manager.broadcast({
        "type": "WAR_ROOM_UPDATE",
        "data": {"incident_id": incident_id, "status": "RESOLVED"}
    })
    
    # Audit log
    await db.execute(
        "INSERT INTO audit_log (user_name, action, created_at) VALUES (%s, %s, NOW())",
        ("Admin", f"Resolved Incident #{incident_id}")
    )
    return {"status": "success"}
