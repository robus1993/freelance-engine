-- 0004_reconfigure_v2.sql
-- WARNING: This drops and recreates tables (data loss). Intended for V2 reconfigure.

-- Clean up old triggers/tables (if they exist)
DROP TRIGGER IF EXISTS enforce_us_only_on_confidential;
DROP TRIGGER IF EXISTS enforce_assignment_rules;
DROP TRIGGER IF EXISTS enforce_confidential_budget_basis;
DROP TRIGGER IF EXISTS on_project_completed_generate_invoice;

DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS vendors;

-- Vendors
CREATE TABLE vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  citizenship TEXT NOT NULL CHECK (citizenship IN ('US','GAD','INTERNATIONAL')),
  hourly_rate REAL NOT NULL DEFAULT 0,
  nda_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (nda_status IN ('PENDING','SIGNED','EXPIRED')),
  sa_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (sa_status IN ('PENDING','SIGNED','EXPIRED')),
  current_balance REAL NOT NULL DEFAULT 0,
  historical_earnings REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Projects
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  estimated_hours REAL NOT NULL DEFAULT 0,
  hourly_rate_domestic REAL NOT NULL DEFAULT 0,
  hourly_rate_international REAL NOT NULL DEFAULT 0,
  attachment_url TEXT,
  supervisor_email TEXT,

  -- Set by supervisor:
  classification TEXT NOT NULL DEFAULT 'UNSET' CHECK (classification IN ('UNSET','CONFIDENTIAL','PUBLIC')),
  budget_basis TEXT NOT NULL DEFAULT 'UNSET' CHECK (budget_basis IN ('UNSET','DOMESTIC','INTERNATIONAL')),
  approved_estimated_budget REAL,
  supervisor_approved INTEGER NOT NULL DEFAULT 0 CHECK (supervisor_approved IN (0,1)),
  supervisor_notes TEXT,

  -- Workflow status:
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','IN_PROGRESS','COMPLETED','PAID')),

  submitted_at TEXT,
  approved_at TEXT,
  started_at TEXT,
  completed_at TEXT,

  billed_hours REAL NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One vendor per project
CREATE TABLE assignments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  vendor_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
);

-- Invoices auto-generated on completion
CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  vendor_id TEXT NOT NULL,
  billed_hours REAL NOT NULL,
  vendor_hourly_rate REAL NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'DUE' CHECK (status IN ('DUE','PAID')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL UNIQUE,
  vendor_id TEXT NOT NULL,
  amount REAL NOT NULL,
  paid_at TEXT NOT NULL DEFAULT (datetime('now')),
  notes TEXT,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
);

-- Indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_supervisor_email ON projects(supervisor_email);
CREATE INDEX idx_assignments_vendor_id ON assignments(vendor_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Enforce: confidential cannot use international budget basis
CREATE TRIGGER enforce_confidential_budget_basis
BEFORE UPDATE ON projects
FOR EACH ROW
WHEN NEW.classification = 'CONFIDENTIAL' AND NEW.budget_basis = 'INTERNATIONAL'
BEGIN
  SELECT RAISE(ABORT, 'Confidential projects must use DOMESTIC budget basis.');
END;

-- Enforce assignment rules at DB layer
CREATE TRIGGER enforce_assignment_rules
BEFORE INSERT ON assignments
FOR EACH ROW
BEGIN
  -- Project must exist
  SELECT RAISE(ABORT, 'Project not found.')
  WHERE (SELECT COUNT(1) FROM projects WHERE id = NEW.project_id) = 0;

  -- Vendor must exist
  SELECT RAISE(ABORT, 'Vendor not found.')
  WHERE (SELECT COUNT(1) FROM vendors WHERE id = NEW.vendor_id) = 0;

  -- Vendor must be ACTIVE
  SELECT RAISE(ABORT, 'Vendor is not ACTIVE.')
  WHERE (SELECT status FROM vendors WHERE id = NEW.vendor_id) <> 'ACTIVE';

  -- Project must be APPROVED and classified
  SELECT RAISE(ABORT, 'Project must be APPROVED before assigning a vendor.')
  WHERE (SELECT status FROM projects WHERE id = NEW.project_id) <> 'APPROVED';

  SELECT RAISE(ABORT, 'Supervisor must classify the project before assignment.')
  WHERE (SELECT classification FROM projects WHERE id = NEW.project_id) = 'UNSET';

  SELECT RAISE(ABORT, 'Supervisor approval missing.')
  WHERE (SELECT supervisor_approved FROM projects WHERE id = NEW.project_id) <> 1;

  -- Core Sovereign Brain rule:
  SELECT RAISE(ABORT, 'CONFIDENTIAL projects may only be assigned to US vendors.')
  WHERE (SELECT classification FROM projects WHERE id = NEW.project_id) = 'CONFIDENTIAL'
    AND (SELECT citizenship FROM vendors WHERE id = NEW.vendor_id) <> 'US';
END;

-- On completion: auto-create invoice + increase vendor current_balance
CREATE TRIGGER on_project_completed_generate_invoice
AFTER UPDATE OF status ON projects
FOR EACH ROW
WHEN NEW.status = 'COMPLETED' AND OLD.status <> 'COMPLETED'
BEGIN
  SELECT RAISE(ABORT, 'Cannot complete project without an assigned vendor.')
  WHERE (SELECT COUNT(1) FROM assignments WHERE project_id = NEW.id) = 0;

  INSERT INTO invoices (id, project_id, vendor_id, billed_hours, vendor_hourly_rate, amount, status, created_at)
  SELECT
    lower(hex(randomblob(16))),
    NEW.id,
    a.vendor_id,
    NEW.billed_hours,
    v.hourly_rate,
    (NEW.billed_hours * v.hourly_rate),
    'DUE',
    datetime('now')
  FROM assignments a
  JOIN vendors v ON v.id = a.vendor_id
  WHERE a.project_id = NEW.id
    AND NOT EXISTS (SELECT 1 FROM invoices WHERE project_id = NEW.id);

  UPDATE vendors
  SET current_balance = current_balance + (
    SELECT (NEW.billed_hours * v.hourly_rate)
    FROM assignments a
    JOIN vendors v ON v.id = a.vendor_id
    WHERE a.project_id = NEW.id
    LIMIT 1
  )
  WHERE id = (SELECT vendor_id FROM assignments WHERE project_id = NEW.id LIMIT 1);
END;
