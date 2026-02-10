-- Enable Supabase Realtime on inv_transactions table.
-- This allows the admin dashboard to receive live updates when
-- employees submit transactions from other devices/browsers.
-- Note: RLS is already enabled on inv_transactions (see 002_rls_policies.sql),
-- so Realtime events are filtered per-user according to existing policies.
ALTER PUBLICATION supabase_realtime ADD TABLE inv_transactions;
