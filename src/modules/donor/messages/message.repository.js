import { db } from "../../../db/index.js";
import logger from "../../../utils/logger.js";

class MessageRepository {
  async getMessagesByCampaign(
    campaignId,
    status = null,
    limit = 50,
    offset = 0
  ) {
    let query = `
      SELECT dm.*, u."email" as "donorEmail"
      FROM "donationMessages" dm
      LEFT JOIN "users" u ON dm."donorUserId" = u."userId"
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
  }

  async getMessageById(messageId) {
    const result = await db.query(
      `SELECT dm.*, u."email" as "donorEmail", c."title" as "campaignTitle"
       FROM "donationMessages" dm
       LEFT JOIN "users" u ON dm."donorUserId" = u."userId"
       LEFT JOIN "campaigns" c ON dm."campaignId" = c."campaignId"
       WHERE dm."messageId" = $1`,
      [messageId]
    );

    return result.rows[0] || null;
  }

  async updateMessageStatus(
    messageId,
    status,
    moderatedByUserId,
    isFeatured = false
  ) {
    const result = await db.query(
      `UPDATE "donationMessages" 
       SET "status" = $1, "moderatedByUserId" = $2, "moderatedAt" = CURRENT_TIMESTAMP, "isFeatured" = $3
       WHERE "messageId" = $4 
       RETURNING *`,
      [status, moderatedByUserId, isFeatured, messageId]
    );

    return result.rows[0] || null;
  }

  async getPendingMessagesCount(campaignId) {
    const result = await db.query(
      `SELECT COUNT(*) as "pendingCount"
       FROM "donationMessages" 
       WHERE "campaignId" = $1 AND "status" = 'pendingModeration'`,
      [campaignId]
    );

    return parseInt(result.rows[0].pendingCount) || 0;
  }

  async getFeaturedMessages(campaignId, limit = 10) {
    const result = await db.query(
      `SELECT dm.*, u."email" as "donorEmail"
       FROM "donationMessages" dm
       LEFT JOIN "users" u ON dm."donorUserId" = u."userId"
       WHERE dm."campaignId" = $1 AND dm."status" = 'approved' AND dm."isFeatured" = true
       ORDER BY dm."postedAt" DESC
       LIMIT $2`,
      [campaignId, limit]
    );

    return result.rows;
  }

  async getMessagesByUser(userId, limit = 50, offset = 0) {
    const result = await db.query(
      `SELECT dm.*, c."title" as "campaignTitle"
       FROM "donationMessages" dm
       LEFT JOIN "campaigns" c ON dm."campaignId" = c."campaignId"
       WHERE dm."donorUserId" = $1
       ORDER BY dm."postedAt" DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  }
}

export default new MessageRepository();
