-- ============================================
-- ATTENDANCE SYSTEM RLS POLICIES
-- Admin-only management, attendance employees can only clock in
-- ============================================

-- Enable RLS on all attendance tables
ALTER TABLE att_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE att_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE att_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE att_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ATT_STORES POLICIES
-- Admin: full access
-- Authenticated (for clock-in lookup): read active stores only
-- ============================================

-- Admin can do everything with stores
CREATE POLICY "Admin full access to stores"
    ON att_stores
    FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Anyone authenticated can read active stores (for clock-in flow)
CREATE POLICY "Authenticated can read active stores"
    ON att_stores
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- ============================================
-- ATT_EMPLOYEES POLICIES
-- Admin: full access
-- No direct access for attendance employees (auth handled separately)
-- ============================================

-- Admin can do everything with attendance employees
CREATE POLICY "Admin full access to attendance employees"
    ON att_employees
    FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- ============================================
-- ATT_RECORDS POLICIES
-- Admin: full read access
-- Insert: via RPC function only (validates cooldown)
-- ============================================

-- Admin can read all records
CREATE POLICY "Admin can read all attendance records"
    ON att_records
    FOR SELECT
    TO authenticated
    USING (is_admin());

-- Records are inserted via RPC function, not direct insert
-- This policy allows the service role to insert
CREATE POLICY "Service role can insert records"
    ON att_records
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- ============================================
-- ATT_SETTINGS POLICIES
-- Admin: full access
-- ============================================

CREATE POLICY "Admin full access to attendance settings"
    ON att_settings
    FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());
