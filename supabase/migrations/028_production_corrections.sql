-- Migration: Allow negative production logs for corrections
-- Changes constraint from quantity_produced > 0 to quantity_produced <> 0
-- Updates submit_production RPC to branch on sign (check_in vs check_out)

-- ============================================================================
-- 1. Drop and recreate constraint on inv_production_logs
-- ============================================================================

ALTER TABLE inv_production_logs DROP CONSTRAINT IF EXISTS inv_production_logs_quantity_produced_check;
ALTER TABLE inv_production_logs ADD CONSTRAINT inv_production_logs_quantity_produced_check
  CHECK (quantity_produced <> 0);

COMMENT ON COLUMN inv_production_logs.quantity_produced IS 'Positive = production, negative = correction (undoing overcount)';

-- ============================================================================
-- 2. Update submit_production RPC to handle negative quantities
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_production(
  p_item_id UUID,
  p_quantity_produced DECIMAL,
  p_user_id UUID,
  p_device_timestamp TIMESTAMPTZ,
  p_idempotency_key UUID DEFAULT NULL,
  p_waste_quantity DECIMAL DEFAULT 0,
  p_waste_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS SETOF inv_production_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing inv_production_logs;
  v_item inv_items;
  v_profile profiles;
  v_event_ts TIMESTAMPTZ;
  v_result inv_production_logs;
  v_target_qty DECIMAL;
  v_tx_type TEXT;
  v_tx_notes TEXT;
BEGIN
  -- 1. Idempotency check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM inv_production_logs WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN NEXT v_existing;
      RETURN;
    END IF;
  END IF;

  -- 2. Verify user is active
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  IF NOT v_profile.is_active THEN
    RAISE EXCEPTION 'User account is inactive';
  END IF;

  -- 3. Verify item exists, is_commissary, not archived
  SELECT * INTO v_item FROM inv_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found';
  END IF;
  IF v_item.is_archived THEN
    RAISE EXCEPTION 'Item is archived';
  END IF;
  IF NOT v_item.is_commissary THEN
    RAISE EXCEPTION 'Item is not a commissary item';
  END IF;

  -- 4. Clamp event_timestamp (same rules as submit_transaction)
  v_event_ts := LEAST(p_device_timestamp, NOW() + INTERVAL '5 minutes');
  v_event_ts := GREATEST(v_event_ts, NOW() - INTERVAL '30 days');

  -- 5. Look up today's target for expected_quantity
  SELECT target_quantity INTO v_target_qty
  FROM inv_production_targets
  WHERE item_id = p_item_id AND target_date = CURRENT_DATE;

  IF v_target_qty IS NULL THEN
    -- Check recurring targets
    SELECT target_quantity INTO v_target_qty
    FROM inv_production_targets
    WHERE item_id = p_item_id
      AND is_recurring = true
      AND day_of_week = EXTRACT(DOW FROM CURRENT_DATE)::INTEGER
    LIMIT 1;
  END IF;

  -- 6. Determine transaction type and notes based on sign
  IF p_quantity_produced > 0 THEN
    v_tx_type := 'check_in';
    v_tx_notes := '[Production] ' || v_item.name || COALESCE(' - ' || p_notes, '');
  ELSE
    v_tx_type := 'check_out';
    v_tx_notes := '[Production Correction] ' || v_item.name || COALESCE(' - ' || p_notes, '');
  END IF;

  -- 7. Create transaction via submit_transaction RPC
  PERFORM submit_transaction(
    p_transaction_type := v_tx_type,
    p_item_id := p_item_id,
    p_quantity := ABS(p_quantity_produced),
    p_user_id := p_user_id,
    p_notes := v_tx_notes,
    p_source_location_id := NULL,
    p_destination_location_id := NULL,
    p_idempotency_key := NULL,
    p_device_timestamp := p_device_timestamp
  );

  -- 8. Insert production log
  INSERT INTO inv_production_logs (
    item_id, quantity_produced, expected_quantity, waste_quantity, waste_reason,
    status, user_id, notes, device_timestamp, event_timestamp, idempotency_key
  ) VALUES (
    p_item_id, p_quantity_produced, v_target_qty, COALESCE(p_waste_quantity, 0),
    p_waste_reason, 'completed', p_user_id, p_notes,
    p_device_timestamp, v_event_ts, p_idempotency_key
  )
  RETURNING * INTO v_result;

  RETURN NEXT v_result;
  RETURN;
END;
$$;

COMMENT ON FUNCTION submit_production IS 'Atomically logs production and creates a stock transaction. Positive quantity = check_in (production), negative = check_out (correction). SECURITY DEFINER bypasses RLS for multi-table operation.';
