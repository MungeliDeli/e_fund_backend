-- Migration: Create link_tokens table for outreach tracking
-- Purpose: Stores personalized tracking links for email campaigns and social sharing

CREATE TABLE "linkTokens" (
    "linkTokenId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "contactId" UUID,
    "segmentId" UUID,
    "type" VARCHAR(20) NOT NULL CHECK ("type" IN ('invite', 'update', 'thanks', 'share')),
    "prefillAmount" NUMERIC(12, 2),
    "personalizedMessage" TEXT,
    "utmSource" VARCHAR(100),
    "utmMedium" VARCHAR(100),
    "utmCampaign" VARCHAR(100),
    "utmContent" VARCHAR(100),
    "clicksCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "lastClickedAt" TIMESTAMP WITH TIME ZONE,
    
    -- Foreign key constraints
    CONSTRAINT "fk_linkTokens_campaignId" 
        FOREIGN KEY ("campaignId") 
        REFERENCES "campaigns"("campaignId") 
        ON DELETE CASCADE,
    
    CONSTRAINT "fk_linkTokens_contactId" 
        FOREIGN KEY ("contactId") 
        REFERENCES "contacts"("contactId") 
        ON DELETE CASCADE,
    
    CONSTRAINT "fk_linkTokens_segmentId" 
        FOREIGN KEY ("segmentId") 
        REFERENCES "segments"("segmentId") 
        ON DELETE CASCADE,
    
    -- Ensure either contactId or segmentId is provided, but not both
    CONSTRAINT "chk_linkTokens_contact_or_segment" 
        CHECK (
            ("contactId" IS NOT NULL AND "segmentId" IS NULL) OR 
            ("contactId" IS NULL AND "segmentId" IS NOT NULL)
        )
);

-- Create indexes for better performance
CREATE INDEX "idx_linkTokens_campaignId" ON "linkTokens"("campaignId");
CREATE INDEX "idx_linkTokens_contactId" ON "linkTokens"("contactId");
CREATE INDEX "idx_linkTokens_segmentId" ON "linkTokens"("segmentId");
CREATE INDEX "idx_linkTokens_type" ON "linkTokens"("type");
CREATE INDEX "idx_linkTokens_createdAt" ON "linkTokens"("createdAt");

-- Create unique constraint for campaign-contact-type combination
CREATE UNIQUE INDEX "idx_linkTokens_campaign_contact_type" 
    ON "linkTokens"("campaignId", "contactId", "type") 
    WHERE "contactId" IS NOT NULL;

-- Create unique constraint for campaign-segment-type combination
CREATE UNIQUE INDEX "idx_linkTokens_campaign_segment_type" 
    ON "linkTokens"("campaignId", "segmentId", "type") 
    WHERE "segmentId" IS NOT NULL; 