import { db } from "../../db/index.js";
import logger from "../../utils/logger.js";

/**
 * Get campaign financial summary including total raised, average donation, and largest donation
 */
export const getCampaignFinancialSummary = async (campaignId) => {
  try {
    const query = `
      SELECT 
        COALESCE(SUM(d.amount), 0) as "totalRaised",
        COALESCE(AVG(d.amount), 0) as "averageDonation",
        COALESCE(MAX(d.amount), 0) as "largestDonation",
        COUNT(d."donationId") as "totalDonations"
      FROM "donations" d
      WHERE d."campaignId" = $1
      AND d."status" = 'completed'
    `;

    const result = await db.query(query, [campaignId]);
    return result.rows[0];
  } catch (error) {
    logger.error("Error getting campaign financial summary", {
      campaignId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get unique donor count for a campaign
 */
export const getCampaignUniqueDonors = async (campaignId) => {
  try {
    const query = `
      SELECT COUNT(DISTINCT d."donorUserId") as "uniqueDonors"
      FROM "donations" d
      WHERE d."campaignId" = $1
      AND d."donorUserId" IS NOT NULL
      AND d."status" = 'completed'
    `;

    const result = await db.query(query, [campaignId]);
    return result.rows[0];
  } catch (error) {
    logger.error("Error getting campaign unique donors", {
      campaignId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get anonymous vs named donations breakdown
 */
export const getCampaignDonorBreakdown = async (campaignId) => {
  try {
    const query = `
      SELECT 
        COUNT(CASE WHEN d."isAnonymous" = true THEN 1 END) as "anonymousCount",
        COUNT(CASE WHEN d."isAnonymous" = false THEN 1 END) as "namedCount",
        COUNT(*) as "totalDonations"
      FROM "donations" d
      WHERE d."campaignId" = $1
      AND d."status" = 'completed'
    `;

    const result = await db.query(query, [campaignId]);
    return result.rows[0];
  } catch (error) {
    logger.error("Error getting campaign donor breakdown", {
      campaignId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get top donors for a campaign (limited to top 10)
 */
export const getCampaignTopDonors = async (campaignId, limit = 10) => {
  try {
    const query = `
      SELECT 
        d."donorUserId",
        d."isAnonymous",
        d.amount,
        d."donationDate",
        dm."messageText",
        dm."status" as "messageStatus",
        -- Individual profile details
        ip."firstName" as "individualFirstName",
        ip."lastName" as "individualLastName",
        ip."userId" as "individualUserId",
        -- Organization profile details
        op."organizationShortName" as "organizationShortName",
        op."organizationName" as "organizationName",
        op."userId" as "organizationUserId",
        -- User type determination
        CASE 
          WHEN ip."userId" IS NOT NULL THEN 'individual'
          WHEN op."userId" IS NOT NULL THEN 'organization'
          ELSE 'unknown'
        END as "profileType"
      FROM "donations" d
      LEFT JOIN "donationMessages" dm ON d."messageId" = dm."messageId"
      LEFT JOIN "individualProfiles" ip ON d."donorUserId" = ip."userId"
      LEFT JOIN "organizationProfiles" op ON d."donorUserId" = op."userId"
      WHERE d."campaignId" = $1
      AND d."status" = 'completed'
      ORDER BY d.amount DESC
      LIMIT $2
    `;

    const result = await db.query(query, [campaignId, limit]);
    return result.rows;
  } catch (error) {
    logger.error("Error getting campaign top donors", {
      campaignId,
      limit,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get campaign analytics summary (combines all metrics)
 */
export const getCampaignAnalyticsSummary = async (campaignId) => {
  try {
    const query = `
      SELECT 
        COALESCE(SUM(d.amount), 0) as "totalRaised",
        COALESCE(AVG(d.amount), 0) as "averageDonation",
        COALESCE(MAX(d.amount), 0) as "largestDonation",
        COUNT(d."donationId") as "totalDonations",
        COUNT(DISTINCT d."donorUserId") as "uniqueDonors",
        COUNT(CASE WHEN d."isAnonymous" = true THEN 1 END) as "anonymousCount",
        COUNT(CASE WHEN d."isAnonymous" = false THEN 1 END) as "namedCount"
      FROM "donations" d
      WHERE d."campaignId" = $1
      AND d."status" = 'completed'
    `;

    const result = await db.query(query, [campaignId]);
    return result.rows[0];
  } catch (error) {
    logger.error("Error getting campaign analytics summary", {
      campaignId,
      error: error.message,
    });
    throw error;
  }
};
