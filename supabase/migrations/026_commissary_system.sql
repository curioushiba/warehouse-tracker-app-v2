-- Migration: Commissary Production Tracking System
-- Adds production logging, targets, smart recommendations for commissary items

-- ============================================================================
-- 1a. Add is_commissary flag to inv_items
-- ============================================================================

ALTER TABLE inv_items ADD COLUMN is_commissary BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX idx_inv_items_commissary ON inv_items(is_commissary) WHERE is_commissary = true;

COMMENT ON COLUMN inv_items.is_commissary IS 'Whether this item is produced in-house by the commissary (bakery, prepared foods, etc.)';

-- ============================================================================
-- 1b. inv_production_logs — Production Event Records
-- ============================================================================

CREATE TABLE inv_production_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id           UUID NOT NULL REFERENCES inv_items(id),
  quantity_produced  DECIMAL NOT NULL CHECK (quantity_produced > 0),
  expected_quantity  DECIMAL,
  waste_quantity     DECIMAL DEFAULT 0 CHECK (waste_quantity >= 0),
  waste_reason       TEXT,
  status             TEXT NOT NULL DEFAULT 'completed'
                       CHECK (status IN ('completed', 'cancelled')),
  user_id            UUID NOT NULL REFERENCES profiles(id),
  notes              TEXT,
  device_timestamp   TIMESTAMPTZ NOT NULL,
  event_timestamp    TIMESTAMPTZ NOT NULL,
  server_timestamp   TIMESTAMPTZ DEFAULT NOW(),
  idempotency_key    UUID UNIQUE
);

CREATE INDEX idx_inv_production_logs_item ON inv_production_logs(item_id);
CREATE INDEX idx_inv_production_logs_user ON inv_production_logs(user_id);
CREATE INDEX idx_inv_production_logs_event ON inv_production_logs(event_timestamp DESC);
CREATE INDEX idx_inv_production_logs_status ON inv_production_logs(status);

COMMENT ON TABLE inv_production_logs IS 'Immutable production event records. Each completed log auto-creates a check_in transaction on the item.';

-- ============================================================================
-- 1c. inv_production_targets — Daily Production Goals
-- ============================================================================

CREATE TABLE inv_production_targets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id           UUID NOT NULL REFERENCES inv_items(id),
  target_quantity    DECIMAL NOT NULL CHECK (target_quantity > 0),
  target_date        DATE,
  priority           INTEGER NOT NULL DEFAULT 50 CHECK (priority BETWEEN 1 AND 100),
  is_recurring       BOOLEAN NOT NULL DEFAULT false,
  day_of_week        INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  notes              TEXT,
  created_by         UUID REFERENCES profiles(id),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_target_item_date UNIQUE (item_id, target_date)
);

CREATE INDEX idx_inv_production_targets_date ON inv_production_targets(target_date);
CREATE INDEX idx_inv_production_targets_item ON inv_production_targets(item_id);

COMMENT ON TABLE inv_production_targets IS 'Production targets: explicit (target_date set) or recurring (is_recurring=true, day_of_week set). Recurring resolved at query time via view.';

-- ============================================================================
-- 1d. submit_production RPC Function
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

  -- 6. Create check_in transaction via submit_transaction RPC
  PERFORM submit_transaction(
    p_transaction_type := 'check_in',
    p_item_id := p_item_id,
    p_quantity := p_quantity_produced,
    p_user_id := p_user_id,
    p_notes := '[Production] ' || v_item.name || COALESCE(' - ' || p_notes, ''),
    p_source_location_id := NULL,
    p_destination_location_id := NULL,
    p_idempotency_key := NULL,
    p_device_timestamp := p_device_timestamp
  );

  -- 7. Insert production log
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

COMMENT ON FUNCTION submit_production IS 'Atomically logs production and creates a check_in transaction. SECURITY DEFINER bypasses RLS for multi-table operation.';

-- ============================================================================
-- 1e. inv_production_recommendations View
-- ============================================================================

CREATE OR REPLACE VIEW inv_production_recommendations AS
WITH effective_targets AS (
  -- Explicit targets for today
  SELECT item_id, target_quantity, priority, true as is_explicit
  FROM inv_production_targets
  WHERE target_date = CURRENT_DATE
  UNION ALL
  -- Recurring targets for today's weekday (only if no explicit target exists)
  SELECT rt.item_id, rt.target_quantity, rt.priority, false as is_explicit
  FROM inv_production_targets rt
  WHERE rt.is_recurring = true
    AND rt.day_of_week = EXTRACT(DOW FROM CURRENT_DATE)::INTEGER
    AND NOT EXISTS (
      SELECT 1 FROM inv_production_targets et
      WHERE et.item_id = rt.item_id AND et.target_date = CURRENT_DATE
    )
),
produced_today AS (
  SELECT item_id, SUM(quantity_produced) as total
  FROM inv_production_logs
  WHERE event_timestamp::date = CURRENT_DATE AND status = 'completed'
  GROUP BY item_id
)
SELECT
  i.id as item_id,
  i.name,
  i.sku,
  i.current_stock,
  i.min_stock,
  i.max_stock,
  i.unit,
  COALESCE(cr.daily_consumption_rate, 0) as daily_consumption_rate,
  CASE WHEN COALESCE(cr.daily_consumption_rate, 0) > 0
    THEN FLOOR(i.current_stock / cr.daily_consumption_rate)
    ELSE NULL END as days_of_stock,
  GREATEST(0, COALESCE(i.min_stock, 0) - i.current_stock) as deficit,
  COALESCE(et.target_quantity, 0) as target_today,
  COALESCE(et.priority, 50) as priority,
  COALESCE(et.is_explicit, false) as has_explicit_target,
  COALESCE(p.total, 0) as produced_today,
  GREATEST(0, COALESCE(et.target_quantity, 0) - COALESCE(p.total, 0)) as remaining_target,
  -- Smart suggestion for items with no target
  CASE WHEN et.target_quantity IS NULL THEN
    GREATEST(
      GREATEST(0, COALESCE(i.min_stock, 0) - i.current_stock),
      COALESCE(cr.daily_consumption_rate, 0) * 2
    )
  ELSE 0 END as suggested_quantity
FROM inv_items i
LEFT JOIN inv_item_consumption_rates cr ON cr.item_id = i.id
LEFT JOIN effective_targets et ON et.item_id = i.id
LEFT JOIN produced_today p ON p.item_id = i.id
WHERE i.is_commissary = true AND i.is_archived = false;

GRANT SELECT ON inv_production_recommendations TO authenticated;
GRANT SELECT ON inv_production_recommendations TO anon;

COMMENT ON VIEW inv_production_recommendations IS 'Resolves explicit + recurring targets for today, computes smart suggestions for items without targets based on consumption rates.';

-- ============================================================================
-- 1f. RLS Policies
-- ============================================================================

ALTER TABLE inv_production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_production_targets ENABLE ROW LEVEL SECURITY;

-- Production logs: authenticated users can view all
CREATE POLICY "production_logs_select" ON inv_production_logs
  FOR SELECT TO authenticated USING (true);

-- Production logs: users can insert their own (direct inserts, not via RPC)
CREATE POLICY "production_logs_insert" ON inv_production_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Production targets: authenticated can view all
CREATE POLICY "production_targets_select" ON inv_production_targets
  FOR SELECT TO authenticated USING (true);

-- Production targets: admin only for CUD
CREATE POLICY "production_targets_insert" ON inv_production_targets
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "production_targets_update" ON inv_production_targets
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "production_targets_delete" ON inv_production_targets
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- 1g. Update alerts type constraint (add production_target_unmet)
-- ============================================================================

-- Drop and recreate the check constraint on alerts.type to include the new value
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_type_check;
ALTER TABLE alerts ADD CONSTRAINT alerts_type_check
  CHECK (type IN ('low_stock', 'expiring', 'audit_required', 'system', 'user', 'production_target_unmet'));
