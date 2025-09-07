/**
 * Outreach Campaign Stats Refresh Service
 *
 * Handles automatic refresh of materialized views when new data is added.
 * This service ensures analytics remain up-to-date without manual intervention.
 *
 * Key Features:
 * - Automatic stats refresh on new events
 * - Batch refresh operations
 * - Performance monitoring
 * - Error handling and recovery
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { query } from "../../../db/index.js";
import logger from "../../../utils/logger.js";
import { DatabaseError } from "../../../utils/appError.js";

/**
 * Refresh stats for a specific outreach campaign
 * @param {string} outreachCampaignId - Outreach campaign ID
 * @returns {Promise<void>}
 */
export const refreshStatsForOutreachCampaign = async (outreachCampaignId) => {
  try {
    // For now, we refresh the entire materialized view
    // In a production system, you might want to implement incremental updates
    await query("SELECT refresh_outreach_campaign_stats()");

    logger.info("Outreach campaign stats refreshed", {
      outreachCampaignId,
    });
  } catch (error) {
    logger.error("Failed to refresh stats for outreach campaign", {
      error: error.message,
      outreachCampaignId,
    });

    // Don't throw error to avoid breaking the main flow
    // Just log the issue for monitoring
  }
};

/**
 * Refresh stats for multiple outreach campaigns
 * @param {Array<string>} outreachCampaignIds - Array of outreach campaign IDs
 * @returns {Promise<void>}
 */
export const refreshStatsForMultipleOutreachCampaigns = async (
  outreachCampaignIds
) => {
  try {
    if (!outreachCampaignIds || outreachCampaignIds.length === 0) {
      return;
    }

    // Refresh the entire materialized view
    await query("SELECT refresh_outreach_campaign_stats()");

    logger.info("Outreach campaign stats refreshed for multiple campaigns", {
      campaignCount: outreachCampaignIds.length,
      outreachCampaignIds,
    });
  } catch (error) {
    logger.error("Failed to refresh stats for multiple outreach campaigns", {
      error: error.message,
      outreachCampaignIds,
    });
  }
};

/**
 * Schedule periodic refresh of materialized views
 * This should be called from a cron job or scheduled task
 * @returns {Promise<void>}
 */
export const schedulePeriodicStatsRefresh = async () => {
  try {
    const startTime = Date.now();

    await query("SELECT refresh_outreach_campaign_stats()");

    const duration = Date.now() - startTime;

    logger.info("Periodic outreach campaign stats refresh completed", {
      duration: `${duration}ms`,
    });
  } catch (error) {
    logger.error("Failed to perform periodic stats refresh", {
      error: error.message,
    });

    throw new DatabaseError("Failed to refresh statistics", error);
  }
};

/**
 * Get materialized view refresh status
 * @returns {Promise<Object>} Refresh status information
 */
export const getMaterializedViewStatus = async () => {
  try {
    const statusQuery = `
      SELECT 
        schemaname,
        matviewname,
        matviewowner,
        tablespace,
        hasindexes,
        ispopulated,
        definition
      FROM pg_matviews 
      WHERE matviewname = 'outreachCampaignStats'
    `;

    const result = await query(statusQuery);

    if (result.rows.length === 0) {
      return {
        exists: false,
        status: "Materialized view does not exist",
      };
    }

    const view = result.rows[0];

    return {
      exists: true,
      isPopulated: view.ispopulated,
      hasIndexes: view.hasindexes,
      owner: view.matviewowner,
      tablespace: view.tablespace,
      status: view.ispopulated ? "Ready" : "Not populated",
    };
  } catch (error) {
    logger.error("Failed to get materialized view status", {
      error: error.message,
    });

    throw new DatabaseError("Failed to get view status", error);
  }
};

/**
 * Check if materialized view needs refresh based on data changes
 * @returns {Promise<boolean>} Whether refresh is needed
 */
export const needsStatsRefresh = async () => {
  try {
    // Check if there are recent changes that might require a refresh
    const checkQuery = `
      SELECT 
        MAX(ee."createdAt") as "lastEmailEvent",
        MAX(d."createdAt") as "lastDonation",
        MAX(lt."createdAt") as "lastLinkToken"
      FROM "emailEvents" ee
      FULL OUTER JOIN "donations" d ON TRUE
      FULL OUTER JOIN "linkTokens" lt ON TRUE
    `;

    const result = await query(checkQuery);
    const lastActivity = result.rows[0];

    // Get the last refresh time from the materialized view
    const refreshQuery = `
      SELECT 
        pg_stat_get_last_analyze_time(oid) as "lastAnalyze",
        pg_stat_get_last_autoanalyze_time(oid) as "lastAutoAnalyze"
      FROM pg_class 
      WHERE relname = 'outreachCampaignStats'
    `;

    const refreshResult = await query(refreshQuery);

    // Simple heuristic: if there's been activity in the last hour, consider refresh needed
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const lastEmailEvent = new Date(lastActivity.lastEmailEvent);
    const lastDonation = new Date(lastActivity.lastDonation);
    const lastLinkToken = new Date(lastActivity.lastLinkToken);

    const needsRefresh =
      lastEmailEvent > oneHourAgo ||
      lastDonation > oneHourAgo ||
      lastLinkToken > oneHourAgo;

    return needsRefresh;
  } catch (error) {
    logger.error("Failed to check if stats refresh is needed", {
      error: error.message,
    });

    // Default to true to be safe
    return true;
  }
};
