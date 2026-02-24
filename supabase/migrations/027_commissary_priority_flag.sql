-- Migration: Add is_priority flag for essential commissary items
-- Allows admins to pin/star items that must be produced first regardless of stock levels

-- ============================================================================
-- 1. Add is_priority column to inv_items
-- ============================================================================

ALTER TABLE inv_items ADD COLUMN is_priority BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX idx_inv_items_priority ON inv_items(is_priority) WHERE is_priority = true;

COMMENT ON COLUMN inv_items.is_priority IS 'Admin-flagged essential item that always sorts to the top of commissary priority list';

-- ============================================================================
-- 2. Rebuild inv_production_recommendations view with is_priority
-- ============================================================================

-- Must DROP+CREATE (not CREATE OR REPLACE) because adding a column changes column order
DROP VIEW IF EXISTS inv_production_recommendations;

CREATE VIEW inv_production_recommendations AS
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
  i.is_priority,
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

COMMENT ON VIEW inv_production_recommendations IS 'Resolves explicit + recurring targets for today, computes smart suggestions for items without targets based on consumption rates. Includes is_priority flag for admin-pinned essential items.';
