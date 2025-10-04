-- Migration: Extend transactions table with gateway tracking fields
-- Notes:
-- - Adds columns for gateway request/response tracking and timings
-- - Adds webhook receipt marker
-- - Extends status check constraint to include processing states

BEGIN;

-- 1) Add new columns
ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "gatewayRequestId" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "gatewayResponse" JSONB,
  ADD COLUMN IF NOT EXISTS "webhookReceived" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "processingStartedAt" TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS "processingCompletedAt" TIMESTAMP WITH TIME ZONE;

-- 2) Replace status CHECK constraint to include new states
--    Existing constraint is unnamed; find and drop it dynamically
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.constraint_name INTO constraint_name
  FROM information_schema.table_constraints con
  WHERE con.table_name = 'transactions'
    AND con.constraint_type = 'CHECK';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE "transactions" DROP CONSTRAINT %I', constraint_name);
  END IF;

  -- Add new CHECK constraint with expanded states
  EXECUTE '
    ALTER TABLE "transactions"
    ADD CONSTRAINT transactions_status_check
    CHECK ("status" IN (
      ''pending'', ''processing'', ''succeeded'', ''failed'', ''refunded'', ''timeout'', ''cancelled''
    ))
  ';
END$$;

-- 3) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_transactions_gatewayRequestId
  ON "transactions"("gatewayRequestId");

CREATE INDEX IF NOT EXISTS idx_transactions_webhookReceived
  ON "transactions"("webhookReceived");

COMMIT;


