-- Migration: Fix outreach analytics materialized view issues
-- Purpose: Fix index reference and improve refresh function error handling

-- Drop the incorrect index if it exists
DROP INDEX IF EXISTS "idx_outreachCampaignStats_outreachCampaignId";

-- Create the correct unique index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS "idx_outreachCampaignStats_outreachCampaignId"
ON "outreachCampaignStats"("outreachCampaignId");

-- Update the refresh function to handle concurrent refresh failures gracefully
CREATE OR REPLACE FUNCTION refresh_outreach_campaign_stats()
RETURNS void AS $$
BEGIN
    -- First try to refresh concurrently, if that fails, refresh normally
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY "outreachCampaignStats";
    EXCEPTION WHEN OTHERS THEN
        REFRESH MATERIALIZED VIEW "outreachCampaignStats";
    END;
END;
$$ LANGUAGE plpgsql;

-- Update the campaign-specific refresh function as well
CREATE OR REPLACE FUNCTION refresh_outreach_campaign_stats_for_campaign(campaign_id UUID)
RETURNS void AS $$
BEGIN
    -- For now, we'll refresh the entire view
    -- In a production system, you might want to implement incremental updates
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY "outreachCampaignStats";
    EXCEPTION WHEN OTHERS THEN
        REFRESH MATERIALIZED VIEW "outreachCampaignStats";
    END;
END;
$$ LANGUAGE plpgsql;