-- Migration: Ensure essential indexes for outreach analytics
-- Purpose: Confirm needed indexes exist for efficient Phase 1 queries

-- Email events: composite index on (linkTokenId, type)
CREATE INDEX IF NOT EXISTS "idx_emailEvents_linkToken_type"
ON "emailEvents"("linkTokenId", "type");

-- Donations: single index on linkTokenId (for attribution joins)
CREATE INDEX IF NOT EXISTS "idx_donations_linkTokenId"
ON "donations"("linkTokenId");

-- Donations: composite indexes helpful for attribution by campaign
CREATE INDEX IF NOT EXISTS "idx_donations_campaign_linkToken"
ON "donations"("campaignId", "linkTokenId");

CREATE INDEX IF NOT EXISTS "idx_donations_campaign_contact"
ON "donations"("campaignId", "contactId");

