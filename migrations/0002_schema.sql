-- 0002_schema.sql

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  citizenship TEXT NOT NULL CHECK (citizenship IN ('US_CITIZEN', 'NON_US')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  confidentiality TEXT NOT NULL DEFAULT 'STANDARD' CHECK (confidentiality IN ('STANDARD','CONFIDENTIAL')),
  supervisor_email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  role TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, vendor_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- Enforcement trigger (drop + recreate)
DROP TRIGGER IF EXISTS enforce_us_only_on_confidential;

CREATE TRIGGER enforce_us_only_on_confidential
BEFORE INSERT ON assignments
FOR EACH ROW
WHEN (SELECT confidentiality FROM projects WHERE id = NEW.project_id) = 'CONFIDENTIAL'
BEGIN
  SELECT RAISE(ABORT, 'Confidential projects may only be assigned to US_CITIZEN vendors.')
  WHERE (SELECT citizenship FROM vendors WHERE id = NEW.vendor_id) <> 'US_CITIZEN';
END;
