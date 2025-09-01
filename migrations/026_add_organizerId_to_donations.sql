-- Migration: Add organizerId to donations and backfill

-- 1) Add nullable column first
ALTER TABLE "donations"
ADD COLUMN IF NOT EXISTS "organizerId" UUID;

-- 2) Backfill from campaigns.organizerId
UPDATE "donations" d
SET "organizerId" = c."organizerId"
FROM "campaigns" c
WHERE d."campaignId" = c."campaignId" AND d."organizerId" IS NULL;

-- 3) Add NOT NULL constraint after backfill
ALTER TABLE "donations"
ALTER COLUMN "organizerId" SET NOT NULL;

-- 4) Add index for organizerId to speed up organizer-scoped queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = ANY (current_schemas(false))
      AND indexname = 'idx_donations_organizerId'
  ) THEN
    CREATE INDEX idx_donations_organizerId ON "donations"("organizerId");
  END IF;
END $$;

