-- Migration: Add event_timestamp to inv_transactions
-- This timestamp is server-validated for display/reporting purposes
--
-- event_timestamp captures the actual time the transaction occurred (validated from device_timestamp)
-- while server_timestamp remains the authoritative audit timestamp for when the server processed it.

-- Step 1: Add the column (nullable initially for backfill)
ALTER TABLE public.inv_transactions
ADD COLUMN IF NOT EXISTS event_timestamp TIMESTAMPTZ;

-- Step 2: Create index for queries/reporting
CREATE INDEX IF NOT EXISTS idx_inv_transactions_event_timestamp
ON public.inv_transactions(event_timestamp DESC);

-- Step 3: Backfill existing records using device_timestamp
UPDATE public.inv_transactions
SET event_timestamp = device_timestamp
WHERE event_timestamp IS NULL;

-- Step 4: Make column NOT NULL after backfill
ALTER TABLE public.inv_transactions
ALTER COLUMN event_timestamp SET NOT NULL;
