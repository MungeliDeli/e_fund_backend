import { query } from "../../db/index.js";
import logger from "../../utils/logger.js";
import { DatabaseError } from "../../utils/appError.js";

/**
 * Outreach Aggregates Repository
 *
 * Provides aggregate queries across outreach tables scoped to a campaign.
 */

export const getOutreachCampaignsCountByCampaign = async (campaignId) => {
  try {
    const sql = `
      SELECT COUNT(*)::int AS count
      FROM "outreachCampaigns"
      WHERE "campaignId" = $1
    `;
    const res = await query(sql, [campaignId]);
    return res.rows[0]?.count || 0;
  } catch (error) {
    logger.error("Failed to count outreach campaigns by campaign", {
      error: error.message,
      campaignId,
    });
    throw new DatabaseError("Failed to count outreach campaigns", error);
  }
};

export const getRecipientDonationAggregatesByCampaign = async (campaignId) => {
  try {
    const sql = `
      SELECT 
        COUNT(*) FILTER (WHERE r."donated" = TRUE)::int AS donations,
        COALESCE(SUM(r."donatedAmount"), 0)::numeric AS totalAmount
      FROM "outreachCampaignRecipients" r
      JOIN "outreachCampaigns" oc ON oc."outreachCampaignId" = r."outreachCampaignId"
      WHERE oc."campaignId" = $1
    `;
    const res = await query(sql, [campaignId]);
    const row = res.rows[0] || {};
    return {
      donations: Number(row.donations || 0),
      totalAmount: Number(row.totalamount || row.totalAmount || 0),
    };
  } catch (error) {
    logger.error("Failed to get recipient donation aggregates by campaign", {
      error: error.message,
      campaignId,
    });
    throw new DatabaseError(
      "Failed to get recipient donation aggregates",
      error
    );
  }
};
