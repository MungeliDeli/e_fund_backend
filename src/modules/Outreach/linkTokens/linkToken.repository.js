/**
 * LinkToken Repository
 *
 * Handles all database operations for link tokens used in outreach tracking.
 * Provides data access layer for link token CRUD operations and analytics.
 *
 * Key Features:
 * - Link token CRUD operations
 * - Campaign and contact/segment association
 * - UTM parameter management
 * - Click tracking and analytics
 *
 *
 */

import { query, transaction } from "../../../db/index.js";
import {
  DatabaseError,
  NotFoundError,
  ConflictError,
} from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";

/**
 * Create a new link token
 * @param {Object} linkTokenData - Link token data
 * @param {string} organizerId - Organizer ID (for authorization)
 * @returns {Promise<Object>} Created link token
 */
export const createLinkToken = async (linkTokenData, organizerId) => {
  return await transaction(async (client) => {
    const {
      campaignId,
      contactId,
      segmentId,
      type,
      prefillAmount,
      personalizedMessage,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      outreachCampaignId,
    } = linkTokenData;

    // Verify campaign exists and belongs to organizer
    const campaignCheckQuery = `
      SELECT "campaignId" FROM "campaigns" 
      WHERE "campaignId" = $1 AND "organizerId" = $2
    `;
    const campaignCheckResult = await client.query(campaignCheckQuery, [
      campaignId,
      organizerId,
    ]);

    if (campaignCheckResult.rows.length === 0) {
      throw new NotFoundError("Campaign not found");
    }

    // Verify contact exists and belongs to organizer's segment if provided
    if (contactId) {
      const contactCheckQuery = `
        SELECT c."contactId" FROM "contacts" c
        JOIN "segments" s ON c."segmentId" = s."segmentId"
        WHERE c."contactId" = $1 AND s."organizerId" = $2
      `;
      const contactCheckResult = await client.query(contactCheckQuery, [
        contactId,
        organizerId,
      ]);

      if (contactCheckResult.rows.length === 0) {
        throw new NotFoundError("Contact not found");
      }
    }

    // Verify segment exists and belongs to organizer if provided (skip validation for "all")
    if (segmentId && segmentId !== "all") {
      const segmentCheckQuery = `
        SELECT "segmentId" FROM "segments" 
        WHERE "segmentId" = $1 AND "organizerId" = $2
      `;
      const segmentCheckResult = await client.query(segmentCheckQuery, [
        segmentId,
        organizerId,
      ]);

      if (segmentCheckResult.rows.length === 0) {
        throw new NotFoundError("Segment not found");
      }
    }

    // For outreach emails, we allow multiple link tokens for the same campaign-contact-type
    // This enables organizers to send multiple emails to the same contact for the same campaign
    // No duplicate check needed for outreach functionality

    // Insert new link token
    const insertQuery = `
      INSERT INTO "linkTokens" (
        "campaignId", "contactId", "segmentId", "type", 
        "prefillAmount", "personalizedMessage", 
        "utmSource", "utmMedium", "utmCampaign", "utmContent",
        "outreachCampaignId"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await client.query(insertQuery, [
      campaignId,
      contactId,
      segmentId,
      type,
      prefillAmount,
      personalizedMessage,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      outreachCampaignId || null,
    ]);

    logger.info("Link token created successfully", {
      linkTokenId: result.rows[0].linkTokenId,
      campaignId,
      contactId,
      segmentId,
      type,
    });

    return result.rows[0];
  });
};

/**
 * Create a new public share link token (no organizer auth)
 * @param {Object} linkTokenData - Link token data
 * @returns {Promise<Object>} Created link token
 */
export const createPublicShareLinkToken = async (linkTokenData) => {
  return await transaction(async (client) => {
    const { campaignId, type, utmSource, utmMedium, utmCampaign, utmContent } =
      linkTokenData;

    // Verify campaign exists (public; no organizer check)
    const campaignCheckQuery = `
      SELECT "campaignId" FROM "campaigns" 
      WHERE "campaignId" = $1
    `;
    const campaignCheckResult = await client.query(campaignCheckQuery, [
      campaignId,
    ]);

    if (campaignCheckResult.rows.length === 0) {
      throw new NotFoundError("Campaign not found");
    }

    const insertQuery = `
      INSERT INTO "linkTokens" (
        "campaignId", "contactId", "segmentId", "type", 
        "prefillAmount", "personalizedMessage", 
        "utmSource", "utmMedium", "utmCampaign", "utmContent",
        "outreachCampaignId"
      )
      VALUES ($1, NULL, NULL, $2, NULL, NULL, $3, $4, $5, $6, NULL)
      RETURNING *
    `;

    const result = await client.query(insertQuery, [
      campaignId,
      type,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
    ]);

    logger.info("Public share link token created", {
      linkTokenId: result.rows[0].linkTokenId,
      campaignId,
      type,
    });

    return result.rows[0];
  });
};

/**
 * Get link token by ID
 * @param {string} linkTokenId - Link token ID
 * @param {string} organizerId - Organizer ID (for authorization, null for public tracking)
 * @returns {Promise<Object>} Link token object
 */
export const getLinkTokenById = async (linkTokenId, organizerId) => {
  try {
    let queryText;
    let params;

    if (organizerId) {
      // With organizer authorization check
      queryText = `
        SELECT 
          lt."linkTokenId",
          lt."campaignId",
          lt."contactId",
          lt."segmentId",
          lt."type",
          lt."prefillAmount",
          lt."personalizedMessage",
          lt."utmSource",
          lt."utmMedium",
          lt."utmCampaign",
          lt."utmContent",
          lt."clicksCount",
          lt."createdAt",
          lt."lastClickedAt",
          lt."outreachCampaignId",
          c."name" as "contactName",
          c."email" as "contactEmail",
          s."name" as "segmentName"
        FROM "linkTokens" lt
        JOIN "campaigns" camp ON lt."campaignId" = camp."campaignId"
        LEFT JOIN "contacts" c ON lt."contactId" = c."contactId"
        LEFT JOIN "segments" s ON lt."segmentId" = s."segmentId"
        WHERE lt."linkTokenId" = $1 AND camp."organizerId" = $2
      `;
      params = [linkTokenId, organizerId];
    } else {
      // Public access for tracking (no organizer check)
      queryText = `
        SELECT 
          lt."linkTokenId",
          lt."campaignId",
          lt."contactId",
          lt."segmentId",
          lt."type",
          lt."prefillAmount",
          lt."personalizedMessage",
          lt."utmSource",
          lt."utmMedium",
          lt."utmCampaign",
          lt."utmContent",
          lt."clicksCount",
          lt."createdAt",
          lt."lastClickedAt",
          lt."outreachCampaignId",
          c."name" as "contactName",
          c."email" as "contactEmail",
          s."name" as "segmentName"
        FROM "linkTokens" lt
        LEFT JOIN "contacts" c ON lt."contactId" = c."contactId"
        LEFT JOIN "segments" s ON lt."segmentId" = s."segmentId"
        WHERE lt."linkTokenId" = $1
      `;
      params = [linkTokenId];
    }

    const result = await query(queryText, params);

    if (result.rows.length === 0) {
      throw new NotFoundError("Link token not found");
    }

    logger.info("Link token retrieved successfully", {
      linkTokenId,
      organizerId,
    });

    return result.rows[0];
  } catch (error) {
    logger.error("Failed to get link token by ID in repository", {
      error: error.message,
      linkTokenId,
      organizerId,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new DatabaseError("Failed to get link token", error);
  }
};

/**
 * Get link tokens by campaign
 * @param {string} campaignId - Campaign ID
 * @param {string} organizerId - Organizer ID (for authorization)
 * @returns {Promise<Array>} Array of link tokens
 */
export const getLinkTokensByCampaign = async (campaignId, organizerId) => {
  try {
    const queryText = `
      SELECT 
        lt."linkTokenId",
        lt."contactId",
        lt."segmentId",
        lt."type",
        lt."prefillAmount",
        lt."personalizedMessage",
        lt."utmSource",
        lt."utmMedium",
        lt."utmCampaign",
        lt."utmContent",
        lt."clicksCount",
        lt."createdAt",
        lt."lastClickedAt",
        lt."outreachCampaignId",
        c."name" as "contactName",
        c."email" as "contactEmail",
        s."name" as "segmentName"
      FROM "linkTokens" lt
      LEFT JOIN "contacts" c ON lt."contactId" = c."contactId"
      LEFT JOIN "segments" s ON lt."segmentId" = s."segmentId"
      WHERE lt."campaignId" = $1
      ORDER BY lt."createdAt" DESC
    `;

    const result = await query(queryText, [campaignId]);

    logger.info("Link tokens retrieved successfully", {
      campaignId,
      count: result.rows.length,
    });

    return result.rows;
  } catch (error) {
    logger.error("Failed to get link tokens by campaign in repository", {
      error: error.message,
      campaignId,
      organizerId,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new DatabaseError("Failed to get link tokens", error);
  }
};

/**
 * Increment click count for a link token
 * @param {string} linkTokenId - Link token ID
 * @returns {Promise<Object>} Updated link token
 */
export const incrementClickCount = async (linkTokenId) => {
  try {
    const queryText = `
      UPDATE "linkTokens" 
      SET "clicksCount" = "clicksCount" + 1, "lastClickedAt" = CURRENT_TIMESTAMP
      WHERE "linkTokenId" = $1
      RETURNING *
    `;

    const result = await query(queryText, [linkTokenId]);

    if (result.rows.length === 0) {
      throw new NotFoundError("Link token not found");
    }

    logger.info("Link token click count incremented", {
      linkTokenId,
      newClickCount: result.rows[0].clicksCount,
    });

    return result.rows[0];
  } catch (error) {
    logger.error("Failed to increment click count in repository", {
      error: error.message,
      linkTokenId,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new DatabaseError("Failed to increment click count", error);
  }
};

/**
 * Delete a link token
 * @param {string} linkTokenId - Link token ID
 * @param {string} organizerId - Organizer ID (for authorization)
 * @returns {Promise<boolean>} Success status
 */
export const deleteLinkToken = async (linkTokenId, organizerId) => {
  return await transaction(async (client) => {
    // Check if link token exists and belongs to organizer's campaign
    const linkTokenCheckQuery = `
      SELECT lt."linkTokenId" FROM "linkTokens" lt
      JOIN "campaigns" c ON lt."campaignId" = c."campaignId"
      WHERE lt."linkTokenId" = $1 AND c."organizerId" = $2
    `;
    const linkTokenCheckResult = await client.query(linkTokenCheckQuery, [
      linkTokenId,
      organizerId,
    ]);

    if (linkTokenCheckResult.rows.length === 0) {
      throw new NotFoundError("Link token not found");
    }

    // Delete link token
    const deleteQuery = `
      DELETE FROM "linkTokens" 
      WHERE "linkTokenId" = $1 
      AND "campaignId" IN (
        SELECT "campaignId" FROM "campaigns" WHERE "organizerId" = $2
      )
    `;

    const result = await client.query(deleteQuery, [linkTokenId, organizerId]);

    if (result.rowCount === 0) {
      throw new NotFoundError("Link token not found");
    }

    logger.info("Link token deleted successfully", {
      linkTokenId,
      organizerId,
    });

    return true;
  });
};

/**
 * Unsafe delete for compensation flows when email sending fails.
 * No organizer check; deletes by ID only.
 */
export const deleteLinkTokenUnsafe = async (linkTokenId) => {
  return await transaction(async (client) => {
    const result = await client.query(
      `DELETE FROM "linkTokens" WHERE "linkTokenId" = $1`,
      [linkTokenId]
    );
    return result.rowCount > 0;
  });
};

/**
 * Get link tokens by outreach campaign
 * @param {string} outreachCampaignId - Outreach campaign ID
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Array>} Array of link tokens
 */
export const getLinkTokensByOutreachCampaign = async (
  outreachCampaignId,
  organizerId
) => {
  try {
    const queryText = `
      SELECT 
        lt."linkTokenId",
        lt."campaignId",
        lt."contactId",
        lt."segmentId",
        lt."type",
        lt."prefillAmount",
        lt."personalizedMessage",
        lt."utmSource",
        lt."utmMedium",
        lt."utmCampaign",
        lt."utmContent",
        lt."clicksCount",
        lt."createdAt",
        lt."lastClickedAt",
        lt."outreachCampaignId",
        c."name" as "contactName",
        c."email" as "contactEmail",
        s."name" as "segmentName"
      FROM "linkTokens" lt
      JOIN "campaigns" cpg ON lt."campaignId" = cpg."campaignId"
      LEFT JOIN "contacts" c ON lt."contactId" = c."contactId"
      LEFT JOIN "segments" s ON lt."segmentId" = s."segmentId"
      WHERE lt."outreachCampaignId" = $1 AND cpg."organizerId" = $2
      ORDER BY lt."createdAt" DESC
    `;
    const result = await query(queryText, [outreachCampaignId, organizerId]);
    return result.rows;
  } catch (error) {
    throw new DatabaseError(
      "Failed to get link tokens by outreach campaign",
      error
    );
  }
};
