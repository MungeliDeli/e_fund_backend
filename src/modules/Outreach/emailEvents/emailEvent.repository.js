/**
 * EmailEvent Repository
 *
 * Handles all database operations for email events used in outreach tracking.
 * Provides data access layer for recording and querying email events (sent, open, click).
 *
 * Key Features:
 * - Email event recording (sent, open, click)
 * - Link token association
 * - Analytics and reporting queries
 * - IP and user agent tracking
 *
 */

import { query, transaction } from "../../../db/index.js";
import { DatabaseError, NotFoundError } from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";

/**
 * Record an email event
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>} Created email event
 */
export const recordEmailEvent = async (eventData) => {
  try {
    const { linkTokenId, contactId, type, userAgent, ipAddress } = eventData;

    const insertQuery = `
      INSERT INTO "emailEvents" (
        "linkTokenId", "contactId", "type", "userAgent", "ipAddress"
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await query(insertQuery, [
      linkTokenId,
      contactId,
      type,
      userAgent,
      ipAddress,
    ]);

    logger.info("Email event recorded successfully", {
      emailEventId: result.rows[0].emailEventId,
      linkTokenId,
      contactId,
      type,
    });

    return result.rows[0];
  } catch (error) {
    logger.error("Failed to record email event in repository", {
      error: error.message,
      eventData,
    });

    throw new DatabaseError("Failed to record email event", error);
  }
};

/**
 * Get email events by link token
 * @param {string} linkTokenId - Link token ID
 * @param {string} organizerId - Organizer ID (for authorization)
 * @returns {Promise<Array>} Array of email events
 */
export const getEmailEventsByLinkToken = async (linkTokenId, organizerId) => {
  try {
    // Verify link token belongs to organizer's campaign
    const linkTokenCheckQuery = `
      SELECT lt."linkTokenId" FROM "linkTokens" lt
      JOIN "campaigns" c ON lt."campaignId" = c."campaignId"
      WHERE lt."linkTokenId" = $1 AND c."organizerId" = $2
    `;
    const linkTokenCheckResult = await query(linkTokenCheckQuery, [
      linkTokenId,
      organizerId,
    ]);

    if (linkTokenCheckResult.rows.length === 0) {
      throw new NotFoundError("Link token not found");
    }

    const queryText = `
      SELECT 
        ee."emailEventId",
        ee."linkTokenId",
        ee."contactId",
        ee."type",
        ee."userAgent",
        ee."ipAddress",
        ee."createdAt",
        c."name" as "contactName",
        c."email" as "contactEmail"
      FROM "emailEvents" ee
      LEFT JOIN "contacts" c ON ee."contactId" = c."contactId"
      WHERE ee."linkTokenId" = $1
      ORDER BY ee."createdAt" DESC
    `;

    const result = await query(queryText, [linkTokenId]);

    logger.info("Email events retrieved successfully", {
      linkTokenId,
      count: result.rows.length,
    });

    return result.rows;
  } catch (error) {
    logger.error("Failed to get email events by link token in repository", {
      error: error.message,
      linkTokenId,
      organizerId,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new DatabaseError("Failed to get email events", error);
  }
};

/**
 * Get email events by campaign
 * @param {string} campaignId - Campaign ID
 * @param {string} organizerId - Organizer ID (for authorization)
 * @returns {Promise<Array>} Array of email events
 */
export const getEmailEventsByCampaign = async (campaignId, organizerId) => {
  try {
    // Verify campaign belongs to organizer
    const campaignCheckQuery = `
      SELECT "campaignId" FROM "campaigns" 
      WHERE "campaignId" = $1 AND "organizerId" = $2
    `;
    const campaignCheckResult = await query(campaignCheckQuery, [
      campaignId,
      organizerId,
    ]);

    if (campaignCheckResult.rows.length === 0) {
      throw new NotFoundError("Campaign not found");
    }

    const queryText = `
      SELECT 
        ee."emailEventId",
        ee."linkTokenId",
        ee."contactId",
        ee."type",
        ee."userAgent",
        ee."ipAddress",
        ee."createdAt",
        c."name" as "contactName",
        c."email" as "contactEmail",
        lt."type" as "linkType"
      FROM "emailEvents" ee
      JOIN "linkTokens" lt ON ee."linkTokenId" = lt."linkTokenId"
      LEFT JOIN "contacts" c ON ee."contactId" = c."contactId"
      WHERE lt."campaignId" = $1
      ORDER BY ee."createdAt" DESC
    `;

    const result = await query(queryText, [campaignId]);

    logger.info("Email events retrieved successfully", {
      campaignId,
      count: result.rows.length,
    });

    return result.rows;
  } catch (error) {
    logger.error("Failed to get email events by campaign in repository", {
      error: error.message,
      campaignId,
      organizerId,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new DatabaseError("Failed to get email events", error);
  }
};

/**
 * Get email event statistics by campaign
 * @param {string} campaignId - Campaign ID
 * @param {string} organizerId - Organizer ID (for authorization)
 * @returns {Promise<Object>} Email event statistics
 */
export const getEmailEventStatsByCampaign = async (campaignId, organizerId) => {
  try {
    // Verify campaign belongs to organizer
    const campaignCheckQuery = `
      SELECT "campaignId" FROM "campaigns" 
      WHERE "campaignId" = $1 AND "organizerId" = $2
    `;
    const campaignCheckResult = await query(campaignCheckQuery, [
      campaignId,
      organizerId,
    ]);

    if (campaignCheckResult.rows.length === 0) {
      throw new NotFoundError("Campaign not found");
    }

    const queryText = `
      SELECT 
        ee."type",
        COUNT(*) as "count",
        COUNT(DISTINCT ee."contactId") as "uniqueContacts"
      FROM "emailEvents" ee
      JOIN "linkTokens" lt ON ee."linkTokenId" = lt."linkTokenId"
      WHERE lt."campaignId" = $1
      GROUP BY ee."type"
    `;

    const result = await query(queryText, [campaignId]);

    // Transform results into a more useful format
    const stats = {
      sent: { count: 0, uniqueContacts: 0 },
      open: { count: 0, uniqueContacts: 0 },
      click: { count: 0, uniqueContacts: 0 },
    };

    result.rows.forEach((row) => {
      stats[row.type] = {
        count: parseInt(row.count),
        uniqueContacts: parseInt(row.uniqueContacts),
      };
    });

    // Calculate rates
    const openRate =
      stats.sent.count > 0
        ? (stats.open.uniqueContacts / stats.sent.uniqueContacts) * 100
        : 0;
    const clickRate =
      stats.open.count > 0
        ? (stats.click.uniqueContacts / stats.open.uniqueContacts) * 100
        : 0;

    stats.openRate = Math.round(openRate * 100) / 100;
    stats.clickRate = Math.round(clickRate * 100) / 100;

    logger.info("Email event statistics retrieved successfully", {
      campaignId,
      stats,
    });

    return stats;
  } catch (error) {
    logger.error("Failed to get email event statistics in repository", {
      error: error.message,
      campaignId,
      organizerId,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new DatabaseError("Failed to get email event statistics", error);
  }
};

/**
 * Get unique email opens by contact
 * @param {string} contactId - Contact ID
 * @param {string} organizerId - Organizer ID (for authorization)
 * @returns {Promise<number>} Number of unique opens
 */
export const getUniqueOpensByContact = async (contactId, organizerId) => {
  try {
    // Verify contact belongs to organizer's segment
    const contactCheckQuery = `
      SELECT c."contactId" FROM "contacts" c
      JOIN "segments" s ON c."segmentId" = s."segmentId"
      WHERE c."contactId" = $1 AND s."organizerId" = $2
    `;
    const contactCheckResult = await query(contactCheckQuery, [
      contactId,
      organizerId,
    ]);

    if (contactCheckResult.rows.length === 0) {
      throw new NotFoundError("Contact not found");
    }

    const queryText = `
      SELECT COUNT(DISTINCT ee."linkTokenId") as "uniqueOpens"
      FROM "emailEvents" ee
      WHERE ee."contactId" = $1 AND ee."type" = 'open'
    `;

    const result = await query(queryText, [contactId]);

    const uniqueOpens = parseInt(result.rows[0].uniqueOpens) || 0;

    logger.info("Unique opens retrieved successfully", {
      contactId,
      uniqueOpens,
    });

    return uniqueOpens;
  } catch (error) {
    logger.error("Failed to get unique opens by contact in repository", {
      error: error.message,
      contactId,
      organizerId,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new DatabaseError("Failed to get unique opens", error);
  }
};
