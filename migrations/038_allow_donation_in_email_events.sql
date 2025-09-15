-- Migration: Allow 'donation' in emailEvents type check
-- Purpose: Extend outreach analytics to record donation events

BEGIN;

-- Drop existing constraint and recreate with extended enum set
ALTER TABLE "emailEvents"
  DROP CONSTRAINT IF EXISTS "emailEvents_type_check";

ALTER TABLE "emailEvents"
  ADD CONSTRAINT "emailEvents_type_check"
  CHECK ("type" IN ('sent', 'open', 'click', 'donation'));

COMMIT;

