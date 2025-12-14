-- Migration: Add image support for inventory items
-- This migration adds:
-- 1. image_url column to inv_items table
-- 2. Supabase Storage bucket for item images with RLS policies

-- Add image_url column to inv_items table
ALTER TABLE public.inv_items
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create index for items with images (useful for filtering)
CREATE INDEX IF NOT EXISTS idx_inv_items_has_image
ON public.inv_items ((image_url IS NOT NULL));

-- Note: Storage bucket and policies must be created via Supabase Dashboard or CLI
-- The following SQL is provided for reference but should be run separately:
--
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'item-images',
--   'item-images',
--   true,
--   10485760,  -- 10MB limit
--   ARRAY['image/jpeg', 'image/png', 'image/webp']
-- );
--
-- Storage RLS policies (create in Supabase Dashboard):
-- 1. SELECT: Allow public read access
-- 2. INSERT: Allow authenticated users to upload
-- 3. UPDATE: Allow authenticated users to update their uploads
-- 4. DELETE: Allow authenticated users to delete
