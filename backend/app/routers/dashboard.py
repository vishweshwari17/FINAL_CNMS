# app/routers/dashboard.py
"""
GET /dashboard/stats

Frontend reads:
  stats.tickets            → {Open, ACK, Closed}
  stats.alarms             → {Active, Resolved}
  stats.alarms_by_severity → {Critical, Major, Minor, Warning, Info}
  stats.tickets_by_lnms    → {"LNMS-MUM-01": 4, ...}
  stats.tcp_messages_today → int
"""
from fastapi import APIRouter
from app.models import db
from app.schemas import DashboardStats, IncidentStats

router = APIRouter(tags=["Dashboard"])

@router.get("/tcp-log")
async def get_tcp_logs(limit: int = 50):
    logs = await db.fetchall(
        "SELECT id, lnms_node_id, direction, msg_type, status, created_at FROM tcp_sync_log ORDER BY id DESC LIMIT %s",
        (limit,)
    )
    return logs


@router.get("/dashboard/stats", response_model=DashboardStats)
async def dashboard_stats():
    # Ticket counts — seed all statuses at 0 so Pydantic never sees missing keys
    tickets: dict = {"OPEN": 0, "ACK": 0, "RESOLVED": 0, "CLOSED": 0}
    for r in await db.fetchall("SELECT status, COUNT(*) AS c FROM tickets GROUP BY status"):
        tickets[r["status"].upper()] = r["c"]

    # Alarm counts
    alarms: dict = {"ACTIVE": 0, "RESOLVED": 0}
    for r in await db.fetchall("SELECT status, COUNT(*) AS c FROM alarms GROUP BY status"):
        alarms[r["status"].upper()] = r["c"]

    # Active alarms by severity
    alarms_by_severity: dict = {
        "Critical": 0, "Major": 0, "Minor": 0, "Warning": 0, "Info": 0
    }
    for r in await db.fetchall(
        "SELECT severity, COUNT(*) AS c FROM alarms WHERE status='ACTIVE' GROUP BY severity"
    ):
        alarms_by_severity[r["severity"]] = r["c"]

    # Tickets grouped by LNMS node
    tickets_by_lnms: dict = {}
    for r in await db.fetchall(
        "SELECT lnms_node_id, COUNT(*) AS c FROM tickets GROUP BY lnms_node_id"
    ):
        tickets_by_lnms[r["lnms_node_id"]] = r["c"]

    # TCP messages sent today
    tcp_row = await db.fetchone(
        "SELECT COUNT(*) AS c FROM tcp_sync_log WHERE DATE(created_at) = CURDATE()"
    )
    tcp_today = tcp_row["c"] if tcp_row else 0

    # SLA Compliance
    sla_rows = await db.fetchall("SELECT sla_status, COUNT(*) as c FROM tickets GROUP BY sla_status")
    total_t = sum(r["c"] for r in sla_rows)
    on_time = next((r["c"] for r in sla_rows if r["sla_status"] == 'ON_TIME'), 0)
    sla_perc = round((on_time / total_t * 100), 1) if total_t > 0 else 100.0

    # Operator Workload (Active tickets per node)
    workload: dict = {}
    for r in await db.fetchall(
        "SELECT lnms_node_id, COUNT(*) AS c FROM tickets WHERE status IN ('OPEN','ACK') GROUP BY lnms_node_id"
    ):
        workload[r["lnms_node_id"]] = r["c"]

    # Priority Distribution (Calculated urgency)
    prio: dict = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    # Simple logic: merge ticket severity into 4 buckets
    for r in await db.fetchall("SELECT severity, COUNT(*) as c FROM tickets WHERE status != 'CLOSED' GROUP BY severity"):
        s = r["severity"]
        if s == "Critical": prio["Critical"] += r["c"]
        elif s == "Major":   prio["High"]     += r["c"]
        elif s == "Minor":   prio["Medium"]   += r["c"]
        else:                prio["Low"]      += r["c"]

    return DashboardStats(
        tickets=tickets,
        alarms=alarms,
        alarms_by_severity=alarms_by_severity,
        tickets_by_lnms=tickets_by_lnms,
        tcp_messages_today=tcp_today,
        sla_compliance_perc=sla_perc,
        operator_workload=workload,
        priority_distribution=prio
    )

@router.get("/dashboard/incident-stats", response_model=IncidentStats)
async def get_incident_stats():
    try:
        # Basic counts from correlation_incidents
        counts = await db.fetchone("""
            SELECT 
                COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as open_i,
                COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as res_i,
                COUNT(CASE WHEN severity = 'Critical' AND status = 'OPEN' THEN 1 END) as crit_i
            FROM correlation_incidents
        """)

        open_i = (counts["open_i"] or 0) if counts else 0
        res_i  = (counts["res_i"]  or 0) if counts else 0
        crit_i = (counts["crit_i"] or 0) if counts else 0

        # Severity distribution
        severity_dist: dict = {"Critical": 0, "Major": 0, "Minor": 0, "Info": 0}
        rows = await db.fetchall(
            "SELECT severity, COUNT(*) as c FROM correlation_incidents GROUP BY severity"
        )
        for r in rows:
            sev = r.get("severity") or "Info"
            if sev in severity_dist:
                severity_dist[sev] = r["c"]

        # Trend (last 7 days)
        trend = await db.fetchall("""
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM correlation_incidents 
            WHERE created_at > NOW() - INTERVAL 7 DAY
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        """)

        return {
            "open_incidents":       open_i,
            "resolved_incidents":   res_i,
            "critical_incidents":   crit_i,
            "incidents_by_severity": severity_dist,
            "incidents_trend": [
                {"date": str(r["date"]), "count": str(r["count"])}
                for r in trend
            ],
        }

    except Exception:
        # Table may not exist yet — return safe zero state
        return {
            "open_incidents":       0,
            "resolved_incidents":   0,
            "critical_incidents":   0,
            "incidents_by_severity": {"Critical": 0, "Major": 0, "Minor": 0, "Info": 0},
            "incidents_trend": [],
        }