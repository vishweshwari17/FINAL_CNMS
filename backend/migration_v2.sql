-- Migration V2: Alarm Deduplication
-- Adds alarm_key and is_active to alarms table

USE cnms_db;

-- 1. Add columns
ALTER TABLE alarms ADD COLUMN alarm_key VARCHAR(255) AFTER alarm_uid;
ALTER TABLE alarms ADD COLUMN is_active TINYINT(1) DEFAULT 1 AFTER status;

-- 2. Populate alarm_key
UPDATE alarms 
SET alarm_key = CONCAT(COALESCE(CAST(device_id AS CHAR), device_name, 'unknown'), '_', alarm_type);

-- 3. Cleanup existing duplicates in 'Active' state
-- We keep only the most recent one as active
UPDATE alarms a
JOIN (
    SELECT MAX(id) as max_id, alarm_key
    FROM alarms
    WHERE status IN ('OPEN', 'ACK', 'ACTIVE')
    GROUP BY alarm_key
) b ON a.alarm_key = b.alarm_key 
SET a.is_active = IF(a.id = b.max_id, 1, 0),
    a.status = IF(a.id = b.max_id, a.status, 'RESOLVED');

-- 4. Ensure resolved/closed ones are inactive
UPDATE alarms SET is_active = 0 WHERE status IN ('RESOLVED', 'CLOSED');

-- 5. Add unique constraint (alarm_key + is_active)
-- Note: Multiple inactive alarms for the same key are allowed if we only include is_active in the unique key when it is 1?
-- Actually, the requirement said UNIQUE(alarm_key, is_active). 
-- This means you can have ONE active (1) and ONE inactive (0) for each key?
-- No, that's not right. If you have many resolved alarms, you'll have many (key, 0) records.
-- So the unique constraint should only apply when is_active = 1.
-- In MariaDB, we can use a filtered index (starting from 10.2+) or just a unique index on (alarm_key, is_active) 
-- but if we want multiple inactive ones, we might need a different approach.
-- However, the user explicitly asked for UNIQUE(alarm_key, is_active).
-- If we want multiple resolved ones, we'd need is_active to be something unique or NULL for resolved ones (since UNIQUE allows multiple NULLs in many DBs).
-- But MariaDB UNIQUE allows multiple NULLs. If is_active was NULL for resolved alarms...
-- Let's stick to what the user asked first, then adjust if it breaks multiple resolutions.
-- Actually, if we use TINYINT(1), we only have 1 and 0. 
-- Let's use: UNIQUE(alarm_key, is_active) WHERE is_active = 1 if possible, but standard SQL UNIQUE(alarm_key, is_active) will only allow ONE record with is_active=0 as well.
-- Better: Use a nullable column `active_token` that is 1 for active and NULL for inactive. 
-- UNIQUE(alarm_key, active_token) allows multiple (key, NULL).

ALTER TABLE alarms ADD COLUMN active_token TINYINT(1) NULL DEFAULT 1 AFTER is_active;
UPDATE alarms SET active_token = IF(is_active = 1, 1, NULL);
ALTER TABLE alarms ADD UNIQUE INDEX idx_unique_alarm_key_active (alarm_key, active_token);

-- We keep is_active for ease of use in queries as requested.
