-- Migration: Rename HRG code system to PT (PackTrack)
-- Changes prefix from HRG- to PT- for new codes
-- Existing HRG- codes remain valid for backwards compatibility

-- 1. Create new sequence for PT codes (start from current HRG sequence value to avoid conflicts)
DO $$
DECLARE
  current_val BIGINT;
BEGIN
  -- Get current value from HRG sequence
  SELECT last_value INTO current_val FROM hrg_code_sequence;

  -- Create new PT sequence starting from the same point
  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS pt_code_sequence START WITH %s', current_val + 1);
END $$;

-- 2. Create new atomic PT code assignment function
CREATE OR REPLACE FUNCTION public.assign_pt_code(p_item_id UUID)
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
  v_pt_code TEXT;
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

  -- Generate PT code (only consumed if we actually assign it)
  v_pt_code := 'PT-' || LPAD(nextval('pt_code_sequence')::TEXT, 5, '0');

  -- Update the item with the new barcode
  UPDATE public.inv_items
  SET barcode = v_pt_code,
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
COMMENT ON FUNCTION public.assign_pt_code(UUID) IS
'Atomically assigns a PT code (PackTrack) to an item. Prevents race conditions by using FOR UPDATE lock and only consuming sequence numbers for successful assignments.';

-- 3. Create helper function to generate PT code (for reference/testing)
CREATE OR REPLACE FUNCTION public.generate_pt_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'PT-' || LPAD(nextval('pt_code_sequence')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.generate_pt_code() IS
'Generates a new PT code in format PT-XXXXX. Use assign_pt_code() for actual item assignment to prevent race conditions.';

-- 4. Grant permissions to authenticated users
GRANT USAGE, SELECT ON SEQUENCE pt_code_sequence TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_pt_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_pt_code() TO authenticated;

-- Note: Old HRG functions and sequence are kept for backwards compatibility
-- Existing HRG- barcodes in the database remain valid
