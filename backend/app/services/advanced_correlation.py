import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from app.models import db

log = logging.getLogger("cnms.correlation")

async def run_correlation_cycle():
    """
    Periodically called to process unassigned alarms and group them into incidents.
    """
    try:
        # 1. Fetch active rules
        rules = await db.fetchall("SELECT * FROM correlation_rules WHERE active = 1")
        if not rules:
            return

        # 2. Fetch raw alarms that haven't been correlated yet or are still 'OPEN/ACTIVE'
        # For simplicity, we process alarms from the last 1 hour that don't have a mapping
        alarms = await db.fetchall("""
            SELECT * FROM alarms 
            WHERE (correlation_id IS NULL OR correlation_id = '')
            AND raised_at > NOW() - INTERVAL 1 HOUR
            ORDER BY raised_at ASC
        """)
        
        if not alarms:
            return

        log.info(f"[Correlation] Processing {len(alarms)} unassigned alarms...")

        for rule in rules:
            await apply_rule(rule, alarms)

    except Exception as e:
        log.error(f"[Correlation] Cycle failed: {e}")

async def apply_rule(rule, alarms):
    """
    Groups alarms based on a specific rule.
    """
    window = rule['time_window_seconds']
    
    # Simple strategy: Group by device_name
    # In a real production system, this would be more complex (interface, event type)
    groups = {}
    for a in alarms:
        key = a['device_name'] if rule['match_device'] else 'ALL'
        if key not in groups:
            groups[key] = []
        groups[key].append(a)

    for device_name, member_alarms in groups.items():
        if len(member_alarms) < 2:
            continue # Needs at least 2 to correlate for now, or we just create an incident anyway?
            # Usually, every alarm should belong to an incident (potentially 1-to-1)
        
        # Check if an existing 'OPEN' incident exists for this device within the time window
        latest_alarm_time = max(a['raised_at'] for a in member_alarms)
        
        # Look for existing incident
        existing = await db.fetchone("""
            SELECT id, incident_uid FROM correlation_incidents 
            WHERE device_name = %s AND status = 'OPEN'
            AND created_at > %s - INTERVAL %s SECOND
            LIMIT 1
        """, (device_name, latest_alarm_time, window))

        if existing:
            incident_id = existing['id']
            incident_uid = existing['incident_uid']
        else:
            # Create new incident
            incident_uid = f"INC-{uuid.uuid4().hex[:8].upper()}"
            root_cause = member_alarms[0] # Earliest is root cause
            
            res = await db.execute("""
                INSERT INTO correlation_incidents (incident_uid, title, root_cause_alarm_uid, severity, device_name)
                VALUES (%s, %s, %s, %s, %s)
            """, (incident_uid, f"Grouped Alarms for {device_name}", root_cause['alarm_uid'], root_cause['severity'], device_name))
            incident_id = res
            log.info(f"[Correlation] Created NEW incident {incident_uid} for {device_name}")

        # Map alarms to this incident
        for a in member_alarms:
            # Update alarm with correlation_id
            await db.execute("UPDATE alarms SET correlation_id = %s WHERE id = %s", (incident_uid, a['id']))
            # Insert mapping
            await db.execute("""
                INSERT IGNORE INTO alarm_correlation_mapping (incident_id, alarm_uid, is_root_cause)
                VALUES (%s, %s, %s)
            """, (incident_id, a['alarm_uid'], (a['alarm_uid'] == member_alarms[0]['alarm_uid'])))
            
    log.info(f"[Correlation] Rule '{rule['rule_name']}' processing complete.")
