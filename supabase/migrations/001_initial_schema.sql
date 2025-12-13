-- Inventory Tracker Database Schema
-- Run this migration in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  name TEXT GENERATED ALWAYS AS (COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) STORED,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- CATEGORIES TABLE (hierarchical)
-- ============================================
CREATE TABLE IF NOT EXISTS public.inv_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.inv_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_categories_parent ON public.inv_categories(parent_id);

-- ============================================
-- LOCATIONS TABLE (storage areas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('warehouse', 'storefront', 'storage', 'office')),
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_code ON public.locations(code);
CREATE INDEX IF NOT EXISTS idx_locations_active ON public.locations(is_active);

-- ============================================
-- SKU SEQUENCE AND GENERATOR
-- ============================================
CREATE SEQUENCE IF NOT EXISTS sku_sequence START 1000;

CREATE OR REPLACE FUNCTION public.generate_sku()
RETURNS TEXT AS $$
DECLARE
  new_sku TEXT;
BEGIN
  new_sku := 'INV-' || LPAD(nextval('sku_sequence')::TEXT, 6, '0');
  RETURN new_sku;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.inv_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL DEFAULT public.generate_sku(),
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
  is_archived BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_items_sku ON public.inv_items(sku);
CREATE INDEX IF NOT EXISTS idx_inv_items_name ON public.inv_items(name);
CREATE INDEX IF NOT EXISTS idx_inv_items_category ON public.inv_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inv_items_location ON public.inv_items(location_id);
CREATE INDEX IF NOT EXISTS idx_inv_items_archived ON public.inv_items(is_archived);
CREATE INDEX IF NOT EXISTS idx_inv_items_barcode ON public.inv_items(barcode) WHERE barcode IS NOT NULL;

-- Trigger to update updated_at and version
CREATE OR REPLACE FUNCTION public.handle_item_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_item_update ON public.inv_items;
CREATE TRIGGER on_item_update
  BEFORE UPDATE ON public.inv_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_item_update();

-- ============================================
-- TRANSACTIONS TABLE (6 types)
-- ============================================
CREATE TABLE IF NOT EXISTS public.inv_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'check_in', 'check_out', 'transfer', 'adjustment', 'write_off', 'return'
  )),
  item_id UUID REFERENCES public.inv_items(id) NOT NULL,
  quantity DECIMAL NOT NULL,
  stock_before DECIMAL,
  stock_after DECIMAL,
  source_location_id UUID REFERENCES public.locations(id),
  destination_location_id UUID REFERENCES public.locations(id),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  notes TEXT,
  device_timestamp TIMESTAMPTZ NOT NULL,
  server_timestamp TIMESTAMPTZ DEFAULT NOW(),
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
  idempotency_key UUID UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_inv_transactions_item ON public.inv_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_user ON public.inv_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_type ON public.inv_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_timestamp ON public.inv_transactions(server_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_sync ON public.inv_transactions(sync_status);

-- ============================================
-- TRANSACTION PROCESSING FUNCTION
-- ============================================
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
BEGIN
  -- Check for idempotency (prevent duplicate submissions)
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_transaction FROM public.inv_transactions WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_transaction;
    END IF;
  END IF;

  -- Lock the item row for update
  SELECT * INTO v_item FROM public.inv_items WHERE id = p_item_id FOR UPDATE;

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
      v_stock_after := p_quantity; -- Direct set for adjustments
    WHEN 'transfer' THEN
      IF v_stock_before < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for transfer. Available: %, Requested: %', v_stock_before, p_quantity;
      END IF;
      v_stock_after := v_stock_before - p_quantity;
      -- Note: For transfers, a separate check_in should be created at destination
    ELSE
      RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type;
  END CASE;

  -- Update item stock
  UPDATE public.inv_items
  SET current_stock = v_stock_after
  WHERE id = p_item_id;

  -- Create transaction record
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
    p_idempotency_key
  )
  RETURNING * INTO v_transaction;

  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ALERTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('low_stock', 'expiring', 'audit_required', 'system', 'user')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  item_id UUID REFERENCES public.inv_items(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_type ON public.alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON public.alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON public.alerts(created_at DESC);

-- ============================================
-- LOW STOCK ALERT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if stock dropped below minimum
  IF NEW.current_stock <= NEW.min_stock AND OLD.current_stock > NEW.min_stock THEN
    INSERT INTO public.alerts (type, severity, title, message, item_id)
    VALUES (
      'low_stock',
      CASE WHEN NEW.current_stock = 0 THEN 'critical' ELSE 'warning' END,
      CASE WHEN NEW.current_stock = 0 THEN 'Critical: Out of Stock' ELSE 'Low Stock Alert' END,
      'Item "' || NEW.name || '" (SKU: ' || NEW.sku || ') has ' || NEW.current_stock || ' ' || NEW.unit || '(s) remaining. Minimum level: ' || NEW.min_stock,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_stock_change ON public.inv_items;
CREATE TRIGGER on_stock_change
  AFTER UPDATE OF current_stock ON public.inv_items
  FOR EACH ROW EXECUTE FUNCTION public.check_low_stock();

-- ============================================
-- SYNC ERRORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.sync_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_data JSONB NOT NULL,
  error_message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  resolution_notes TEXT,
  user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_errors_status ON public.sync_errors(status);
CREATE INDEX IF NOT EXISTS idx_sync_errors_user ON public.sync_errors(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_errors_created ON public.sync_errors(created_at DESC);
