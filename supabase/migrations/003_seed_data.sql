-- Seed Data for Development
-- Run this after setting up the schema and RLS policies
-- Note: You'll need to create users via Supabase Auth first, then update their profiles

-- ============================================
-- SAMPLE CATEGORIES
-- ============================================
INSERT INTO public.inv_categories (id, name, description, parent_id) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Electronics', 'Electronic devices and components', NULL),
  ('22222222-2222-2222-2222-222222222222', 'Office Supplies', 'General office supplies and stationery', NULL),
  ('33333333-3333-3333-3333-333333333333', 'Cleaning Supplies', 'Cleaning products and equipment', NULL),
  ('44444444-4444-4444-4444-444444444444', 'Furniture', 'Office and warehouse furniture', NULL),
  ('55555555-5555-5555-5555-555555555555', 'Computers', 'Computers and peripherals', '11111111-1111-1111-1111-111111111111'),
  ('66666666-6666-6666-6666-666666666666', 'Cables', 'Cables and connectors', '11111111-1111-1111-1111-111111111111'),
  ('77777777-7777-7777-7777-777777777777', 'Paper Products', 'Paper, notebooks, and printing supplies', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SAMPLE LOCATIONS
-- ============================================
INSERT INTO public.locations (id, name, code, type, address, is_active) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Main Warehouse', 'WH-001', 'warehouse', '123 Industrial Ave', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Office Storage', 'ST-001', 'storage', '456 Office Park', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Front Store', 'SF-001', 'storefront', '789 Main Street', true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Admin Office', 'OF-001', 'office', '456 Office Park, Floor 2', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SAMPLE ITEMS
-- ============================================
INSERT INTO public.inv_items (id, sku, name, description, category_id, location_id, unit, current_stock, min_stock, max_stock, unit_price) VALUES
  ('item-0001-0001-0001-000000000001', 'INV-001001', 'Wireless Mouse', 'Ergonomic wireless mouse with USB receiver', '55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'unit', 45, 10, 100, 29.99),
  ('item-0002-0002-0002-000000000002', 'INV-001002', 'USB-C Cable 1m', 'USB-C to USB-C cable, 1 meter', '66666666-6666-6666-6666-666666666666', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'unit', 150, 50, 300, 12.99),
  ('item-0003-0003-0003-000000000003', 'INV-001003', 'A4 Copy Paper', 'White A4 paper, 500 sheets per ream', '77777777-7777-7777-7777-777777777777', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ream', 25, 20, 100, 8.99),
  ('item-0004-0004-0004-000000000004', 'INV-001004', 'Mechanical Keyboard', 'RGB mechanical keyboard with blue switches', '55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'unit', 8, 5, 50, 89.99),
  ('item-0005-0005-0005-000000000005', 'INV-001005', 'All-Purpose Cleaner', 'Multi-surface cleaning spray, 500ml', '33333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bottle', 3, 10, 50, 5.99),
  ('item-0006-0006-0006-000000000006', 'INV-001006', 'Office Chair', 'Ergonomic office chair with lumbar support', '44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'unit', 12, 5, 30, 299.99),
  ('item-0007-0007-0007-000000000007', 'INV-001007', 'HDMI Cable 2m', 'High-speed HDMI 2.1 cable, 2 meters', '66666666-6666-6666-6666-666666666666', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'unit', 0, 20, 100, 15.99),
  ('item-0008-0008-0008-000000000008', 'INV-001008', 'Sticky Notes Pack', 'Assorted color sticky notes, 12 pads', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'pack', 42, 15, 80, 6.99)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SAMPLE ALERTS (will be generated automatically by triggers too)
-- ============================================
INSERT INTO public.alerts (type, severity, title, message, item_id) VALUES
  ('low_stock', 'critical', 'Critical: Out of Stock', 'Item "HDMI Cable 2m" (SKU: INV-001007) has 0 unit(s) remaining. Minimum level: 20', 'item-0007-0007-0007-000000000007'),
  ('low_stock', 'warning', 'Low Stock Alert', 'Item "All-Purpose Cleaner" (SKU: INV-001005) has 3 bottle(s) remaining. Minimum level: 10', 'item-0005-0005-0005-000000000005'),
  ('system', 'info', 'Welcome to Inventory Tracker', 'Your inventory management system is ready to use. Start by adding items and locations.', NULL)
ON CONFLICT DO NOTHING;
