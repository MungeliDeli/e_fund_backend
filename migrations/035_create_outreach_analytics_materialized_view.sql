-- Migration: Create materialized view for outreach campaign analytics
-- Purpose: Pre-compute analytics for fast dashboard loading

-- Create materialized view for outreach campaign statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS "outreachCampaignStats" AS
SELECT 
    oc."outreachCampaignId",
    oc."campaignId",
    oc."name" as "outreachCampaignName",
    oc."status",
    oc."createdAt",
    oc."updatedAt",
    
    -- Link token counts by type
    COUNT(CASE WHEN lt."type" = 'invite' THEN 1 END) as "inviteTokens",
    COUNT(CASE WHEN lt."type" = 'update' THEN 1 END) as "updateTokens",
    COUNT(CASE WHEN lt."type" = 'thanks' THEN 1 END) as "thanksTokens",
    
    -- Email event counts
    COUNT(DISTINCT CASE WHEN ee."type" = 'sent' THEN ee."contactId" END) as "uniqueSent",
    COUNT(DISTINCT CASE WHEN ee."type" = 'open' THEN ee."contactId" END) as "uniqueOpened",
    COUNT(DISTINCT CASE WHEN ee."type" = 'click' THEN ee."contactId" END) as "uniqueClicked",
    
    -- Total click count (including multiple clicks per contact)
    COUNT(CASE WHEN ee."type" = 'click' THEN 1 END) as "totalClicks",
    
    -- Donation statistics
    COUNT(DISTINCT CASE WHEN d."contactId" IS NOT NULL THEN d."contactId" END) as "uniqueDonors",
    COUNT(d."donationId") as "totalDonations",
    COALESCE(SUM(d."amount"), 0) as "totalAmount",
    
    -- Engagement rates (calculated)
    CASE 
        WHEN COUNT(DISTINCT CASE WHEN ee."type" = 'sent' THEN ee."contactId" END) > 0 
        THEN ROUND(
            (COUNT(DISTINCT CASE WHEN ee."type" = 'open' THEN ee."contactId" END)::DECIMAL / 
             COUNT(DISTINCT CASE WHEN ee."type" = 'sent' THEN ee."contactId" END)) * 100, 2
        )
        ELSE 0 
    END as "openRate",
    
    CASE 
        WHEN COUNT(DISTINCT CASE WHEN ee."type" = 'sent' THEN ee."contactId" END) > 0 
        THEN ROUND(
            (COUNT(DISTINCT CASE WHEN ee."type" = 'click' THEN ee."contactId" END)::DECIMAL / 
             COUNT(DISTINCT CASE WHEN ee."type" = 'sent' THEN ee."contactId" END)) * 100, 2
        )
        ELSE 0 
    END as "clickRate",
    
    CASE 
        WHEN COUNT(DISTINCT CASE WHEN ee."type" = 'sent' THEN ee."contactId" END) > 0 
        THEN ROUND(
            (COUNT(DISTINCT CASE WHEN d."contactId" IS NOT NULL THEN d."contactId" END)::DECIMAL / 
             COUNT(DISTINCT CASE WHEN ee."type" = 'sent' THEN ee."contactId" END)) * 100, 2
        )
        ELSE 0 
    END as "conversionRate"

FROM "outreachCampaigns" oc
LEFT JOIN "linkTokens" lt ON oc."outreachCampaignId" = lt."outreachCampaignId"
LEFT JOIN "emailEvents" ee ON lt."linkTokenId" = ee."linkTokenId"
LEFT JOIN "donations" d ON lt."contactId" = d."contactId" AND lt."campaignId" = d."campaignId"
GROUP BY oc."outreachCampaignId", oc."campaignId", oc."name", oc."status", oc."createdAt", oc."updatedAt";

-- Create unique index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS "idx_outreachCampaignStats_outreachCampaignId"
ON "outreachCampaigns"("outreachCampaignId");

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_outreach_campaign_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY "outreachCampaignStats";
END;
$$ LANGUAGE plpgsql;

-- Create function to refresh stats for a specific outreach campaign
CREATE OR REPLACE FUNCTION refresh_outreach_campaign_stats_for_campaign(campaign_id UUID)
RETURNS void AS $$
BEGIN
    -- For now, we'll refresh the entire view
    -- In a production system, you might want to implement incremental updates
    REFRESH MATERIALIZED VIEW CONCURRENTLY "outreachCampaignStats";
END;
$$ LANGUAGE plpgsql;