-- Migration: Separate Commissary Tables
-- Creates cm_items and cm_transactions tables with identical schema to fg_items/fg_transactions
-- but operating independently for the commissary domain.

-- ============================================
-- CM SKU SEQUENCE AND GENERATOR
-- ============================================
CREATE SEQUENCE IF NOT EXISTS cm_sku_sequence START 1000;

CREATE OR REPLACE FUNCTION public.generate_cm_sku()
RETURNS TEXT AS $$
DECLARE
  new_sku TEXT;
BEGIN
  new_sku := 'CM-' || LPAD(nextval('cm_sku_sequence')::TEXT, 6, '0');
  RETURN new_sku;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CM ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.cm_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL DEFAULT public.generate_cm_sku(),
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.inv_categories(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  unit TEXT DEFAULT 'unit',
  current_stock DECIMAL DEFAULT 0,
  min_stock DECIMAL DEFAULT 0,
  max_stock DECIMAL,
  unit_price DECIMAL,
  barcode TEXT,
  image_url TEXT,
  is_archived BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cm_items_sku ON public.cm_items(sku);
CREATE INDEX IF NOT EXISTS idx_cm_items_name ON public.cm_items(name);
CREATE INDEX IF NOT EXISTS idx_cm_items_category ON public.cm_items(category_id);
CREATE INDEX IF NOT EXISTS idx_cm_items_location ON public.cm_items(location_id);
CREATE INDEX IF NOT EXISTS idx_cm_items_archived ON public.cm_items(is_archived);
CREATE INDEX IF NOT EXISTS idx_cm_items_barcode ON public.cm_items(barcode) WHERE barcode IS NOT NULL;

-- Version auto-increment trigger
CREATE OR REPLACE FUNCTION public.handle_cm_item_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_cm_item_update ON public.cm_items;
CREATE TRIGGER on_cm_item_update
  BEFORE UPDATE ON public.cm_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_cm_item_update();

-- ============================================
-- CM TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.cm_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'check_in', 'check_out', 'transfer', 'adjustment', 'write_off', 'return'
  )),
  item_id UUID REFERENCES public.cm_items(id) NOT NULL,
  quantity DECIMAL NOT NULL,
  stock_before DECIMAL,
  stock_after DECIMAL,
  source_location_id UUID REFERENCES public.locations(id),
  destination_location_id UUID REFERENCES public.locations(id),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  notes TEXT,
  device_timestamp TIMESTAMPTZ NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL,
  server_timestamp TIMESTAMPTZ DEFAULT NOW(),
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
  idempotency_key UUID UNIQUE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cm_transactions_item ON public.cm_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_cm_transactions_user ON public.cm_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_cm_transactions_type ON public.cm_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_cm_transactions_timestamp ON public.cm_transactions(server_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cm_transactions_event_timestamp ON public.cm_transactions(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cm_transactions_sync ON public.cm_transactions(sync_status);

-- ============================================
-- CM SUBMIT TRANSACTION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.submit_cm_transaction(
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
RETURNS public.cm_transactions AS $$
DECLARE
  v_item public.cm_items;
  v_stock_before DECIMAL;
  v_stock_after DECIMAL;
  v_transaction public.cm_transactions;
  v_event_timestamp TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Idempotency check: return existing transaction if key matches
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_transaction
    FROM public.cm_transactions
    WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_transaction;
    END IF;
  END IF;

  -- Verify user is active
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'User account is inactive';
  END IF;

  -- Calculate event_timestamp with clamping
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
  FROM public.cm_items
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
  UPDATE public.cm_items
  SET current_stock = v_stock_after
  WHERE id = p_item_id;

  -- Create transaction record with event_timestamp
  INSERT INTO public.cm_transactions (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.cm_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cm_transactions ENABLE ROW LEVEL SECURITY;

-- CM Items: Everyone can view, only admins can write
CREATE POLICY "Everyone can view cm_items"
  ON public.cm_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can create cm_items"
  ON public.cm_items FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update cm_items"
  ON public.cm_items FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete cm_items"
  ON public.cm_items FOR DELETE
  USING (public.is_admin());

-- CM Transactions: Admins view all, employees view own, users create own
CREATE POLICY "Admins can view all cm_transactions"
  ON public.cm_transactions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Employees can view own cm_transactions"
  ON public.cm_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create cm_transactions"
  ON public.cm_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update cm_transactions"
  ON public.cm_transactions FOR UPDATE
  USING (public.is_admin());

-- ============================================
-- LOW STOCK ALERT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.check_cm_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_stock <= NEW.min_stock AND OLD.current_stock > NEW.min_stock THEN
    INSERT INTO public.alerts (type, severity, title, message, item_id)
    VALUES (
      'low_stock',
      CASE WHEN NEW.current_stock = 0 THEN 'critical' ELSE 'warning' END,
      CASE WHEN NEW.current_stock = 0 THEN 'Critical: Commissary Item Out of Stock' ELSE 'Commissary Item Low Stock Alert' END,
      '[CM] Item "' || NEW.name || '" (SKU: ' || NEW.sku || ', ID: ' || NEW.id || ') has ' || NEW.current_stock || ' ' || NEW.unit || '(s) remaining. Minimum level: ' || NEW.min_stock,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_cm_stock_change ON public.cm_items;
CREATE TRIGGER on_cm_stock_change
  AFTER UPDATE OF current_stock ON public.cm_items
  FOR EACH ROW EXECUTE FUNCTION public.check_cm_low_stock();

-- ============================================
-- LOW STOCK VIEW
-- ============================================
CREATE OR REPLACE VIEW public.cm_low_stock_items AS
SELECT *
FROM public.cm_items
WHERE current_stock < min_stock
  AND is_archived = false;
