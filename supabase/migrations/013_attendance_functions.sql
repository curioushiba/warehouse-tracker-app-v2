-- ============================================
-- ATTENDANCE SYSTEM FUNCTIONS
-- ============================================

-- Ensure pgcrypto is available for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- ASSIGN_ATT_CODE: Generate unique QR code for store
-- Similar pattern to assign_pt_code for items
-- ============================================
CREATE OR REPLACE FUNCTION assign_att_code(p_store_id UUID)
RETURNS att_stores
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_store att_stores;
    v_new_code TEXT;
BEGIN
    -- Lock the row to prevent race conditions
    SELECT * INTO v_store
    FROM att_stores
    WHERE id = p_store_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Store not found: %', p_store_id;
    END IF;

    -- Check if already has a code
    IF v_store.qr_code IS NOT NULL THEN
        RAISE EXCEPTION 'Store already has QR code: %', v_store.qr_code;
    END IF;

    -- Generate new code: ATT-XXXXX (5 digits, zero-padded)
    v_new_code := 'ATT-' || LPAD(nextval('att_store_code_seq')::TEXT, 5, '0');

    -- Update the store
    UPDATE att_stores
    SET qr_code = v_new_code
    WHERE id = p_store_id
    RETURNING * INTO v_store;

    RETURN v_store;
END;
$$;

-- ============================================
-- RECORD_ATTENDANCE: Clock in with cooldown check
-- Called from server action with service role
-- ============================================
CREATE OR REPLACE FUNCTION record_attendance(
    p_employee_id UUID,
    p_store_id UUID,
    p_device_info JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_employee att_employees;
    v_store att_stores;
    v_last_record att_records;
    v_cooldown_minutes INTEGER;
    v_minutes_since_last INTEGER;
    v_new_record att_records;
BEGIN
    -- Get employee (check active)
    SELECT * INTO v_employee
    FROM att_employees
    WHERE id = p_employee_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Employee not found'
        );
    END IF;

    IF NOT v_employee.is_active THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Employee account is deactivated'
        );
    END IF;

    -- Get store (check active)
    SELECT * INTO v_store
    FROM att_stores
    WHERE id = p_store_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Store not found'
        );
    END IF;

    IF NOT v_store.is_active THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Store is not active'
        );
    END IF;

    -- Get cooldown (store-specific or default)
    v_cooldown_minutes := v_store.cooldown_minutes;

    -- Check for recent record at ANY store (global cooldown)
    SELECT * INTO v_last_record
    FROM att_records
    WHERE employee_id = p_employee_id
    ORDER BY recorded_at DESC
    LIMIT 1;

    IF FOUND THEN
        v_minutes_since_last := EXTRACT(EPOCH FROM (now() - v_last_record.recorded_at)) / 60;

        IF v_minutes_since_last < v_cooldown_minutes THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Cooldown period not elapsed',
                'last_record_at', v_last_record.recorded_at,
                'cooldown_minutes', v_cooldown_minutes,
                'minutes_remaining', v_cooldown_minutes - v_minutes_since_last
            );
        END IF;
    END IF;

    -- Record attendance
    INSERT INTO att_records (employee_id, store_id, device_info)
    VALUES (p_employee_id, p_store_id, p_device_info)
    RETURNING * INTO v_new_record;

    RETURN jsonb_build_object(
        'success', true,
        'record', jsonb_build_object(
            'id', v_new_record.id,
            'employee_id', v_new_record.employee_id,
            'store_id', v_new_record.store_id,
            'recorded_at', v_new_record.recorded_at
        ),
        'store_name', v_store.name,
        'employee_name', v_employee.display_name
    );
END;
$$;

-- ============================================
-- VERIFY_ATTENDANCE_CREDENTIALS: Login check
-- Returns employee if credentials valid
-- ============================================
CREATE OR REPLACE FUNCTION verify_attendance_credentials(
    p_username TEXT,
    p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_employee att_employees;
BEGIN
    -- Find employee by username
    SELECT * INTO v_employee
    FROM att_employees
    WHERE username = lower(trim(p_username));

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid username or password'
        );
    END IF;

    -- Verify password using pgcrypto (with extensions schema)
    IF v_employee.password_hash != extensions.crypt(p_password, v_employee.password_hash) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid username or password'
        );
    END IF;

    -- Check if active
    IF NOT v_employee.is_active THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Account is deactivated'
        );
    END IF;

    -- Update last login
    UPDATE att_employees
    SET last_login_at = now()
    WHERE id = v_employee.id;

    RETURN jsonb_build_object(
        'success', true,
        'employee', jsonb_build_object(
            'id', v_employee.id,
            'username', v_employee.username,
            'display_name', v_employee.display_name
        )
    );
END;
$$;

-- ============================================
-- HASH_ATTENDANCE_PASSWORD: Create password hash
-- Used when creating/updating attendance employees
-- ============================================
CREATE OR REPLACE FUNCTION hash_attendance_password(p_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Use extensions schema for pgcrypto functions
    RETURN extensions.crypt(p_password, extensions.gen_salt('bf', 10));
END;
$$;
