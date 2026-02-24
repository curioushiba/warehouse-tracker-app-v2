-- Create inv_stores table
CREATE TABLE IF NOT EXISTS inv_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add store_id to inv_items
ALTER TABLE inv_items ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES inv_stores(id) ON DELETE SET NULL;

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_inv_items_store_id ON inv_items(store_id);

-- Enable RLS
ALTER TABLE inv_stores ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read stores
CREATE POLICY "Authenticated users can read stores"
  ON inv_stores FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert stores
CREATE POLICY "Admins can insert stores"
  ON inv_stores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update stores
CREATE POLICY "Admins can update stores"
  ON inv_stores FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can delete stores
CREATE POLICY "Admins can delete stores"
  ON inv_stores FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
