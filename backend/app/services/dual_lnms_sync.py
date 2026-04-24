

# app/services/dual_lnms_sync.py
"""
Dual LNMS Sync Service
======================
- LNMS-1 (Local)   : reads lnms_db directly via Unix socket (same server)
- LNMS-2 (Company) : SSH into 192.78.10.111 → mysqldump → import into
                     cnms_db.company_mirror_alarms + company_mirror_tickets
                     → then syncs into cnms_db.alarms + tickets

No files modified on either LNMS server.
"""
import asyncio
import logging
import os
import subprocess
import tempfile
from datetime import datetime
from typing import Optional

import aiomysql

from app.models import db as database
from app.services.ticket_id import external_ticket_id, generate_ticket_id

log = logging.getLogger("cnms.dual_sync")

# ── Config ────────────────────────────────────────────────────────────────────
LOCAL_LNMS = {
    "node_id":   "LNMS-LOCAL-01",
    "label":     "Local LNMS",
    "unix_socket": "/var/lib/mysql/mysql.sock",
    "user":      os.getenv("LOCAL_LNMS_USER",   "lnms_user"),
    "password":  os.getenv("LOCAL_LNMS_PASS",   "user_123"),
    "db":        os.getenv("LOCAL_LNMS_DB",     "lnms_db"),
}

COMPANY_LNMS = {
    "node_id":   "LNMS-COMPANY-01",
    "label":     "Company LNMS",
    "ssh_host":  os.getenv("COMPANY_SSH_HOST",  "192.78.10.111"),
    "ssh_user":  os.getenv("COMPANY_SSH_USER",  "nms"),          # update if different
    "ssh_key":   os.getenv("COMPANY_SSH_KEY",   "/home/nms/.ssh/cnms_id_rsa"),
    "db_user":   os.getenv("COMPANY_DB_USER", "cnms_reader"),
    "db_pass":   os.getenv("COMPANY_DB_PASS", "cnms1234"),
    "db_name":   os.getenv("COMPANY_DB_NAME", "snmp_monitor"),
}

POLL_INTERVAL = int(os.getenv("LNMS_POLL_INTERVAL", "60"))

from app.services.ws_manager import ws_manager

# ── Severity normaliser ───────────────────────────────────────────────────────
SEV_MAP = {
    "critical": "Critical", "high": "Critical",
    "major":    "Major",
    "minor":    "Minor",    "low":  "Minor",
    "warning":  "Warning",  "warn": "Warning",
    "info":     "Info",     "ok":   "Info",
}

def norm_sev(raw: str) -> str:
    return SEV_MAP.get((raw or "").lower().strip(), "Warning")

# ── CNMS node registration ────────────────────────────────────────────────────
async def _register_node(node_id: str, label: str, ip: str, status: str):
    await database.execute(
        """INSERT INTO lnms_nodes
           (node_id, display_name, ip_address, port, location, status, tcp_live, last_seen)
           VALUES (%s,%s,%s,0,%s,%s,%s,NOW())
           ON DUPLICATE KEY UPDATE
             display_name=VALUES(display_name),
             status=VALUES(status),
             tcp_live=VALUES(tcp_live),
             last_seen=NOW()""",
        (node_id, label, ip, label, status, 1 if status == "CONNECTED" else 0),
    )

# ── Ticket creator ────────────────────────────────────────────────────────────
async def _ensure_ticket(node_id: str, alarm_uid: str, device: str,
                          host: str, ip: str, aname: str, severity: str, desc: str, alarm_source: str):
    exists = await database.fetchone(
        "SELECT id FROM tickets WHERE alarm_uid=%s", (alarm_uid,)
    )
    if exists:
        return

    from app.services.correlation_engine import correlate_incident, predict_priority
    
    ticket_uid = f"{node_id}-{alarm_uid}" # Namespaced global unique ID
    short_id = generate_ticket_id(created_at=datetime.utcnow())
    
    # Predict priority
    predicted_sev = predict_priority(severity)
    
    tid = await database.execute(
        """INSERT INTO tickets
           (short_id, ticket_uid, alarm_uid, lnms_node_id, device_name, title,
            severity, status, sla_minutes, description, created_at, updated_at,
            alarm_status, alarm_source, last_alarm_update)
           VALUES (%s,%s,%s,%s,%s,%s,%s,'OPEN',240,%s,NOW(),NOW(),'ACTIVE',%s,NOW())""",
        (short_id, ticket_uid, alarm_uid, node_id, device or host,
         f"[{predicted_sev}] {aname} on {device or host}", severity, desc or "", alarm_source),
    )
    
    # Correlate
    await correlate_incident(tid, alarm_uid, device or host, node_id)
    
    log.info(f"[SYNC] Ticket created: {short_id} (Internal: {ticket_uid}) ← {alarm_uid} [Prio: {predicted_sev}]")
    if ws_manager:
        await ws_manager.broadcast({
            "type":      "TICKET_NEW",
            "node_id":   node_id,
            "alarm_uid": alarm_uid,
            "device":    device or host,
            "severity":  severity,
        })

# ── Alarm upsert ─────────────────────────────────────────────────────────────
async def _upsert_alarm(node_id: str, alarm_uid: str, device: str, host: str,
                         ip: str, aname: str, severity: str, desc: str,
                         status: str, raised_at, resolved_at=None, alarm_source: str='LNMS'):
    # Ensure alarm_type is never null
    alarm_type = aname or device or host or "Unknown Alarm"

    # 1. Deduplication logic: Check for identical ACTIVE alarm from same source/device
    if status == "ACTIVE":
        dup = await database.fetchone("""
            SELECT alarm_uid FROM alarms 
            WHERE lnms_node_id = %s AND device_name = %s 
            AND alarm_type = %s AND status = 'ACTIVE'
            AND raised_at > NOW() - INTERVAL 1 HOUR
            LIMIT 1
        """, (node_id, device or host, alarm_type))
        if dup:
            log.info(f"[SYNC] Deduplicated alarm {alarm_type} on {device or host}")
            return

    existing = await database.fetchone(
        "SELECT id, status FROM alarms WHERE alarm_uid=%s", (alarm_uid,)
    )
    if not existing:
        await database.execute(
            """INSERT INTO alarms
               (alarm_uid, lnms_node_id, device_name, alarm_type,
                severity, status, description, raised_at, resolved_at)
               VALUES (%s,%s,%s,%s,%s,%s,%s,COALESCE(%s,NOW()),%s)""",
            (alarm_uid, node_id, device or host or "unknown", alarm_type,
             severity, status, desc or "", raised_at, resolved_at),
        )
        # Always ensure a ticket exists for every alarm we see
        await _ensure_ticket(node_id, alarm_uid, device, host, ip,
                              alarm_type, severity, desc, alarm_source)
        
        # 📣 Real-time WebSocket Broadcast
        if ws_manager:
            asyncio.create_task(ws_manager.broadcast({
                "type": "NEW_ALARM",
                "alarm": {
                    "alarm_uid": alarm_uid,
                    "device_name": device or host or "unknown",
                    "alarm_name": alarm_type,
                    "severity": severity,
                    "status": status,
                    "raised_at": str(raised_at)
                }
            }))

        # If it's already resolved, update the ticket status too
        if status == "RESOLVED":
            await database.execute(
                """UPDATE tickets SET status='CLOSED', alarm_status='Resolved by Source', last_alarm_update=NOW()
                   WHERE alarm_uid=%s AND status != 'CLOSED'""",
                (alarm_uid,)
            )
    else:
        if existing["status"] != status:
            if existing["status"] == 'ACK' and status == 'ACTIVE':
                pass # Keep ACK if source only reports ACTIVE
            else:
                await database.execute(
                    """UPDATE alarms SET status=%s, resolved_at=%s
                       WHERE alarm_uid=%s""",
                    (status, resolved_at, alarm_uid),
                )
            # Determine if we should update the ticket status
            # - If source is RESOLVED, we always CLOSE the CNMS ticket.
            # - If source is ACTIVE, we only update to OPEN if the CNMS ticket is not already ACK or CLOSED/RESOLVED.
            
            t_row = await database.fetchone("SELECT status FROM tickets WHERE alarm_uid=%s", (alarm_uid,))
            should_update_tkt = False
            tkt_status = 'OPEN'
            
            if status == 'RESOLVED':
                should_update_tkt = True
                tkt_status = 'CLOSED'
            else:
                # Source is ACTIVE/PROBLEM
                if t_row and t_row["status"] not in ('ACK', 'RESOLVED', 'CLOSED'):
                    should_update_tkt = True
                    tkt_status = 'OPEN'
            
            if should_update_tkt:
                attr = node_id if status == 'RESOLVED' else 'ACTIVE'
                await database.execute(
                    """UPDATE tickets SET status=%s, alarm_status=%s, last_alarm_update=NOW()
                       WHERE alarm_uid=%s AND status != %s""",
                    (tkt_status, attr, alarm_uid, tkt_status)
                )

# ═══════════════════════════════════════════════════════════════════════════════
# LNMS-1  LOCAL  (Unix socket — same server)
# ═══════════════════════════════════════════════════════════════════════════════
async def sync_local_lnms():
    cfg = LOCAL_LNMS
    try:
        conn = await aiomysql.connect(
            unix_socket = cfg["unix_socket"],
            user        = cfg["user"],
            password    = cfg["password"],
            db          = cfg["db"],
            cursorclass = aiomysql.DictCursor,
            autocommit  = True,
        )
    except Exception as e:
        log.error(f"[LOCAL] Cannot connect to lnms_db: {e}")
        await _register_node(cfg["node_id"], cfg["label"], "localhost", "DISCONNECTED")
        return

    await _register_node(cfg["node_id"], cfg["label"], "localhost", "CONNECTED")
    log.info("[LOCAL] Connected to lnms_db ✓")

    try:
        async with conn.cursor() as cur:
            # ── Alarms ──────────────────────────────────────────────────────
            await cur.execute(
                "SELECT * FROM alarms ORDER BY created_at DESC LIMIT 500"
            )
            alarms = await cur.fetchall()
            current_alarm_uids = set()
            for a in alarms:
                uid      = f"LOCAL-ALM-{a['alarm_id']}"
                current_alarm_uids.add(uid)
                status   = "ACTIVE" if str(a.get("status","")).lower() in ("active","1") else "RESOLVED"
                severity = norm_sev(a.get("severity",""))
                await _upsert_alarm(
                    node_id     = cfg["node_id"],
                    alarm_uid   = uid,
                    device      = a.get("device_name",""),
                    host        = a.get("host_name",""),
                    ip          = a.get("ip_address",""),
                    aname       = a.get("alarm_name","Alert"),
                    severity    = severity,
                    desc        = a.get("description",""),
                    status      = status,
                    raised_at   = a.get("problem_time") or a.get("created_at"),
                    resolved_at = a.get("resolved_time"),
                    alarm_source= 'LNMS'
                )

            # ── Tickets already in lnms_db → mirror into cnms tickets ───────
            await cur.execute(
                "SELECT * FROM tickets ORDER BY created_at DESC LIMIT 200"
            )
            lnms_tickets = await cur.fetchall()
            current_ticket_uids = set()
            for t in lnms_tickets:
                ticket_uid = external_ticket_id(
                    raw_ticket_id=t.get("ticket_id"),
                    created_at=t.get("created_at"),
                    fallback_at=t.get("updated_at"),
                    node_id=cfg["node_id"]
                )
                uid      = f"LOCAL-ALM-{t['alarm_id']}" if t.get("alarm_id") else f"LOCAL-TKT-{t['ticket_id']}"
                alarm_uid = uid
                current_ticket_uids.add(alarm_uid)
                sev = norm_sev(t.get("severity_calculated") or t.get("severity_original",""))
                st_raw = (t.get("status") or "Open").lower()
                st_map = {"open":"OPEN","ack":"ACK","acknowledged":"ACK","resolved":"RESOLVED",
                          "closed":"CLOSED","reopened":"OPEN"}
                status = st_map.get(st_raw, "OPEN")
                
                computed_alarm_status = 'ACTIVE'
                if status in ('CLOSED', 'RESOLVED'):
                    computed_alarm_status = cfg["node_id"]
                elif status == 'ACK':
                    computed_alarm_status = "Ack by LNMS"


                # For synced tickets, we use ticket_uid as a stable identifier.
                # Use ON DUPLICATE KEY UPDATE to handle race conditions or existing entries.
                new_short_id = generate_ticket_id(created_at=t.get("created_at"))
                await database.execute(
                    """INSERT INTO tickets
                       (short_id, ticket_uid, lnms_ticket_id, alarm_uid, lnms_node_id, device_name, title,
                        severity, status, sla_minutes, description, created_at, updated_at,
                        alarm_status, alarm_source, last_alarm_update)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,240,%s,%s,%s,%s,'LNMS',NOW())
                       ON DUPLICATE KEY UPDATE
                         lnms_ticket_id=VALUES(lnms_ticket_id),
                         lnms_node_id=VALUES(lnms_node_id),
                         device_name=VALUES(device_name),
                         title=VALUES(title),
                         severity=VALUES(severity),
                         description=VALUES(description),
                         updated_at=VALUES(updated_at),
                         alarm_status=VALUES(alarm_status),
                         alarm_source=VALUES(alarm_source),
                         last_alarm_update=NOW(),
                         status=IF(VALUES(status)='CLOSED', 'CLOSED', IF(status NOT IN ('ACK','RESOLVED','CLOSED'), VALUES(status), status))""",
                    (new_short_id, ticket_uid, t.get("ticket_id"), alarm_uid, cfg["node_id"],
                     t.get("device_name",""), t.get("title",""),
                     sev, status, t.get("description",""),
                     t.get("created_at"), t.get("updated_at"),
                     computed_alarm_status),
                )

            log.info(f"[LOCAL] Synced {len(alarms)} alarms, {len(lnms_tickets)} tickets")

            # Keep alarms in sync with ticket ACKs
            await database.execute(
                "UPDATE alarms a JOIN tickets t ON a.alarm_uid = t.alarm_uid SET a.status = 'ACK' WHERE t.status = 'ACK' AND a.status = 'ACTIVE'"
            )

            # Full deletion sync
            log.info(f"[LOCAL] Performing full deletion sync for {cfg['node_id']}...")
            await cur.execute("SELECT alarm_id FROM alarms")
            all_source_alarm_ids = await cur.fetchall()
            full_alarm_uids = {f"LOCAL-ALM-{a['alarm_id']}" for a in all_source_alarm_ids}
            
            await cur.execute("SELECT ticket_id, alarm_id FROM tickets")
            all_source_ticket_data = await cur.fetchall()
            full_ticket_uids = set()
            for t in all_source_ticket_data:
                # Same logic as above for ticket_uid/alarm_uid stability
                uid = f"LOCAL-ALM-{t['alarm_id']}" if t.get("alarm_id") else f"LOCAL-TKT-{t['ticket_id']}"
                full_ticket_uids.add(uid)

            poller = DualLNMSPoller()
            await poller._cleanup_deleted_data(cfg["node_id"], full_alarm_uids, "ALARM")
            await poller._cleanup_deleted_data(cfg["node_id"], full_ticket_uids, "TICKET")

            # ── Ticket Messages ──
            await _sync_messages(cfg["node_id"], conn, True)

        await database.execute(
            "INSERT INTO tcp_sync_log (lnms_node_id,direction,msg_type,status) VALUES (%s,'INBOUND','DB_POLL','SUCCESS')",
            (cfg["node_id"],),
        )
    except Exception as e:
        log.error(f"[LOCAL] Sync error: {e}")
    finally:
        conn.close()


# ═══════════════════════════════════════════════════════════════════════════════
# LNMS-2  COMPANY  (SSH tunnel → dump → import)
# ═══════════════════════════════════════════════════════════════════════════════
def _ssh_query(cfg: dict, sql: str) -> list:
    """Run a SQL query on company server via SSH, return list of dicts."""
    cmd = [
        "ssh",
        "-i", cfg["ssh_key"],
        "-o", "StrictHostKeyChecking=no",
        "-o", "ConnectTimeout=10",
        f"{cfg['ssh_user']}@{cfg['ssh_host']}",
        f"mariadb -u{cfg['db_user']} -p{cfg['db_pass']} {cfg['db_name']} -B -N -e \"{sql}\"",
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            log.error(f"[COMPANY] SSH query failed: {result.stderr[:200]}")
            return []
        rows = []
        lines = result.stdout.strip().splitlines()
        if not lines:
            return []
        # First line is column headers when not using -N, but we use -N so no headers
        # We pass column names manually per query
        return lines
    except Exception as e:
        log.error(f"[COMPANY] SSH query error: {e}")
        return []


def _ssh_query_dicts(cfg: dict, sql: str, columns: list) -> list:
    """Run SSH query and return list of dicts with given column names."""
    cmd = [
        "ssh",
        "-i", cfg["ssh_key"],
        "-o", "StrictHostKeyChecking=no",
        "-o", "ConnectTimeout=10",
        f"{cfg['ssh_user']}@{cfg['ssh_host']}",
        f'mariadb -u{cfg["db_user"]} -p{cfg["db_pass"]} {cfg["db_name"]} -B -e "SET time_zone = \'+05:30\'; {sql}"',
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            log.error(f"[COMPANY] Query failed: {result.stderr[:200]}")
            return None
        lines = result.stdout.strip().splitlines()
        if len(lines) < 2:
            return []
        # First line is headers
        headers = lines[0].split("\t")
        rows = []
        for line in lines[1:]:
            vals = line.split("\t")
            row = {}
            for i, h in enumerate(headers):
                row[h] = vals[i] if i < len(vals) else None
            rows.append(row)
        return rows
    except Exception as e:
        log.error(f"[COMPANY] SSH query error: {e}")
        return []


async def sync_company_lnms():
    cfg = COMPANY_LNMS

    # Test connectivity
    test = await asyncio.get_event_loop().run_in_executor(
        None, _ssh_query_dicts, cfg,
        "SELECT COUNT(*) as cnt FROM status_alarms", ["cnt"]
    )
    if not test:
        await _register_node(cfg["node_id"], cfg["label"], cfg["ssh_host"], "DISCONNECTED")
        return

    await _register_node(cfg["node_id"], cfg["label"], cfg["ssh_host"], "CONNECTED")
    log.info(f"[COMPANY] Connected via SSH ✓  alarms={test[0].get('cnt','?')}")

    alarms = await asyncio.get_event_loop().run_in_executor(
        None, _ssh_query_dicts, cfg,
        """SELECT s.id as alarm_id, d.hostname as host_name, s.device_name, d.ip_address, 
                  s.severity, s.alarm_type as alarm_name, s.alarm_type as description, 
                  s.start_time as problem_time, s.resolved_at as resolved_time, s.status 
           FROM status_alarms s 
           LEFT JOIN devices d ON s.device_id = d.id 
           ORDER BY s.id DESC LIMIT 500""",
        []
    )
    current_alarm_uids = set()
    for a in alarms:
        uid      = f"COMPANY-ALM-{a.get('alarm_id','')}"
        current_alarm_uids.add(uid)
        st_raw   = (a.get("status") or "").lower()
        status   = "RESOLVED" if st_raw in ("resolved","closed","0") else "ACTIVE"
        severity = norm_sev(a.get("severity",""))
        raised   = a.get("problem_time") if a.get("problem_time") not in (None,"NULL","") else None
        resolved = a.get("resolved_time") if a.get("resolved_time") not in (None,"NULL","") else None
        await _upsert_alarm(
            node_id     = cfg["node_id"],
            alarm_uid   = uid,
            device      = a.get("device_name",""),
            host        = a.get("host_name",""),
            ip          = a.get("ip_address",""),
            aname       = a.get("alarm_name","Unknown Alarm"),
            severity    = severity,
            desc        = a.get("description",""),
            status      = status,
            raised_at   = raised,
            resolved_at = resolved,
            alarm_source= 'SPIC-NMS'
        )

    # Fetch tickets
    tickets = await asyncio.get_event_loop().run_in_executor(
        None, _ssh_query_dicts, cfg,
        """SELECT t.ticket_id, t.alarm_id, t.title, s.device_name, d.ip_address, 
                  t.severity, t.status, t.description, t.created_at, t.updated_at 
           FROM tickets t 
           LEFT JOIN status_alarms s ON t.alarm_id = s.id 
           LEFT JOIN devices d ON s.device_id = d.id 
           ORDER BY t.created_at DESC LIMIT 200""",
        []
    )
    current_ticket_uids = set()
    for t in tickets:
        ticket_uid = external_ticket_id(
            raw_ticket_id=t.get("ticket_id"),
            created_at=t.get("created_at"),
            fallback_at=t.get("updated_at"),
            node_id=cfg["node_id"]
        )
        alarm_uid = f"COMPANY-ALM-{t['alarm_id']}" if t.get("alarm_id") and t["alarm_id"] != "NULL" else f"COMPANY-TKT-{t['ticket_id']}"
        current_ticket_uids.add(alarm_uid)
        sev    = norm_sev(t.get("severity_calculated") or t.get("severity_original") or t.get("severity",""))
        st_raw = (t.get("status") or "Open").lower()
        st_map = {"open":"OPEN","ack":"ACK","acknowledged":"ACK","acknowledged by central":"ACK","resolved":"RESOLVED","closed":"CLOSED","reopened":"OPEN"}
        status = st_map.get(st_raw, "OPEN")
        ca = t.get("created_at") if t.get("created_at") not in (None,"NULL","") else None
        ua = t.get("updated_at") if t.get("updated_at") not in (None,"NULL","") else None

        computed_alarm_status = 'ACTIVE'
        if status in ('CLOSED', 'RESOLVED'):
            computed_alarm_status = cfg["node_id"]
        elif status == 'ACK':
            computed_alarm_status = "Ack by SPIC-NMS"


        # Use ON DUPLICATE KEY UPDATE to handle race conditions or existing entries.
        new_short_id = generate_ticket_id(created_at=ca)
        await database.execute(
            """INSERT INTO tickets
               (short_id, ticket_uid, lnms_ticket_id, alarm_uid, lnms_node_id, device_name, title,
                severity, status, sla_minutes, description, created_at, updated_at,
                alarm_status, alarm_source, last_alarm_update)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,240,%s,%s,%s,%s,'SPIC-NMS',NOW())
               ON DUPLICATE KEY UPDATE
                 lnms_ticket_id=VALUES(lnms_ticket_id),
                 lnms_node_id=VALUES(lnms_node_id),
                 device_name=VALUES(device_name),
                 title=VALUES(title),
                 severity=VALUES(severity),
                 status=VALUES(status),
                 description=VALUES(description),
                 updated_at=VALUES(updated_at),
                 alarm_status=VALUES(alarm_status),
                 last_alarm_update=NOW()""",
            (new_short_id, ticket_uid, t.get("ticket_id"), alarm_uid, cfg["node_id"],
             t.get("device_name",""), t.get("title",""),
             sev, status, t.get("description",""), ca, ua,
             computed_alarm_status),
        )

    log.info(f"[COMPANY] Synced {len(alarms)} alarms, {len(tickets)} tickets")

    # Keep alarms in sync with ticket ACKs
    await database.execute(
        "UPDATE alarms a JOIN tickets t ON a.alarm_uid = t.alarm_uid SET a.status = 'ACK' WHERE t.status = 'ACK' AND a.status = 'ACTIVE'"
    )

    # Full deletion sync via SSH
    log.info(f"[COMPANY] Performing full deletion sync for {cfg['node_id']}...")
    
    # Fetch ALL alarm IDs from status_alarms
    all_alm_rows = await asyncio.get_event_loop().run_in_executor(
        None, _ssh_query_dicts, cfg, "SELECT id as alarm_id FROM status_alarms", []
    )
    # only cleanup if fetch was successful (not None)
    if all_alm_rows is not None:
        full_alarm_uids = {f"COMPANY-ALM-{a.get('alarm_id','')}" for a in all_alm_rows if a.get('alarm_id')}
        poller = DualLNMSPoller()
        await poller._cleanup_deleted_data(cfg["node_id"], full_alarm_uids, "ALARM")
    
    # Fetch ALL ticket/alarm mapping for stable UIDs
    all_tkt_rows = await asyncio.get_event_loop().run_in_executor(
        None, _ssh_query_dicts, cfg, "SELECT ticket_id, alarm_id FROM tickets", []
    )
    if all_tkt_rows is not None:
        full_ticket_uids = set()
        for t in all_tkt_rows:
            uid = f"COMPANY-ALM-{t['alarm_id']}" if t.get("alarm_id") and t["alarm_id"] != "NULL" else f"COMPANY-TKT-{t['ticket_id']}"
            full_ticket_uids.add(uid)

        poller = DualLNMSPoller()
        await poller._cleanup_deleted_data(cfg["node_id"], full_ticket_uids, "TICKET")

    # ── Ticket Messages ──
    await _sync_messages(cfg["node_id"], cfg, False)

    await database.execute(
        "INSERT INTO tcp_sync_log (lnms_node_id,direction,msg_type,status) VALUES (%s,'INBOUND','SSH_QUERY','SUCCESS')",
        (cfg["node_id"],),
    )


class DualLNMSPoller:
    def __init__(self):
        self._task: Optional[asyncio.Task] = None

    def start(self):
        self._task = asyncio.create_task(self._loop())
        log.info(f"[DualPoller] Started — interval {POLL_INTERVAL}s")

    async def stop(self):
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _loop(self):
        while True:
            try:
                log.info("[DualPoller] Sync cycle starting...")
                await asyncio.gather(
                    sync_local_lnms(),
                    sync_company_lnms(),
                    return_exceptions=True,
                )
                log.info("[DualPoller] Sync cycle complete.")
            except Exception as e:
                log.error(f"[DualPoller] Loop error: {e}")
            await asyncio.sleep(POLL_INTERVAL)

    async def _cleanup_deleted_data(self, node_id: str, current_uids: set, entity_type: str):
        """Delete CNMS data that no longer exists in the source node."""
        if current_uids is None:
            return
            
        table = "alarms" if entity_type == "ALARM" else "tickets"
        col = "alarm_uid" if entity_type == "ALARM" else "alarm_uid" # for tickets too
        
        # Fetch all UIDs in CNMS for this node
        rows = await database.fetchall(f"SELECT {col} FROM {table} WHERE lnms_node_id=%s", (node_id,))
        cnms_uids = {r[col] for r in rows}
        
        # Find UIDs to delete (in CNMS but NOT in source)
        to_delete = cnms_uids - current_uids
        if to_delete:
            # SANITY CHECK: prevent mass deletion if source returns empty/too few results
            if len(cnms_uids) > 10 and len(to_delete) > (len(cnms_uids) * 0.7):
                log.warning(f"[CLEANUP] Safety trigger: Skipping mass deletion of {len(to_delete)} {entity_type}s (Source returned too few items).")
                return

            log.info(f"[CLEANUP] Deleting {len(to_delete)} {entity_type}s from CNMS missing in {node_id}")
            for uid in to_delete:
                # Record deletion in audit log for "Ghost Ticket" detection
                try:
                    await database.execute(
                        "INSERT INTO audit_logs (user_name, action, entity_type, entity_id, created_at) VALUES (%s, %s, %s, %s, NOW())",
                        ("SYSTEM", f"Auto-deleted by Sync (Missing in {node_id})", entity_type, uid)
                    )
                except: pass

                if entity_type == "ALARM":
                    # Delete ticket first due to FK
                    await database.execute("DELETE FROM tickets WHERE alarm_uid=%s", (uid,))
                    await database.execute("DELETE FROM alarms WHERE alarm_uid=%s", (uid,))
                else:
                    await database.execute("DELETE FROM tickets WHERE alarm_uid=%s", (uid,))


async def push_status_to_source(node_id: str, ticket_uid: str, alarm_uid: str, status: str):
    """
    Push CNMS status back to the source LNMS/SPIC-NMS node.
    """
    st_map_rev = {
        "OPEN": "Open",
        "ACK": "Ack",
        "RESOLVED": "Resolved",
        "CLOSED": "Closed"
    }
    source_status = st_map_rev.get(status, "Open")
    
    # ── Status mapping for alarms ──
    # Local: active / resolved
    # Company: ACTIVE / RESOLVED / PROBLEM
    local_alm_st = "active" if status in ("OPEN", "ACK") else "resolved"
    company_alm_st = "ACTIVE" if status in ("OPEN", "ACK") else "RESOLVED"
    
    # 1. Update LNMS-LOCAL-01 (Direct DB)
    if node_id == LOCAL_LNMS["node_id"]:
        try:
            conn = await aiomysql.connect(
                unix_socket = LOCAL_LNMS["unix_socket"],
                user        = LOCAL_LNMS["user"],
                password    = LOCAL_LNMS["password"],
                db          = LOCAL_LNMS["db"],
                autocommit  = True
            )
            async with conn.cursor() as cur:
                # Update ticket
                # Extract original ticket_id (strip prefix if present)
                t_id = ticket_uid
                if "-" in ticket_uid:
                    # If it's a namespaced UID like LNMS-LOCAL-01-TKT-..., we need the raw ID
                    # But wait, external_ticket_id prepends node_id.
                    if ticket_uid.startswith(f"{node_id}-"):
                        t_id = ticket_uid[len(node_id)+1:]
                
                await cur.execute("UPDATE tickets SET status=%s, updated_at=NOW() WHERE ticket_id=%s", (source_status, t_id))
                
                # Update alarm
                if alarm_uid:
                    alarm_id = alarm_uid.split("-")[-1] if "-" in alarm_uid else alarm_uid
                    if alarm_id and alarm_id.isdigit():
                        await cur.execute("UPDATE alarms SET status=%s WHERE alarm_id=%s", (local_alm_st, alarm_id))
            conn.close()
            log.info(f"[PUSH] Synced status %s to Local LNMS for ticket %s", status, ticket_uid)
            return True
        except Exception as e:
            log.error(f"[PUSH] Local LNMS sync failed: {e}")
            return False

    # 2. Update LNMS-COMPANY-01 (SSH)
    elif node_id == COMPANY_LNMS["node_id"]:
        cfg = COMPANY_LNMS
        sql_parts = []
        
        # Map statuses for remote tickets (Open, Acknowledged, Closed, Acknowledged by Central, Closed by Central)
        remote_tkt_st = "Open"
        if status == "ACK":      remote_tkt_st = "Acknowledged by Central"
        elif status in ("RESOLVED", "CLOSED"): remote_tkt_st = "Closed by Central"
        
        # Map statuses for status_alarms (PROBLEM, RESOLVED, ACTIVE)
        remote_alm_st = "ACTIVE"
        if status in ("RESOLVED", "CLOSED"): remote_alm_st = "RESOLVED"
        
        # Update ticket
        # ticket_uid here might be "COMPANY-ALM-123" or "COMPANY-TKT-456"
        # We need the numeric ID part or preferably the lnms_ticket_id.
        # However, push_status_to_source currently gets ticket_uid.
        # Let's extract the number if possible.
        t_id = ticket_uid.split("-")[-1] if ticket_uid and "-" in ticket_uid else ticket_uid
        if t_id and t_id.isdigit():
            sql_parts.append(f"UPDATE tickets SET status='{remote_tkt_st}', updated_at=NOW() WHERE ticket_id={t_id};")
            
        # Update alarm
        a_id = alarm_uid.split("-")[-1] if alarm_uid and "-" in alarm_uid else alarm_uid
        if a_id and a_id.isdigit():
            sql_parts.append(f"UPDATE status_alarms SET status='{company_alm_st}', resolved_at=NOW() WHERE id={a_id};")
        
        if not sql_parts:
            return False
            
        full_sql = " ".join(sql_parts)
        cmd = [
            "ssh", "-i", cfg["ssh_key"], "-o", "StrictHostKeyChecking=no",
            f"{cfg['ssh_user']}@{cfg['ssh_host']}",
            f'mariadb -u{cfg["db_user"]} -p{cfg["db_pass"]} {cfg["db_name"]} -e "{full_sql}"'
        ]
        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            )
            if result.returncode == 0:
                log.info(f"[PUSH] Synced status %s to Company LNMS for ticket %s", status, ticket_uid)
                return True
            else:
                log.error(f"[PUSH] Company status sync failed: {result.stderr}")
                return False
        except Exception as e:
            log.error(f"[PUSH] Company status sync error: {e}")
            return False

    return False


async def push_message_to_source(node_id: str, ticket_uid: str, sender: str, message: str):
    """
    Push a comment from CNMS back to the source node.
    """
    # 1. Local LNMS
    if node_id == LOCAL_LNMS["node_id"]:
        try:
            conn = await aiomysql.connect(
                unix_socket = LOCAL_LNMS["unix_socket"],
                user        = LOCAL_LNMS["user"],
                password    = LOCAL_LNMS["password"],
                db          = LOCAL_LNMS["db"],
                autocommit  = True
            )
            async with conn.cursor() as cur:
                from app.models import db as database
                t = await database.fetchone("SELECT lnms_ticket_id FROM tickets WHERE ticket_uid=%s", (ticket_uid,))
                ltid = t["lnms_ticket_id"] if t else None
                
                if ltid:
                    await cur.execute(
                        "INSERT INTO ticket_messages (ticket_id, sender, message, created_at) VALUES (%s, %s, %s, NOW())",
                        (ltid, sender, message)
                    )
                    log.info(f"[PUSH-MSG] Sent message to Local LNMS for ticket {ticket_uid}")
            conn.close()
            return True
        except Exception as e:
            log.error(f"[PUSH-MSG] Local LNMS message push failed: {e}")
            return False

    # 2. Company LNMS
    elif node_id == COMPANY_LNMS["node_id"]:
        cfg = COMPANY_LNMS
        from app.models import db as database
        t = await database.fetchone("SELECT lnms_ticket_id FROM tickets WHERE ticket_uid=%s", (ticket_uid,))
        ltid = t["lnms_ticket_id"] if t else None
        
        if not ltid:
            return False
            
        safe_msg = message.replace("'", "''")
        sql = f"INSERT INTO ticket_messages (ticket_id, sender, message, created_at) VALUES ({ltid}, '{sender}', '{safe_msg}', NOW());"
        cmd = [
            "ssh", "-i", cfg["ssh_key"], "-o", "StrictHostKeyChecking=no",
            f"{cfg['ssh_user']}@{cfg['ssh_host']}",
            f'mariadb -u{cfg["db_user"]} -p{cfg["db_pass"]} {cfg["db_name"]} -e "{sql}"'
        ]
        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            )
            if result.returncode == 0:
                log.info(f"[PUSH-MSG] Sent message to Company LNMS for ticket {ticket_uid}")
                return True
            else:
                log.error(f"[PUSH-MSG] Company message push failed: {result.stderr}")
                return False
        except Exception as e:
            log.error(f"[PUSH-MSG] Company message push error: {e}")
            return False
            
    return False


async def _sync_messages(node_id: str, cfg_or_conn, is_local: bool):
    """
    Fetch new messages from the source node LNMS and insert into CNMS.
    """
    from app.models import db as database
    
    if is_local:
        # Local LNMS (cfg_or_conn is the aiomysql conn)
        async with cfg_or_conn.cursor() as cur:
            await cur.execute("SELECT id, ticket_id, sender, message, created_at FROM ticket_messages ORDER BY id DESC LIMIT 500")
            rows = await cur.fetchall()
    else:
        # Company LNMS (cfg_or_conn is the cfg dict)
        rows = await asyncio.get_event_loop().run_in_executor(
            None, _ssh_query_dicts, cfg_or_conn, 
            "SELECT id, ticket_id, sender, message, created_at FROM ticket_messages ORDER BY id DESC LIMIT 500",
            []
        )
        
    if not rows:
        return
    
    for r in rows:
        try:
            lnms_msg_id = r.get("id")
            ltid = r.get("ticket_id")
            sender = r.get("sender")
            msg = r.get("message")
            created = r.get("created_at")
            
            if sender == "CNMS":
                continue
                
            # Find local ticket
            t = await database.fetchone("SELECT id FROM tickets WHERE lnms_ticket_id=%s AND lnms_node_id=%s", (ltid, node_id))
            if not t:
                continue
                
            # Check if already synced
            exists = await database.fetchone(
                "SELECT id FROM ticket_messages WHERE lnms_node_id=%s AND lnms_msg_id=%s",
                (node_id, lnms_msg_id)
            )
            if exists:
                continue
                
            # Insert into CNMS
            await database.execute(
                """INSERT INTO ticket_messages (ticket_id, sender, msg_type, message, sent_at, lnms_node_id, lnms_msg_id)
                VALUES (%s, %s, 'COMMENT', %s, %s, %s, %s)""",
                (t["id"], sender, msg, created, node_id, lnms_msg_id)
            )
            log.info(f"[SYNC-MSG] Inbound message {lnms_msg_id} from {node_id} for ticket {ltid}")
        except Exception as e:
            log.error(f"Error syncing individual message: {e}")
