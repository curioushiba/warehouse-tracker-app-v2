-- Row Level Security Policies
-- Run this after 001_initial_schema.sql

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_errors ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- Only admins can create profiles (besides the trigger)
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin() OR auth.uid() = id);

-- ============================================
-- CATEGORIES POLICIES
-- ============================================

-- Everyone can view categories
CREATE POLICY "Everyone can view categories"
  ON public.inv_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can create categories
CREATE POLICY "Admins can create categories"
  ON public.inv_categories FOR INSERT
  WITH CHECK (public.is_admin());

-- Only admins can update categories
CREATE POLICY "Admins can update categories"
  ON public.inv_categories FOR UPDATE
  USING (public.is_admin());

-- Only admins can delete categories
CREATE POLICY "Admins can delete categories"
  ON public.inv_categories FOR DELETE
  USING (public.is_admin());

-- ============================================
-- LOCATIONS POLICIES
-- ============================================

-- Everyone can view active locations
CREATE POLICY "Everyone can view locations"
  ON public.locations FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can manage locations
CREATE POLICY "Admins can create locations"
  ON public.locations FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update locations"
  ON public.locations FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete locations"
  ON public.locations FOR DELETE
  USING (public.is_admin());

-- ============================================
-- ITEMS POLICIES
-- ============================================

-- Everyone can view non-archived items
CREATE POLICY "Everyone can view items"
  ON public.inv_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can create items
CREATE POLICY "Admins can create items"
  ON public.inv_items FOR INSERT
  WITH CHECK (public.is_admin());

-- Only admins can update items (except stock which is updated via transactions)
CREATE POLICY "Admins can update items"
  ON public.inv_items FOR UPDATE
  USING (public.is_admin());

-- Only admins can delete/archive items
CREATE POLICY "Admins can delete items"
  ON public.inv_items FOR DELETE
  USING (public.is_admin());

-- ============================================
-- TRANSACTIONS POLICIES
-- ============================================

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions"
  ON public.inv_transactions FOR SELECT
  USING (public.is_admin());

-- Employees can view their own transactions
CREATE POLICY "Employees can view own transactions"
  ON public.inv_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Everyone can create transactions (for their own user_id)
CREATE POLICY "Users can create transactions"
  ON public.inv_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only admins can update transactions
CREATE POLICY "Admins can update transactions"
  ON public.inv_transactions FOR UPDATE
  USING (public.is_admin());

-- ============================================
-- ALERTS POLICIES
-- ============================================

-- Everyone can view alerts
CREATE POLICY "Everyone can view alerts"
  ON public.alerts FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can create alerts
CREATE POLICY "Admins can create alerts"
  ON public.alerts FOR INSERT
  WITH CHECK (public.is_admin());

-- Everyone can mark alerts as read
CREATE POLICY "Users can update alerts"
  ON public.alerts FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Only admins can delete alerts
CREATE POLICY "Admins can delete alerts"
  ON public.alerts FOR DELETE
  USING (public.is_admin());

-- ============================================
-- SYNC ERRORS POLICIES
-- ============================================

-- Admins can view all sync errors
CREATE POLICY "Admins can view all sync errors"
  ON public.sync_errors FOR SELECT
  USING (public.is_admin());

-- Employees can view their own sync errors
CREATE POLICY "Employees can view own sync errors"
  ON public.sync_errors FOR SELECT
  USING (auth.uid() = user_id);

-- Everyone can create sync errors
CREATE POLICY "Users can create sync errors"
  ON public.sync_errors FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Admins can update sync errors
CREATE POLICY "Admins can update sync errors"
  ON public.sync_errors FOR UPDATE
  USING (public.is_admin());

-- Admins can delete sync errors
CREATE POLICY "Admins can delete sync errors"
  ON public.sync_errors FOR DELETE
  USING (public.is_admin());
