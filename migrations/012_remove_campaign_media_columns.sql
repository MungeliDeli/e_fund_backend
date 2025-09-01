-- Migration: Remove main_media_id and campaign_logo_media_id from campaigns table
ALTER TABLE "campaigns"
  DROP COLUMN IF EXISTS "mainMediaId",
  DROP COLUMN IF EXISTS "campaignLogoMediaId";

-- Down migration: add columns back (if needed)
-- (You may want to adjust types/constraints as needed)
ALTER TABLE "campaigns"
  ADD COLUMN IF NOT EXISTS "mainMediaId" UUID REFERENCES "media"("mediaId") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "campaignLogoMediaId" UUID REFERENCES "media"("mediaId") ON DELETE SET NULL;