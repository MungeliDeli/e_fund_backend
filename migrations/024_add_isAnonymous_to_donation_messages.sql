-- Migration: Add isAnonymous column to donationMessages
-- Purpose: Align donationMessages schema with application code expecting isAnonymous

ALTER TABLE "donationMessages"
ADD COLUMN IF NOT EXISTS "isAnonymous" BOOLEAN NOT NULL DEFAULT FALSE;

-- Optional: index if frequently filtered by anonymity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = ANY (current_schemas(false))
      AND indexname = 'idx_donationMessages_isAnonymous'
  ) THEN
    CREATE INDEX idx_donationMessages_isAnonymous ON "donationMessages"("isAnonymous");
  END IF;
END $$;

