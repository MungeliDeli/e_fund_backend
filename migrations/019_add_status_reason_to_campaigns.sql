-- Add statusReason column to campaigns for rejection/cancellation notes
BEGIN;

ALTER TABLE "campaigns"
ADD COLUMN IF NOT EXISTS "statusReason" TEXT;

COMMIT;

