/**
 * Optimized Outreach Campaign Analytics Service
 *
 * Provides high-performance analytics using materialized views and optimized queries.
 * This service is designed for dashboard loading and real-time analytics.
 *
 * Key Features:
 * - Materialized view integration
 * - Optimized aggregation queries
 * - Cached statistics
 * - Performance monitoring
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { query } from "../../../db/index.js";
import { refresh_outreach_campaign_stats } from "../../../db/index.js";
import logger from "../../../utils/logger.js";
import { NotFoundError, DatabaseError } from "../../../utils/appError.js";

/**
 * Get outreach campaign statistics using materialized view
 * @param {string} outreachCampaignId - Outreach campaign ID
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Object>} Campaign statistics
 */
export const getOutreachCampaignStatsOptimized = async (
  outreachCampaignId,
  organizerId
) => {
  try {
    // First verify the outreach campaign exists and belongs to organizer
    const verifyQuery = `
      SELECT "outreachCampaignId", "campaignId", "name", "status"
      FROM "outreachCampaigns"
      WHERE "outreachCampaignId" = $1 AND "organizerId" = $2
    `;

    const verifyResult = await query(verifyQuery, [
      outreachCampaignId,
      organizerId,
    ]);

    if (verifyResult.rows.length === 0) {
      throw new NotFoundError("Outreach campaign not found");
    }

    const campaign = verifyResult.rows[0];

    // Get statistics from materialized view
    const statsQuery = `
      SELECT 
        "outreachCampaignId",
        "outreachCampaignName",
        "status",
        "createdAt",
        "updatedAt",
        "inviteTokens",
        "updateTokens", 
        "thanksTokens",
        "uniqueSent",
        "uniqueOpened",
        "uniqueClicked",
        "totalClicks",
        "uniqueDonors",
        "totalDonations",
        "totalAmount",
        "openRate",
        "clickRate",
        "conversionRate"
      FROM "outreachCampaignStats"
      WHERE "outreachCampaignId" = $1
    `;

    const statsResult = await query(statsQuery, [outreachCampaignId]);

    if (statsResult.rows.length === 0) {
      // If no stats in materialized view, refresh it
      await refreshOutreachCampaignStats();
      const refreshedResult = await query(statsQuery, [outreachCampaignId]);

      if (refreshedResult.rows.length === 0) {
        // Return empty stats if still no data
        return {
          outreachCampaignId,
          campaignId: campaign.campaignId,
          name: campaign.name,
          status: campaign.status,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt,
          stats: {
            sends: 0,
            uniqueOpens: 0,
            uniqueClicks: 0,
            totalClicks: 0,
            donations: 0,
            totalAmount: 0,
            openRate: 0,
            clickRate: 0,
            conversionRate: 0,
          },
        };
      }

      return formatStatsResponse(refreshedResult.rows[0], campaign);
    }

    return formatStatsResponse(statsResult.rows[0], campaign);
  } catch (error) {
    logger.error("Failed to get optimized outreach campaign stats", {
      error: error.message,
      outreachCampaignId,
      organizerId,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new DatabaseError("Failed to get campaign statistics", error);
  }
};

/**
 * Get multiple outreach campaign statistics efficiently
 * @param {string} campaignId - Campaign ID
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Array>} List of outreach campaign statistics
 */
export const getMultipleOutreachCampaignStatsOptimized = async (
  campaignId,
  organizerId
) => {
  try {
    const statsQuery = `
      SELECT 
        ocs."outreachCampaignId",
        ocs."outreachCampaignName",
        ocs."status",
        ocs."createdAt",
        ocs."updatedAt",
        ocs."uniqueSent",
        ocs."uniqueOpened",
        ocs."uniqueClicked",
        ocs."totalClicks",
        ocs."uniqueDonors",
        ocs."totalDonations",
        ocs."totalAmount",
        ocs."openRate",
        ocs."clickRate",
        ocs."conversionRate"
      FROM "outreachCampaignStats" ocs
      JOIN "outreachCampaigns" oc ON ocs."outreachCampaignId" = oc."outreachCampaignId"
      WHERE oc."campaignId" = $1 AND oc."organizerId" = $2
      ORDER BY ocs."createdAt" DESC
    `;

    const result = await query(statsQuery, [campaignId, organizerId]);

    return result.rows.map((row) => ({
      outreachCampaignId: row.outreachCampaignId,
      name: row.outreachCampaignName,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      stats: {
        sends: row.uniqueSent || 0,
        uniqueOpens: row.uniqueOpened || 0,
        uniqueClicks: row.uniqueClicked || 0,
        totalClicks: row.totalClicks || 0,
        donations: row.uniqueDonors || 0,
        totalAmount: row.totalAmount || 0,
        openRate: row.openRate || 0,
        clickRate: row.clickRate || 0,
        conversionRate: row.conversionRate || 0,
      },
    }));
  } catch (error) {
    logger.error("Failed to get multiple outreach campaign stats", {
      error: error.message,
      campaignId,
      organizerId,
    });

    throw new DatabaseError("Failed to get campaign statistics", error);
  }
};

/**
 * Get real-time engagement metrics for an outreach campaign
 * @param {string} outreachCampaignId - Outreach campaign ID
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Object>} Real-time engagement data
 */
export const getRealTimeEngagementMetrics = async (
  outreachCampaignId,
  organizerId
) => {
  try {
    // Verify access
    const verifyQuery = `
      SELECT "outreachCampaignId" FROM "outreachCampaigns"
      WHERE "outreachCampaignId" = $1 AND "organizerId" = $2
    `;

    const verifyResult = await query(verifyQuery, [
      outreachCampaignId,
      organizerId,
    ]);

    if (verifyResult.rows.length === 0) {
      throw new NotFoundError("Outreach campaign not found");
    }

    // Get real-time metrics (last 24 hours)
    const metricsQuery = `
      SELECT 
        COUNT(DISTINCT CASE WHEN ee."type" = 'open' AND ee."createdAt" >= NOW() - INTERVAL '24 hours' THEN ee."contactId" END) as "opensLast24h",
        COUNT(DISTINCT CASE WHEN ee."type" = 'click' AND ee."createdAt" >= NOW() - INTERVAL '24 hours' THEN ee."contactId" END) as "clicksLast24h",
        COUNT(DISTINCT CASE WHEN d."createdAt" >= NOW() - INTERVAL '24 hours' THEN d."contactId" END) as "donationsLast24h",
        COALESCE(SUM(CASE WHEN d."createdAt" >= NOW() - INTERVAL '24 hours' THEN d."amount" END), 0) as "amountLast24h"
      FROM "linkTokens" lt
      LEFT JOIN "emailEvents" ee ON lt."linkTokenId" = ee."linkTokenId"
      LEFT JOIN "donations" d ON lt."contactId" = d."contactId" AND lt."campaignId" = d."campaignId"
      WHERE lt."outreachCampaignId" = $1
    `;

    const result = await query(metricsQuery, [outreachCampaignId]);

    return {
      last24Hours: {
        opens: parseInt(result.rows[0].opensLast24h) || 0,
        clicks: parseInt(result.rows[0].clicksLast24h) || 0,
        donations: parseInt(result.rows[0].donationsLast24h) || 0,
        amount: parseFloat(result.rows[0].amountLast24h) || 0,
      },
    };
  } catch (error) {
    logger.error("Failed to get real-time engagement metrics", {
      error: error.message,
      outreachCampaignId,
      organizerId,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new DatabaseError("Failed to get engagement metrics", error);
  }
};

/**
 * Refresh outreach campaign statistics materialized view
 * @returns {Promise<void>}
 */
export const refreshOutreachCampaignStats = async () => {
  try {
    await query("SELECT refresh_outreach_campaign_stats()");
    logger.info("Outreach campaign stats materialized view refreshed");
  } catch (error) {
    logger.error("Failed to refresh outreach campaign stats", {
      error: error.message,
    });
    throw new DatabaseError("Failed to refresh statistics", error);
  }
};

/**
 * Format statistics response
 * @param {Object} statsRow - Row from materialized view
 * @param {Object} campaign - Campaign basic info
 * @returns {Object} Formatted response
 */
const formatStatsResponse = (statsRow, campaign) => {
  return {
    outreachCampaignId: statsRow.outreachCampaignId,
    campaignId: campaign.campaignId,
    name: statsRow.outreachCampaignName,
    status: statsRow.status,
    createdAt: statsRow.createdAt,
    updatedAt: statsRow.updatedAt,
    stats: {
      sends: statsRow.uniqueSent || 0,
      uniqueOpens: statsRow.uniqueOpened || 0,
      uniqueClicks: statsRow.uniqueClicked || 0,
      totalClicks: statsRow.totalClicks || 0,
      donations: statsRow.uniqueDonors || 0,
      totalAmount: statsRow.totalAmount || 0,
      openRate: statsRow.openRate || 0,
      clickRate: statsRow.clickRate || 0,
      conversionRate: statsRow.conversionRate || 0,
    },
  };
};
