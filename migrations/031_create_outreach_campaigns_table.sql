-- Migration: Create outreachCampaigns table
-- Purpose: Stores named outreach campaigns per fundraising campaign

CREATE TABLE "outreachCampaigns" (
    "outreachCampaignId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active' CHECK ("status" IN ('draft','active','archived')),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fk_outreachCampaigns_campaignId"
        FOREIGN KEY ("campaignId")
        REFERENCES "campaigns"("campaignId")
        ON DELETE CASCADE,

    CONSTRAINT "uq_outreachCampaigns_campaign_name"
        UNIQUE ("campaignId", "name")
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS "idx_outreachCampaigns_campaignId" ON "outreachCampaigns"("campaignId");
CREATE INDEX IF NOT EXISTS "idx_outreachCampaigns_status" ON "outreachCampaigns"("status");
CREATE INDEX IF NOT EXISTS "idx_outreachCampaigns_createdAt" ON "outreachCampaigns"("createdAt");

