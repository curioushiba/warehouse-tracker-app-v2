-- Migration: Add event_timestamp to inv_transactions
-- This timestamp is server-validated for display/reporting purposes
--
-- event_timestamp captures the actual time the transaction occurred (validated from device_timestamp)
-- while server_timestamp remains the authoritative audit timestamp for when the server processed it.

-- Step 1: Add the column (nullable initially for backfill)
ALTER TABLE public.inv_transactions
ADD COLUMN IF NOT EXISTS event_timestamp TIMESTAMPTZ;

-- Step 2: Create index for queries/reporting
CREATE INDEX IF NOT EXISTS idx_inv_transactions_event_timestamp
ON public.inv_transactions(event_timestamp DESC);

-- Step 3: Backfill existing records using device_timestamp
UPDATE public.inv_transactions
SET event_timestamp = device_timestamp
WHERE event_timestamp IS NULL;

-- Step 4: Make column NOT NULL after backfill
ALTER TABLE public.inv_transactions
ALTER COLUMN event_timestamp SET NOT NULL;

-- Step 5: Update submit_transaction function to compute event_timestamp
CREATE OR REPLACE FUNCTION public.submit_transaction(
  p_transaction_type TEXT,
  p_item_id UUID,
  p_quantity DECIMAL,
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL,
  p_device_timestamp TIMESTAMPTZ DEFAULT NOW(),
  p_source_location_id UUID DEFAULT NULL,
  p_destination_location_id UUID DEFAULT NULL,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS public.inv_transactions AS $$
DECLARE
  v_item public.inv_items;
  v_stock_before DECIMAL;
  v_stock_after DECIMAL;
  v_transaction public.inv_transactions;
  v_event_timestamp TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Idempotency check: return existing transaction if key matches
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_transaction
    FROM public.inv_transactions
    WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_transaction;
    END IF;
  END IF;

  -- Calculate event_timestamp with clamping
  -- Rule: within 5 minutes future, 30 days past
  v_event_timestamp := p_device_timestamp;

  -- Clamp future timestamps (max 5 minutes ahead)
  IF v_event_timestamp > v_now + INTERVAL '5 minutes' THEN
    v_event_timestamp := v_now;
  END IF;

  -- Clamp past timestamps (max 30 days back)
  IF v_event_timestamp < v_now - INTERVAL '30 days' THEN
    v_event_timestamp := v_now - INTERVAL '30 days';
  END IF;

  -- Lock item row for update
  SELECT * INTO v_item
  FROM public.inv_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found: %', p_item_id;
  END IF;

  IF v_item.is_archived THEN
    RAISE EXCEPTION 'Cannot perform transaction on archived item';
  END IF;

  v_stock_before := v_item.current_stock;

  -- Calculate new stock based on transaction type
  CASE p_transaction_type
    WHEN 'check_in', 'return' THEN
      v_stock_after := v_stock_before + p_quantity;
    WHEN 'check_out', 'write_off' THEN
      IF v_stock_before < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_stock_before, p_quantity;
      END IF;
      v_stock_after := v_stock_before - p_quantity;
    WHEN 'adjustment' THEN
      v_stock_after := p_quantity;
    WHEN 'transfer' THEN
      IF v_stock_before < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for transfer. Available: %, Requested: %', v_stock_before, p_quantity;
      END IF;
      v_stock_after := v_stock_before - p_quantity;
    ELSE
      RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type;
  END CASE;

  -- Update item stock
  UPDATE public.inv_items
  SET current_stock = v_stock_after
  WHERE id = p_item_id;

  -- Create transaction record with event_timestamp
  INSERT INTO public.inv_transactions (
    transaction_type,
    item_id,
    quantity,
    stock_before,
    stock_after,
    source_location_id,
    destination_location_id,
    user_id,
    notes,
    device_timestamp,
    event_timestamp,
    idempotency_key
  ) VALUES (
    p_transaction_type,
    p_item_id,
    p_quantity,
    v_stock_before,
    v_stock_after,
    p_source_location_id,
    p_destination_location_id,
    p_user_id,
    p_notes,
    p_device_timestamp,
    v_event_timestamp,
    p_idempotency_key
  )
  RETURNING * INTO v_transaction;

  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql;