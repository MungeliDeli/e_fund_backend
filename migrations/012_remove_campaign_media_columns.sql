-- Migration: Remove main_media_id and campaign_logo_media_id from campaigns table
ALTER TABLE campaigns
  DROP COLUMN IF EXISTS main_media_id,
  DROP COLUMN IF EXISTS campaign_logo_media_id;

-- Down migration: add columns back (if needed)
-- (You may want to adjust types/constraints as needed)
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS main_media_id UUID REFERENCES media(media_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_logo_media_id UUID REFERENCES media(media_id) ON DELETE SET NULL;