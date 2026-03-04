-- 0007_clear_all_data.sql
BEGIN;
DELETE FROM payments;
DELETE FROM invoices;
DELETE FROM assignments;
DELETE FROM projects;
DELETE FROM vendors;
COMMIT;
