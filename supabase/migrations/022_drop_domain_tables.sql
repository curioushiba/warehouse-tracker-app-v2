-- Migration: Drop Commissary and Frozen Goods domain tables
-- Reverses migrations 019 (frozen goods category), 020 (fg tables), and 021 (cm tables).
-- The app is consolidating back to a single inventory domain (inv_*).
-- All statements use IF EXISTS guards for safe re-runs.

-- ============================================
-- 1. DROP VIEWS
-- ============================================
DROP VIEW IF EXISTS public.fg_low_stock_items;
DROP VIEW IF EXISTS public.cm_low_stock_items;

-- ============================================
-- 2. DROP TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS on_fg_stock_change ON public.fg_items;
DROP TRIGGER IF EXISTS on_fg_item_update ON public.fg_items;
DROP TRIGGER IF EXISTS on_cm_stock_change ON public.cm_items;
DROP TRIGGER IF EXISTS on_cm_item_update ON public.cm_items;

-- ============================================
-- 3. DROP FUNCTIONS
-- ============================================
DROP FUNCTION IF EXISTS public.check_fg_low_stock();
DROP FUNCTION IF EXISTS public.handle_fg_item_update();
DROP FUNCTION IF EXISTS public.submit_fg_transaction(TEXT, UUID, DECIMAL, UUID, TEXT, TIMESTAMPTZ, UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.generate_fg_sku();

DROP FUNCTION IF EXISTS public.check_cm_low_stock();
DROP FUNCTION IF EXISTS public.handle_cm_item_update();
DROP FUNCTION IF EXISTS public.submit_cm_transaction(TEXT, UUID, DECIMAL, UUID, TEXT, TIMESTAMPTZ, UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.generate_cm_sku();

-- ============================================
-- 4. DROP TABLES (CASCADE removes RLS policies and indexes)
-- ============================================
DROP TABLE IF EXISTS public.fg_transactions CASCADE;
DROP TABLE IF EXISTS public.fg_items CASCADE;
DROP TABLE IF EXISTS public.cm_transactions CASCADE;
DROP TABLE IF EXISTS public.cm_items CASCADE;

-- ============================================
-- 5. DROP SEQUENCES
-- ============================================
DROP SEQUENCE IF EXISTS fg_sku_sequence;
DROP SEQUENCE IF EXISTS cm_sku_sequence;

-- ============================================
-- 6. CLEAN UP FROZEN GOODS CATEGORY
-- Delete only if no inv_items reference it.
-- ============================================
DELETE FROM public.inv_categories
WHERE name = 'Frozen Goods'
  AND NOT EXISTS (
    SELECT 1 FROM public.inv_items
    WHERE inv_items.category_id = inv_categories.id
  );
