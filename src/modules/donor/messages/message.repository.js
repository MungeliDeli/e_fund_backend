import { db } from "../../../db/index.js";
import logger from "../../../utils/logger.js";

export const getMessagesByCampaign = async (
  campaignId,
  status = null,
  limit = 50,
  offset = 0
) => {
  let query = `
    SELECT dm.*, u."email" as "donorEmail", u."userType",
           ip."firstName", ip."lastName",
           op."organizationShortName"
    FROM "donationMessages" dm
    LEFT JOIN "users" u ON dm."donorUserId" = u."userId"
    LEFT JOIN "individualProfiles" ip ON u."userId" = ip."userId" AND u."userType" = 'individualUser'
    LEFT JOIN "organizationProfiles" op ON u."userId" = op."userId" AND u."userType" = 'organizationUser'
    WHERE dm."campaignId" = $1
  `;

  const params = [campaignId];
  let paramIndex = 2;

  if (status) {
    query += ` AND dm."status" = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  query += ` ORDER BY dm."postedAt" DESC LIMIT $${paramIndex} OFFSET $${
    paramIndex + 1
  }`;
  params.push(limit, offset);

  const result = await db.query(query, params);
  return result.rows;
};

export const getMessageById = async (messageId) => {
  const result = await db.query(
    `SELECT dm.*
     FROM "donationMessages" dm
     WHERE dm."messageId" = $1`,
    [messageId]
  );

  return result.rows[0] || null;
};

export const updateMessageStatus = async (
  messageId,
  status,
  moderatedByUserId,
  isFeatured = false
) => {
  const result = await db.query(
    `UPDATE "donationMessages" 
     SET "status" = $1, "moderatedByUserId" = $2, "moderatedAt" = CURRENT_TIMESTAMP, "isFeatured" = $3
     WHERE "messageId" = $4 
     RETURNING *`,
    [status, moderatedByUserId, isFeatured, messageId]
  );

  return result.rows[0] || null;
};

export const deleteMessageById = async (messageId, client = null) => {
  const query = `DELETE FROM "donationMessages" WHERE "messageId" = $1 RETURNING *`;
  const params = [messageId];

  if (client) {
    const result = await client.query(query, params);
    return result.rows[0] || null;
  } else {
    const result = await db.query(query, params);
    return result.rows[0] || null;
  }
};

export const getPendingMessagesCount = async (campaignId) => {
  const result = await db.query(
    `SELECT COUNT(*) as "pendingCount"
     FROM "donationMessages" 
     WHERE "campaignId" = $1 AND "status" = 'pendingModeration'`,
    [campaignId]
  );

  return parseInt(result.rows[0].pendingCount) || 0;
};

export const getFeaturedMessages = async (campaignId, limit = 10) => {
  const result = await db.query(
    `SELECT dm.*, u."email" as "donorEmail", u."userType",
            ip."firstName", ip."lastName",
            op."organizationShortName"
     FROM "donationMessages" dm
     LEFT JOIN "users" u ON dm."donorUserId" = u."userId"
     LEFT JOIN "individualProfiles" ip ON u."userId" = ip."userId" AND u."userType" = 'individualUser'
     LEFT JOIN "organizationProfiles" op ON u."userId" = op."userId" AND u."userType" = 'organizationUser'
     WHERE dm."campaignId" = $1 AND dm."status" = 'approved' AND dm."isFeatured" = true
     ORDER BY dm."postedAt" DESC
     LIMIT $2`,
    [campaignId, limit]
  );

  return result.rows;
};

export const getFeaturedMessagesCount = async (campaignId) => {
  const result = await db.query(
    `SELECT COUNT(*) as "featuredCount"
     FROM "donationMessages" 
     WHERE "campaignId" = $1 AND "status" = 'approved' AND "isFeatured" = true`,
    [campaignId]
  );

  return parseInt(result.rows[0].featuredCount) || 0;
};

export const getMessagesByUser = async (userId, limit = 50, offset = 0) => {
  const result = await db.query(
    `SELECT dm.*, c."title" as "campaignTitle", u."userType",
            ip."firstName", ip."lastName",
            op."organizationShortName"
     FROM "donationMessages" dm
     LEFT JOIN "campaigns" c ON dm."campaignId" = c."campaignId"
     LEFT JOIN "users" u ON dm."donorUserId" = u."userId"
     LEFT JOIN "individualProfiles" ip ON u."userId" = ip."userId" AND u."userType" = 'individualUser'
     LEFT JOIN "organizationProfiles" op ON u."userId" = op."userId" AND u."userType" = 'organizationUser'
     WHERE dm."donorUserId" = $1
     ORDER BY dm."postedAt" DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return result.rows;
};

export const createMessage = async (messageData, client = null) => {
  const query = `INSERT INTO "donationMessages" (
    "campaignId", "donorUserId", "messageText", "status", "isAnonymous"
  ) VALUES ($1, $2, $3, $4, $5) RETURNING *`;

  const params = [
    messageData.campaignId,
    messageData.donorUserId || null,
    messageData.messageText,
    messageData.status || "pendingModeration",
    messageData.isAnonymous || false,
  ];

  if (client) {
    const result = await client.query(query, params);
    return result.rows[0];
  } else {
    const result = await db.query(query, params);
    return result.rows[0];
  }
};

/**
 * Bulk update message status for all pending messages in a campaign
 * @param {string} campaignId - Campaign ID
 * @param {string} status - New status (approved/rejected)
 * @param {string} moderatedByUserId - User ID who performed the moderation
 * @param {boolean} isFeatured - Whether to feature the messages
 * @returns {Promise<Object>} Result of bulk operation
 */
export const bulkUpdateMessageStatus = async (
  campaignId,
  status,
  moderatedByUserId,
  isFeatured = false
) => {
  const result = await db.query(
    `UPDATE "donationMessages" 
     SET "status" = $1, "moderatedByUserId" = $2, "moderatedAt" = CURRENT_TIMESTAMP, "isFeatured" = $3
     WHERE "campaignId" = $4 AND "status" = 'pendingModeration'
     RETURNING "messageId"`,
    [status, moderatedByUserId, isFeatured, campaignId]
  );

  return {
    updatedCount: result.rowCount,
    updatedMessageIds: result.rows.map((row) => row.messageId),
  };
};

/**
 * Get campaign message statistics
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Object>} Message statistics
 */
export const getCampaignMessageStats = async (campaignId) => {
  const result = await db.query(
    `SELECT 
       COUNT(*) as "totalMessages",
       COUNT(CASE WHEN "status" = 'pendingModeration' THEN 1 END) as "pendingCount",
       COUNT(CASE WHEN "status" = 'approved' THEN 1 END) as "approvedCount",
       COUNT(CASE WHEN "status" = 'rejected' THEN 1 END) as "rejectedCount",
       COUNT(CASE WHEN "isFeatured" = true THEN 1 END) as "featuredCount"
     FROM "donationMessages" 
     WHERE "campaignId" = $1`,
    [campaignId]
  );

  const stats = result.rows[0];
  return {
    totalMessages: parseInt(stats.totalMessages) || 0,
    pendingCount: parseInt(stats.pendingCount) || 0,
    approvedCount: parseInt(stats.approvedCount) || 0,
    rejectedCount: parseInt(stats.rejectedCount) || 0,
    featuredCount: parseInt(stats.featuredCount) || 0,
  };
};
