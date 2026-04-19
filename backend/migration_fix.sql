USE cnms_db;

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL,
  hashed_password VARCHAR(255) NOT NULL,
  INDEX idx_username (username),
  INDEX idx_email (email)
);

-- Insert a default user
INSERT IGNORE INTO users (username, email, role, hashed_password) VALUES
('admin', 'admin@example.com', 'Admin', 'defaultpassword'),
('engineer', 'engineer@example.com', 'Engineer', 'defaultpassword');

-- 2. Create Correlation Incidents Table (Missing from initial schema)
CREATE TABLE IF NOT EXISTS correlation_incidents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  incident_uid VARCHAR(100) NOT NULL UNIQUE,
  device_name VARCHAR(150),
  title VARCHAR(300),
  main_anomaly VARCHAR(300),
  severity ENUM('Critical','Major','Minor','Warning','Info') DEFAULT 'Info',
  impact VARCHAR(100),
  status VARCHAR(50) DEFAULT 'OPEN',
  is_deleted TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW()
);

-- 3. Create Alarm Correlation Mapping Table
CREATE TABLE IF NOT EXISTS alarm_correlation_mapping (
  id INT AUTO_INCREMENT PRIMARY KEY,
  incident_id INT NOT NULL,
  alarm_uid VARCHAR(100) NOT NULL,
  is_root_cause TINYINT(1) DEFAULT 0,
  mapped_at DATETIME DEFAULT NOW(),
  FOREIGN KEY (incident_id) REFERENCES correlation_incidents(id) ON DELETE CASCADE,
  INDEX idx_alarm_uid (alarm_uid)
);

-- Seed Incidents
INSERT IGNORE INTO correlation_incidents (id, incident_uid, device_name, title, main_anomaly, severity, impact, status) VALUES
(1, 'INC-001-CORE', 'Juniper-MX2', 'BGP Peer Down cascade', 'BGP State Change', 'Critical', 'High', 'OPEN'),
(2, 'INC-002-ACC', 'Core-SW-BLR', 'High CPU causing STP flap', 'CPU Utilization Spike', 'Major', 'Medium', 'OPEN');

-- Map Alarms to Incidents (Assuming ALM-005 and ALM-006 exist from previous schema seeding)
INSERT IGNORE INTO alarm_correlation_mapping (incident_id, alarm_uid, is_root_cause) VALUES
(1, 'ALM-005', 1),
(2, 'ALM-006', 1);

-- We also make sure the audit_log table has the correct schema! The existing audit_log has:
-- id, action, user_name, created_at
-- Nothing to change here, we will just update the python model.
