-- Add "Frozen Goods" category for the frozen goods section
INSERT INTO public.inv_categories (name, description) VALUES
  ('Frozen Goods', 'Frozen food and perishable items')
ON CONFLICT DO NOTHING;
