-- Migration: Atomic HRG code assignment function
-- Fixes race condition where concurrent requests waste sequence numbers

-- Create or replace the atomic function
CREATE OR REPLACE FUNCTION public.assign_hrg_code(p_item_id UUID)
RETURNS TABLE (
  id UUID,
  sku TEXT,
  name TEXT,
  description TEXT,
  category_id UUID,
  location_id UUID,
  unit TEXT,
  current_stock NUMERIC,
  min_stock NUMERIC,
  max_stock NUMERIC,
  unit_price NUMERIC,
  barcode TEXT,
  image_url TEXT,
  is_archived BOOLEAN,
  version INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_item RECORD;
  v_hrg_code TEXT;
BEGIN
  -- Lock the row for update to prevent concurrent modifications
  SELECT * INTO v_item
  FROM public.inv_items
  WHERE inv_items.id = p_item_id
  FOR UPDATE;

  -- Check if item exists
  IF v_item IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  -- Check if item already has a barcode
  IF v_item.barcode IS NOT NULL THEN
    RAISE EXCEPTION 'Item already has a barcode assigned';
  END IF;

  -- Check if item is archived
  IF v_item.is_archived THEN
    RAISE EXCEPTION 'Cannot generate code for archived item';
  END IF;

  -- Generate HRG code (only consumed if we actually assign it)
  v_hrg_code := 'HRG-' || LPAD(nextval('hrg_code_sequence')::TEXT, 5, '0');

  -- Update the item with the new barcode
  UPDATE public.inv_items
  SET barcode = v_hrg_code,
      updated_at = NOW()
  WHERE inv_items.id = p_item_id;

  -- Return the updated item
  RETURN QUERY
  SELECT
    inv_items.id,
    inv_items.sku,
    inv_items.name,
    inv_items.description,
    inv_items.category_id,
    inv_items.location_id,
    inv_items.unit,
    inv_items.current_stock,
    inv_items.min_stock,
    inv_items.max_stock,
    inv_items.unit_price,
    inv_items.barcode,
    inv_items.image_url,
    inv_items.is_archived,
    inv_items.version,
    inv_items.created_at,
    inv_items.updated_at
  FROM public.inv_items
  WHERE inv_items.id = p_item_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION public.assign_hrg_code(UUID) IS
'Atomically assigns an HRG code to an item. Prevents race conditions by using FOR UPDATE lock and only consuming sequence numbers for successful assignments.';
