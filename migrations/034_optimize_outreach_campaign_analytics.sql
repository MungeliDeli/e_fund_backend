-- Migration: Optimize outreach campaign analytics performance
-- Purpose: Add indexes for efficient outreach campaign queries and analytics

-- Link tokens: index on outreachCampaignId for fast filtering
CREATE INDEX IF NOT EXISTS "idx_linkTokens_outreachCampaignId"
ON "linkTokens"("outreachCampaignId");

-- Link tokens: composite index for outreach campaign + contact queries
CREATE INDEX IF NOT EXISTS "idx_linkTokens_outreachCampaign_contact"
ON "linkTokens"("outreachCampaignId", "contactId");

-- Link tokens: composite index for outreach campaign + type queries
CREATE INDEX IF NOT EXISTS "idx_linkTokens_outreachCampaign_type"
ON "linkTokens"("outreachCampaignId", "type");

-- Email events: composite index for outreach campaign analytics
-- This will help with queries that need to join emailEvents -> linkTokens -> outreachCampaigns
CREATE INDEX IF NOT EXISTS "idx_emailEvents_contact_type"
ON "emailEvents"("contactId", "type");

-- Email events: index on createdAt for time-based analytics
CREATE INDEX IF NOT EXISTS "idx_emailEvents_createdAt"
ON "emailEvents"("createdAt");

-- Outreach campaigns: index on campaignId for fast lookups
CREATE INDEX IF NOT EXISTS "idx_outreachCampaigns_campaignId"
ON "outreachCampaigns"("campaignId");

-- Outreach campaigns: index on status for filtering
CREATE INDEX IF NOT EXISTS "idx_outreachCampaigns_status"
ON "outreachCampaigns"("status");

-- Contacts: index on segmentId for fast contact filtering
CREATE INDEX IF NOT EXISTS "idx_contacts_segmentId"
ON "contacts"("segmentId");

-- Contacts: index on email for fast lookups
CREATE INDEX IF NOT EXISTS "idx_contacts_email"
ON "contacts"("email");

-- Donations: composite index for outreach campaign attribution
-- This helps with queries that need to find donations by outreach campaign
CREATE INDEX IF NOT EXISTS "idx_donations_contact_campaign"
ON "donations"("contactId", "campaignId");

-- Donations: index on createdAt for time-based analytics
CREATE INDEX IF NOT EXISTS "idx_donations_createdAt"
ON "donations"("createdAt");