-- Migration: Create campaigns table
-- Purpose: Stores details of each fundraising campaign

CREATE TABLE "campaigns" (
    "campaignId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "organizerId" UUID NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
    "title" VARCHAR(255),
    "description" TEXT,
    "goalAmount" NUMERIC(12, 2) NOT NULL,
    "currentRaisedAmount" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "startDate" TIMESTAMP WITH TIME ZONE,
    "endDate" TIMESTAMP WITH TIME ZONE,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pendingApproval', 'active', 'successful', 'closed', 'cancelled', 'rejected')),
    "mainMediaId" UUID REFERENCES "media"("mediaId") ON DELETE SET NULL,
    "campaignLogoMediaId" UUID REFERENCES "media"("mediaId") ON DELETE SET NULL,
    "customPageSettings" JSONB,
    "shareLink" TEXT UNIQUE,
    "approvedByUserId" UUID REFERENCES "users"("userId") ON DELETE SET NULL,
    "approvedAt" TIMESTAMP WITH TIME ZONE,
    "templateId" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
    CREATE INDEX idx_campaigns_organizerId ON "campaigns"("organizerId");
CREATE INDEX idx_campaigns_status ON "campaigns"("status");
CREATE INDEX idx_campaigns_templateId ON "campaigns"("templateId");
CREATE INDEX idx_campaigns_shareLink ON "campaigns"("shareLink");
CREATE INDEX idx_campaigns_createdAt ON "campaigns"("createdAt");

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaigns_updated_at
    BEFORE UPDATE ON "campaigns"
    FOR EACH ROW
    EXECUTE FUNCTION update_campaigns_updated_at();

-- Create campaignCategories bridge table for many-to-many relationship
CREATE TABLE IF NOT EXISTS "campaignCategories" (
    "campaignId" UUID NOT NULL REFERENCES "campaigns"("campaignId") ON DELETE CASCADE,
    "categoryId" UUID NOT NULL REFERENCES "categories"("categoryId") ON DELETE CASCADE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("campaignId", "categoryId")
);

-- Create indexes for campaign_categories
CREATE INDEX idx_campaignCategories_campaignId ON "campaignCategories"("campaignId");
CREATE INDEX idx_campaignCategories_categoryId ON "campaignCategories"("categoryId"); 