webflow cloud data execute freelancer_db --command "
CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    hourly_rate DECIMAL(10, 2),
    is_us_citizen BOOLEAN DEFAULT FALSE,
    is_gad_member BOOLEAN DEFAULT FALSE,
    nda_status TEXT CHECK(nda_status IN ('unsigned', 'pending', 'signed')) DEFAULT 'unsigned',
    service_agreement_status TEXT CHECK(service_agreement_status IN ('unsigned', 'pending', 'signed')) DEFAULT 'unsigned',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    confidentiality TEXT CHECK(confidentiality IN ('Confidential', 'Public')) DEFAULT 'Public',
    approval_status TEXT CHECK(approval_status IN ('Draft', 'Pending_Review', 'Approved', 'Rejected')) DEFAULT 'Draft',
    project_status TEXT CHECK(project_status IN ('Waiting_Approval', 'Assigning', 'In_Progress', 'Finished')) DEFAULT 'Waiting_Approval',
    est_hours INTEGER,
    actual_hours INTEGER,
    assigned_vendor_id INTEGER,
    FOREIGN KEY (assigned_vendor_id) REFERENCES vendors(id)
);

CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    total_amount DECIMAL(10, 2),
    invoice_url TEXT,
    status TEXT CHECK(status IN ('Draft', 'Sent', 'Paid')) DEFAULT 'Draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);"
