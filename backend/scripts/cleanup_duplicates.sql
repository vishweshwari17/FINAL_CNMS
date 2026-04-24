-- scripts/cleanup_duplicates.sql
-- Cleanup legacy nodes and duplicate alarms/tickets

USE cnms_db;

-- 1. Merging LNMS-SPIC-01 into LNMS-COMPANY-01
UPDATE alarms SET lnms_node_id = 'LNMS-COMPANY-01' WHERE lnms_node_id = 'LNMS-SPIC-01';
UPDATE tickets SET lnms_node_id = 'LNMS-COMPANY-01' WHERE lnms_node_id = 'LNMS-SPIC-01';
UPDATE devices SET lnms_node_id = 'LNMS-COMPANY-01' WHERE lnms_node_id = 'LNMS-SPIC-01';
DELETE FROM lnms_nodes WHERE node_id = 'LNMS-SPIC-01';

-- 2. Removing Zabbix data (as per "only collect data from lnms_db and snmp_monitor")
DELETE FROM tickets WHERE lnms_node_id = 'LNMS-ZBX-01';
DELETE FROM alarms WHERE lnms_node_id = 'LNMS-ZBX-01';
DELETE FROM devices WHERE lnms_node_id = 'LNMS-ZBX-01';
DELETE FROM lnms_nodes WHERE node_id = 'LNMS-ZBX-01';

-- 3. Remove EXACT duplicates (same alarm_uid) that might have slipped past if constraints were missing
-- (Though the schema says UNIQUE, better safe than sorry if there were periods without it)
-- Since alarm_uid is UNIQUE, this isn't strictly necessary for alarms table unless we dropped constraint.

-- 4. Identifying and removing logical duplicates across nodes
-- If the same alarm (by device_name and alarm_type and raised_at) exists from both LOCAL and COMPANY,
-- we might want to keep only one. However, the user didn't explicitly say how to choose.
-- Given the "rectify it" request, for now I will focus on the node consolidation and deletion sync.
-- The deletion sync which I just fixed will automatically remove anything that's NOT in the current source.
-- So if I deleted something in the source, it will be gone from CNMS.

-- 5. Cleanup tickets with no corresponding node (if any)
DELETE FROM tickets WHERE lnms_node_id NOT IN (SELECT node_id FROM lnms_nodes);
DELETE FROM alarms WHERE lnms_node_id NOT IN (SELECT node_id FROM lnms_nodes);

-- 6. Log cleanup
INSERT INTO audit_logs (user_name, action, details) 
VALUES ('Antigravity', 'Database cleanup: merged node LNMS-SPIC-01 and removed Zabbix data', '{"task_id": "deduplication"}');
