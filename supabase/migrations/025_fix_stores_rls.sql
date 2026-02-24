-- Fix inv_stores RLS policies to use public.is_admin() SECURITY DEFINER helper
-- instead of inline EXISTS subqueries that fail due to profiles RLS

DROP POLICY "Admins can insert stores" ON inv_stores;
CREATE POLICY "Admins can insert stores" ON inv_stores FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY "Admins can update stores" ON inv_stores;
CREATE POLICY "Admins can update stores" ON inv_stores FOR UPDATE TO authenticated USING (public.is_admin());

DROP POLICY "Admins can delete stores" ON inv_stores;
CREATE POLICY "Admins can delete stores" ON inv_stores FOR DELETE TO authenticated USING (public.is_admin());
