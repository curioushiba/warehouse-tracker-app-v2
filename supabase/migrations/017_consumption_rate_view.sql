-- Migration: Create view for item consumption rates
-- Calculates 7-day average daily consumption rate per item
-- Only counts consumption transactions: check_out and write_off
-- (transfers move inventory between locations, doesn't consume it)

-- Create the view for consumption rates
CREATE OR REPLACE VIEW inv_item_consumption_rates AS
SELECT
  i.id as item_id,
  COALESCE(
    (SELECT SUM(t.quantity) / 7.0
     FROM inv_transactions t
     WHERE t.item_id = i.id
       AND t.transaction_type IN ('check_out', 'write_off')
       AND t.event_timestamp > NOW() - INTERVAL '7 days'),
    0
  ) as daily_consumption_rate
FROM inv_items i
WHERE i.is_archived = false;

-- Grant appropriate permissions
GRANT SELECT ON inv_item_consumption_rates TO authenticated;
GRANT SELECT ON inv_item_consumption_rates TO anon;

-- Add comment for documentation
COMMENT ON VIEW inv_item_consumption_rates IS 'Calculates 7-day average daily consumption rate per item. Used for days-to-stockout calculations and reorder recommendations.';
