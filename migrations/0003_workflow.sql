-- 0003_workflow.sql

-- Add workflow fields to projects
ALTER TABLE projects ADD COLUMN status TEXT NOT NULL DEFAULT 'DRAFT'
  CHECK (status IN ('DRAFT','IN_PROGRESS','SUBMITTED','APPROVED','CHANGES_REQUESTED'));

ALTER TABLE projects ADD COLUMN submission_url TEXT;
ALTER TABLE projects ADD COLUMN submission_notes TEXT;
ALTER TABLE projects ADD COLUMN submitted_at TEXT;

ALTER TABLE projects ADD COLUMN approved_at TEXT;
ALTER TABLE projects ADD COLUMN approved_by TEXT;
ALTER TABLE projects ADD COLUMN approval_notes TEXT;

-- Optional: track change requests separately
ALTER TABLE projects ADD COLUMN changes_requested_at TEXT;
ALTER TABLE projects ADD COLUMN changes_requested_by TEXT;
ALTER TABLE projects ADD COLUMN changes_notes TEXT;

-- Helpful index for supervisor views
CREATE INDEX IF NOT EXISTS idx_projects_supervisor_email ON projects(supervisor_email);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
