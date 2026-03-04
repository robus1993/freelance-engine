-- 0006_reconfigure_v3.sql
-- WARNING: Drops and recreates tables (data loss). V3 workflow.

PRAGMA foreign_keys = ON;

-- Drop triggers first
DROP TRIGGER IF EXISTS enforce_assignment_rules;
DROP TRIGGER IF EXISTS on_project_completed_upsert_invoice;
DROP TRIGGER IF EXISTS on_project_billed_hours_update_upsert_invoice;
DROP TRIGGER IF EXISTS on_invoice_insert_adjust_vendor_balance;
DROP TRIGGER IF EXISTS on_invoice_amount_update_adjust_vendor_balance;
DROP TRIGGER IF EXISTS prevent_invoice_edit_if_paid;
DROP TRIGGER IF EXISTS on_invoice_paid_adjust_vendor_and_project;

-- Drop tables
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
  sa_status  TEXT NOT NULL DEFAULT 'PENDING' CHECK (sa_status  IN ('PENDING','SIGNED','EXPIRED')),

  payment_instructions TEXT, -- rich text / instructions (stored as text)

  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),

  current_balance REAL NOT NULL DEFAULT 0,
  historical_earnings REAL NOT NULL DEFAULT 0,

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

  -- supervisor sets project type + approves budget
  classification TEXT NOT NULL DEFAULT 'UNSET' CHECK (classification IN ('UNSET','CONFIDENTIAL','PUBLIC')),
  approved_estimated_budget REAL,
  supervisor_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,

  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','SUBMITTED','NEEDS_INFO','REJECTED','PENDING_START','IN_PROGRESS','COMPLETED','PAID')),

  submitted_at TEXT,
  started_at TEXT,
  completed_at TEXT,

  billed_hours REAL NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One vendor per project (assignment)
CREATE TABLE assignments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  vendor_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
);

-- Invoices (auto created when project is completed)
CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,

  project_id TEXT NOT NULL UNIQUE,
  vendor_id TEXT NOT NULL,

  billed_hours REAL NOT NULL,
  vendor_hourly_rate REAL NOT NULL,
  amount REAL NOT NULL,

  vendor_payment_instructions TEXT,

  status TEXT NOT NULL DEFAULT 'DUE' CHECK (status IN ('DUE','PAID')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  paid_at TEXT,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL UNIQUE,
  vendor_id TEXT NOT NULL,
  amount REAL NOT NULL,
  method TEXT,
  notes TEXT,
  paid_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
);

-- Indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_supervisor_email ON projects(supervisor_email);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_assignments_vendor_id ON assignments(vendor_id);

-- DB Enforcement: Assignments must respect classification + status + citizenship
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

  -- Project must be PENDING_START (approved by supervisor)
  SELECT RAISE(ABORT, 'Project must be PENDING_START before assigning a vendor.')
  WHERE (SELECT status FROM projects WHERE id = NEW.project_id) <> 'PENDING_START';

  -- Project must be classified
  SELECT RAISE(ABORT, 'Supervisor must set project type before assignment.')
  WHERE (SELECT classification FROM projects WHERE id = NEW.project_id) = 'UNSET';

  -- Sovereign Brain rule:
  SELECT RAISE(ABORT, 'CONFIDENTIAL projects may only be assigned to US vendors.')
  WHERE (SELECT classification FROM projects WHERE id = NEW.project_id) = 'CONFIDENTIAL'
    AND (SELECT citizenship FROM vendors WHERE id = NEW.vendor_id) <> 'US';
END;

-- Prevent editing invoice amount/hours if PAID
CREATE TRIGGER prevent_invoice_edit_if_paid
BEFORE UPDATE OF billed_hours, vendor_hourly_rate, amount ON invoices
FOR EACH ROW
WHEN OLD.status = 'PAID'
BEGIN
  SELECT RAISE(ABORT, 'Cannot edit a PAID invoice.');
END;

-- Vendor balance adjustments: invoice insert (DUE)
CREATE TRIGGER on_invoice_insert_adjust_vendor_balance
AFTER INSERT ON invoices
FOR EACH ROW
WHEN NEW.status = 'DUE'
BEGIN
  UPDATE vendors
  SET current_balance = current_balance + NEW.amount
  WHERE id = NEW.vendor_id;
END;

-- Vendor balance adjustments: invoice amount update (DUE)
CREATE TRIGGER on_invoice_amount_update_adjust_vendor_balance
AFTER UPDATE OF amount ON invoices
FOR EACH ROW
WHEN NEW.status = 'DUE' AND OLD.status = 'DUE'
BEGIN
  UPDATE vendors
  SET current_balance = current_balance + (NEW.amount - OLD.amount)
  WHERE id = NEW.vendor_id;
END;

-- When invoice becomes PAID: update vendor balances + project status
CREATE TRIGGER on_invoice_paid_adjust_vendor_and_project
AFTER UPDATE OF status ON invoices
FOR EACH ROW
WHEN OLD.status = 'DUE' AND NEW.status = 'PAID'
BEGIN
  UPDATE vendors
  SET
    current_balance = current_balance - OLD.amount,
    historical_earnings = historical_earnings + OLD.amount
  WHERE id = NEW.vendor_id;

  UPDATE projects
  SET status = 'PAID'
  WHERE id = NEW.project_id;
END;

-- Upsert invoice when project becomes COMPLETED
CREATE TRIGGER on_project_completed_upsert_invoice
AFTER UPDATE OF status ON projects
FOR EACH ROW
WHEN NEW.status = 'COMPLETED'
BEGIN
  -- Must have vendor assigned
  SELECT RAISE(ABORT, 'Cannot complete project without an assigned vendor.')
  WHERE (SELECT COUNT(1) FROM assignments WHERE project_id = NEW.id) = 0;

  -- Cannot regenerate if invoice already PAID
  SELECT RAISE(ABORT, 'Cannot regenerate invoice after payment.')
  WHERE EXISTS (SELECT 1 FROM invoices WHERE project_id = NEW.id AND status = 'PAID');

  -- Update existing DUE invoice (regenerate)
  UPDATE invoices
  SET
    billed_hours = NEW.billed_hours,
    vendor_hourly_rate = (
      SELECT v.hourly_rate
      FROM assignments a JOIN vendors v ON v.id = a.vendor_id
      WHERE a.project_id = NEW.id
      LIMIT 1
    ),
    amount = NEW.billed_hours * (
      SELECT v.hourly_rate
      FROM assignments a JOIN vendors v ON v.id = a.vendor_id
      WHERE a.project_id = NEW.id
      LIMIT 1
    ),
    vendor_payment_instructions = (
      SELECT COALESCE(v.payment_instructions,'')
      FROM assignments a JOIN vendors v ON v.id = a.vendor_id
      WHERE a.project_id = NEW.id
      LIMIT 1
    ),
    updated_at = datetime('now')
  WHERE project_id = NEW.id AND status = 'DUE';

  -- Insert if missing
  INSERT INTO invoices (
    id, invoice_number, project_id, vendor_id,
    billed_hours, vendor_hourly_rate, amount,
    vendor_payment_instructions, status, created_at
  )
  SELECT
    lower(hex(randomblob(16))),
    'INV-' || strftime('%Y%m%d','now') || '-' || substr(hex(randomblob(4)),1,8),
    NEW.id,
    a.vendor_id,
    NEW.billed_hours,
    v.hourly_rate,
    NEW.billed_hours * v.hourly_rate,
    COALESCE(v.payment_instructions,''),
    'DUE',
    datetime('now')
  FROM assignments a
  JOIN vendors v ON v.id = a.vendor_id
  WHERE a.project_id = NEW.id
    AND NOT EXISTS (SELECT 1 FROM invoices WHERE project_id = NEW.id);
END;

-- Also regenerate invoice when billed_hours changes while COMPLETED
CREATE TRIGGER on_project_billed_hours_update_upsert_invoice
AFTER UPDATE OF billed_hours ON projects
FOR EACH ROW
WHEN NEW.status = 'COMPLETED'
BEGIN
  -- Force same logic by "touching" status trigger behavior via direct invoice update
  SELECT RAISE(ABORT, 'Cannot regenerate invoice after payment.')
  WHERE EXISTS (SELECT 1 FROM invoices WHERE project_id = NEW.id AND status = 'PAID');

  UPDATE invoices
  SET
    billed_hours = NEW.billed_hours,
    vendor_hourly_rate = (
      SELECT v.hourly_rate
      FROM assignments a JOIN vendors v ON v.id = a.vendor_id
      WHERE a.project_id = NEW.id
      LIMIT 1
    ),
    amount = NEW.billed_hours * (
      SELECT v.hourly_rate
      FROM assignments a JOIN vendors v ON v.id = a.vendor_id
      WHERE a.project_id = NEW.id
      LIMIT 1
    ),
    vendor_payment_instructions = (
      SELECT COALESCE(v.payment_instructions,'')
      FROM assignments a JOIN vendors v ON v.id = a.vendor_id
      WHERE a.project_id = NEW.id
      LIMIT 1
    ),
    updated_at = datetime('now')
  WHERE project_id = NEW.id AND status = 'DUE';

  -- Insert if missing (edge case)
  INSERT INTO invoices (
    id, invoice_number, project_id, vendor_id,
    billed_hours, vendor_hourly_rate, amount,
    vendor_payment_instructions, status, created_at
  )
  SELECT
    lower(hex(randomblob(16))),
    'INV-' || strftime('%Y%m%d','now') || '-' || substr(hex(randomblob(4)),1,8),
    NEW.id,
    a.vendor_id,
    NEW.billed_hours,
    v.hourly_rate,
    NEW.billed_hours * v.hourly_rate,
    COALESCE(v.payment_instructions,''),
    'DUE',
    datetime('now')
  FROM assignments a
  JOIN vendors v ON v.id = a.vendor_id
  WHERE a.project_id = NEW.id
    AND NOT EXISTS (SELECT 1 FROM invoices WHERE project_id = NEW.id);
END;
