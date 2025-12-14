-- Migration: Create view for low stock items
-- This view enables efficient querying of items where current_stock < min_stock
-- Eliminates the need for client-side filtering which was fetching all items

-- Create the view for low stock items
CREATE OR REPLACE VIEW inv_low_stock_items AS
SELECT *
FROM inv_items
WHERE is_archived = false
  AND current_stock < min_stock
ORDER BY current_stock ASC;

-- Grant appropriate permissions
GRANT SELECT ON inv_low_stock_items TO authenticated;
GRANT SELECT ON inv_low_stock_items TO anon;

-- Add comment for documentation
COMMENT ON VIEW inv_low_stock_items IS 'Items where current_stock is below min_stock threshold. Used by dashboard and low stock alerts.';
