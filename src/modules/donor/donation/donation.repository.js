import { db } from "../../../db/index.js";
import { logger } from "../../../utils/logger.js";

class DonationRepository {
  async createDonation(donationData, transactionId, messageId = null) {
    const result = await db.query(
      `INSERT INTO "donations" (
        "campaignId", "donorUserId", "amount", "isAnonymous", 
        "messageId", "paymentTransactionId", "status"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        donationData.campaignId,
        donationData.userId || null,
        donationData.amount,
        donationData.isAnonymous,
        messageId,
        transactionId,
        "pending",
      ]
    );

    return result.rows[0];
  }

  async getDonationById(donationId) {
    const result = await db.query(
      `SELECT d.*, t."gatewayTransactionId", t."gatewayUsed", t."currency", t."status" as "transactionStatus",
              dm."messageText", dm."status" as "messageStatus"
       FROM "donations" d
       LEFT JOIN "transactions" t ON d."paymentTransactionId" = t."transactionId"
       LEFT JOIN "donationMessages" dm ON d."messageId" = dm."messageId"
       WHERE d."donationId" = $1`,
      [donationId]
    );

    return result.rows[0] || null;
  }

  async getDonationsByCampaign(campaignId, limit = 50, offset = 0) {
    const result = await db.query(
      `SELECT d.*, t."gatewayTransactionId", t."gatewayUsed", t."currency",
              dm."messageText", dm."status" as "messageStatus", dm."isFeatured"
       FROM "donations" d
       LEFT JOIN "transactions" t ON d."paymentTransactionId" = t."transactionId"
       LEFT JOIN "donationMessages" dm ON d."messageId" = dm."messageId"
       WHERE d."campaignId" = $1 AND d."status" = 'completed'
       ORDER BY d."donationDate" DESC
       LIMIT $2 OFFSET $3`,
      [campaignId, limit, offset]
    );

    return result.rows;
  }

  async updateDonationStatus(donationId, status) {
    const result = await db.query(
      `UPDATE "donations" SET "status" = $1 WHERE "donationId" = $2 RETURNING *`,
      [status, donationId]
    );

    return result.rows[0] || null;
  }

  async updateReceiptSent(donationId, receiptSent) {
    const result = await db.query(
      `UPDATE "donations" SET "receiptSent" = $1 WHERE "donationId" = $2 RETURNING *`,
      [receiptSent, donationId]
    );

    return result.rows[0] || null;
  }

  async getDonationStats(campaignId) {
    const result = await db.query(
      `SELECT 
        COUNT(*) as "totalDonations",
        COUNT(CASE WHEN "status" = 'completed' THEN 1 END) as "completedDonations",
        SUM(CASE WHEN "status" = 'completed' THEN "amount" ELSE 0 END) as "totalAmount",
        COUNT(CASE WHEN "isAnonymous" = true THEN 1 END) as "anonymousDonations"
       FROM "donations" 
       WHERE "campaignId" = $1`,
      [campaignId]
    );

    return result.rows[0];
  }

  async getDonationsByUser(userId, limit = 50, offset = 0) {
    const result = await db.query(
      `SELECT d.*, c."title" as "campaignTitle", t."gatewayTransactionId", t."gatewayUsed",
              dm."messageText", dm."status" as "messageStatus"
       FROM "donations" d
       LEFT JOIN "campaigns" c ON d."campaignId" = c."campaignId"
       LEFT JOIN "transactions" t ON d."paymentTransactionId" = t."transactionId"
       LEFT JOIN "donationMessages" dm ON d."messageId" = dm."messageId"
       WHERE d."donorUserId" = $1
       ORDER BY d."donationDate" DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  }

  async updateCampaignStatistics(campaignId, amount) {
    const result = await db.query(
      `UPDATE "campaigns" 
       SET "currentRaisedAmount" = "currentRaisedAmount" + $1,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "campaignId" = $2 
       RETURNING "currentRaisedAmount"`,
      [amount, campaignId]
    );

    return result.rows[0] || null;
  }
}

export default new DonationRepository();
