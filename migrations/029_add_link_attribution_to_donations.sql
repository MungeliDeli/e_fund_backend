-- Migration: Add link attribution columns to donations table
-- Purpose: Track which outreach link led to donations for attribution analytics

-- Add linkTokenId column for tracking which link led to the donation
ALTER TABLE "donations"
ADD COLUMN IF NOT EXISTS "linkTokenId" UUID;

-- Add contactId column for tracking which contact made the donation
ALTER TABLE "donations"
ADD COLUMN IF NOT EXISTS "contactId" UUID;

-- Add foreign key constraints
ALTER TABLE "donations"
ADD CONSTRAINT "fk_donations_linkTokenId" 
    FOREIGN KEY ("linkTokenId") 
    REFERENCES "linkTokens"("linkTokenId") 
    ON DELETE SET NULL;

ALTER TABLE "donations"
ADD CONSTRAINT "fk_donations_contactId" 
    FOREIGN KEY ("contactId") 
    REFERENCES "contacts"("contactId") 
    ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_donations_linkTokenId" ON "donations"("linkTokenId");
CREATE INDEX IF NOT EXISTS "idx_donations_contactId" ON "donations"("contactId");

-- Create composite index for common attribution queries
CREATE INDEX IF NOT EXISTS "idx_donations_campaign_linkToken" ON "donations"("campaignId", "linkTokenId");
CREATE INDEX IF NOT EXISTS "idx_donations_campaign_contact" ON "donations"("campaignId", "contactId"); 