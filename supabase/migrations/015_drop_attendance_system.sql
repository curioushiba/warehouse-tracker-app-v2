-- Migration: Drop Attendance System
-- Description: Remove all attendance-related tables, functions, triggers, and sequences
-- This is a destructive migration - all attendance data will be permanently deleted

-- Drop tables (CASCADE handles dependent RLS policies, triggers, indexes)
DROP TABLE IF EXISTS att_records CASCADE;
DROP TABLE IF EXISTS att_employees CASCADE;
DROP TABLE IF EXISTS att_stores CASCADE;
DROP TABLE IF EXISTS att_settings CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS att_update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS assign_att_code(UUID) CASCADE;
DROP FUNCTION IF EXISTS record_attendance(UUID, UUID, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS reset_employee_password(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS verify_attendance_credentials(TEXT, TEXT) CASCADE;

-- Drop sequence
DROP SEQUENCE IF EXISTS att_store_code_seq CASCADE;
