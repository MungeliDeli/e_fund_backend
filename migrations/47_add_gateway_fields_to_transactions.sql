-- Add gateway lifecycle tracking fields to transactions table
-- Note: adjust enum extension if status is an enum in your schema

ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "gatewayRequestId" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "gatewayResponse" JSONB,
  ADD COLUMN IF NOT EXISTS "webhookReceived" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "processingStartedAt" TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS "processingCompletedAt" TIMESTAMP NULL;

-- If using a CHECK or ENUM for status, ensure it supports 'processing', 'timeout', 'cancelled'
-- Example for TEXT status with CHECK (uncomment and adapt if needed):
-- ALTER TABLE "transactions"
--   DROP CONSTRAINT IF EXISTS transactions_status_check,
--   ADD CONSTRAINT transactions_status_check CHECK ("status" IN ('pending','processing','succeeded','failed','timeout','cancelled'));


