-- ============================================
-- ATTENDANCE SYSTEM SCHEMA
-- Tables prefixed with att_ to separate from inventory (inv_)
-- ============================================

-- Sequence for generating store QR codes (ATT-XXXXX format)
CREATE SEQUENCE IF NOT EXISTS att_store_code_seq START WITH 1;

-- ============================================
-- ATT_STORES: Physical store locations
-- ============================================
CREATE TABLE att_stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    qr_code TEXT UNIQUE, -- Format: ATT-XXXXX, generated via function
    cooldown_minutes INTEGER NOT NULL DEFAULT 240, -- 4 hours default
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for QR code lookups (used during clock-in)
CREATE INDEX idx_att_stores_qr_code ON att_stores(qr_code) WHERE qr_code IS NOT NULL;

-- ============================================
-- ATT_EMPLOYEES: Attendance-only accounts
-- Completely separate from inv_profiles (inventory employees)
-- ============================================
CREATE TABLE att_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ
);

-- Index for username lookups during login
CREATE INDEX idx_att_employees_username ON att_employees(username);

-- ============================================
-- ATT_RECORDS: Immutable attendance log
-- ============================================
CREATE TABLE att_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES att_employees(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL REFERENCES att_stores(id) ON DELETE RESTRICT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    device_info JSONB -- Optional: browser, OS info for audit
);

-- Index for querying records by date range
CREATE INDEX idx_att_records_recorded_at ON att_records(recorded_at DESC);

-- Index for querying records by employee
CREATE INDEX idx_att_records_employee ON att_records(employee_id, recorded_at DESC);

-- Index for querying records by store
CREATE INDEX idx_att_records_store ON att_records(store_id, recorded_at DESC);

-- ============================================
-- ATT_SETTINGS: Global configuration
-- ============================================
CREATE TABLE att_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO att_settings (key, value) VALUES
    ('default_cooldown_minutes', '240'::jsonb),
    ('session_duration_days', '30'::jsonb);

-- ============================================
-- TRIGGERS: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION att_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER att_stores_updated_at
    BEFORE UPDATE ON att_stores
    FOR EACH ROW
    EXECUTE FUNCTION att_update_updated_at();

CREATE TRIGGER att_employees_updated_at
    BEFORE UPDATE ON att_employees
    FOR EACH ROW
    EXECUTE FUNCTION att_update_updated_at();

CREATE TRIGGER att_settings_updated_at
    BEFORE UPDATE ON att_settings
    FOR EACH ROW
    EXECUTE FUNCTION att_update_updated_at();
