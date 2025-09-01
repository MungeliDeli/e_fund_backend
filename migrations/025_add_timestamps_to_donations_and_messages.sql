-- Migration: Add createdAt and updatedAt to donations and donationMessages
-- Purpose: Ensure timestamp auditing on insert and update operations

-- 1) Create or replace a shared trigger function to update updatedAt
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) donationMessages: add columns if missing
ALTER TABLE "donationMessages"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create or replace trigger for donationMessages
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_set_updated_at_donationMessages'
  ) THEN
    DROP TRIGGER trg_set_updated_at_donationMessages ON "donationMessages";
  END IF;

  CREATE TRIGGER trg_set_updated_at_donationMessages
  BEFORE UPDATE ON "donationMessages"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();
END $$;

-- 3) donations: add columns if missing
ALTER TABLE "donations"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create or replace trigger for donations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_set_updated_at_donations'
  ) THEN
    DROP TRIGGER trg_set_updated_at_donations ON "donations";
  END IF;

  CREATE TRIGGER trg_set_updated_at_donations
  BEFORE UPDATE ON "donations"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();
END $$;

