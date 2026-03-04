-- 0007_clear_all_data.sql
-- Clear all DB rows (Webflow/WXP D1 migrations do NOT allow BEGIN/COMMIT/SAVEPOINT)

DELETE FROM payments;
DELETE FROM invoices;
DELETE FROM assignments;
DELETE FROM projects;
DELETE FROM vendors;
