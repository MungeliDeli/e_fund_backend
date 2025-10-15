-- Migration: Add payout fields to organizationProfiles
-- Purpose: Store organizer payout information for withdrawals

BEGIN;

ALTER TABLE "organizationProfiles"
  ADD COLUMN IF NOT EXISTS "payoutDisplayName" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "payoutPhoneNumber" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "payoutNetwork" VARCHAR(10) CHECK ("payoutNetwork" IN ('mtn','airtel')),
  ADD COLUMN IF NOT EXISTS "payoutUpdatedAt" TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_organizationProfiles_payoutPhone
  ON "organizationProfiles"("payoutPhoneNumber");

COMMIT;


