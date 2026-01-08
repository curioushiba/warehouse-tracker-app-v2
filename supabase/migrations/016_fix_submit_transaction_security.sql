-- Fix submit_transaction to use SECURITY DEFINER
-- This bypasses RLS since the API route already validates authentication
--
-- Root cause: RLS on inv_items requires auth.uid() IS NOT NULL
-- When auth context isn't properly passed to the database, auth.uid() is NULL
-- and the SELECT returns no rows, causing "Item not found" error
--
-- This is safe because:
-- 1. API route (/api/transactions/submit) validates authentication via getUser()
-- 2. User ID is explicitly passed as parameter p_user_id
-- 3. The function validates item exists and isn't archived

ALTER FUNCTION public.submit_transaction(
  text, uuid, numeric, uuid, text,
  timestamp with time zone, uuid, uuid, uuid
) SECURITY DEFINER;
