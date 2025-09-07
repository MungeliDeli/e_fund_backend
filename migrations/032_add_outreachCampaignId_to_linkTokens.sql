-- Migration: Add outreachCampaignId to linkTokens
-- Purpose: Associate per-recipient link tokens to a named outreach campaign

ALTER TABLE "linkTokens"
ADD COLUMN IF NOT EXISTS "outreachCampaignId" UUID;

ALTER TABLE "linkTokens"
ADD CONSTRAINT "fk_linkTokens_outreachCampaignId"
FOREIGN KEY ("outreachCampaignId")
REFERENCES "outreachCampaigns"("outreachCampaignId")
ON DELETE SET NULL;

-- Index for faster analytics queries by outreach campaign
CREATE INDEX IF NOT EXISTS "idx_linkTokens_outreachCampaignId" ON "linkTokens"("outreachCampaignId");

