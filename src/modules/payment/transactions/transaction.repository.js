import { db } from "../../../db/index.js";
import logger from "../../../utils/logger.js";

class TransactionRepository {
  async createTransaction(transactionData) {
    const result = await db.query(
      `INSERT INTO "transactions" (
        "userId", "campaignId", "amount", "currency", "gatewayTransactionId", 
        "gatewayUsed", "status", "transactionType", "feesAmount"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        transactionData.userId || null,
        transactionData.campaignId,
        transactionData.amount,
        transactionData.currency,
        transactionData.gatewayTransactionId,
        transactionData.gatewayUsed,
        "pending",
        transactionData.transactionType,
        transactionData.feesAmount || null,
      ]
    );

    return result.rows[0];
  }

  async getTransactionById(transactionId) {
    const result = await db.query(
      `SELECT t.*, c."title" as "campaignTitle", u."email" as "userEmail"
       FROM "transactions" t
       LEFT JOIN "campaigns" c ON t."campaignId" = c."campaignId"
       LEFT JOIN "users" u ON t."userId" = u."userId"
       WHERE t."transactionId" = $1`,
      [transactionId]
    );

    return result.rows[0] || null;
  }

  async getTransactionsByCampaign(campaignId, limit = 50, offset = 0) {
    const result = await db.query(
      `SELECT t.*, u."email" as "userEmail"
       FROM "transactions" t
       LEFT JOIN "users" u ON t."userId" = u."userId"
       WHERE t."campaignId" = $1
       ORDER BY t."transactionTimestamp" DESC
       LIMIT $2 OFFSET $3`,
      [campaignId, limit, offset]
    );

    return result.rows;
  }

  async getTransactionsByUser(userId, limit = 50, offset = 0) {
    const result = await db.query(
      `SELECT t.*, c."title" as "campaignTitle"
       FROM "transactions" t
       LEFT JOIN "campaigns" c ON t."campaignId" = c."campaignId"
       WHERE t."userId" = $1
       ORDER BY t."transactionTimestamp" DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  }

  async updateTransactionStatus(transactionId, status) {
    const result = await db.query(
      `UPDATE "transactions" 
       SET "status" = $1, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "transactionId" = $2 
       RETURNING *`,
      [status, transactionId]
    );

    return result.rows[0] || null;
  }

  async getTransactionStats(campaignId) {
    const result = await db.query(
      `SELECT 
        COUNT(*) as "totalTransactions",
        COUNT(CASE WHEN "status" = 'succeeded' THEN 1 END) as "successfulTransactions",
        COUNT(CASE WHEN "status" = 'failed' THEN 1 END) as "failedTransactions",
        SUM(CASE WHEN "status" = 'succeeded' THEN "amount" ELSE 0 END) as "totalAmount",
        SUM(CASE WHEN "status" = 'succeeded' THEN COALESCE("feesAmount", 0) ELSE 0 END) as "totalFees"
       FROM "transactions" 
       WHERE "campaignId" = $1`,
      [campaignId]
    );

    return result.rows[0];
  }

  async getTransactionByGatewayId(gatewayTransactionId) {
    const result = await db.query(
      `SELECT * FROM "transactions" WHERE "gatewayTransactionId" = $1`,
      [gatewayTransactionId]
    );

    return result.rows[0] || null;
  }

  async getTransactionsByType(transactionType, limit = 50, offset = 0) {
    const result = await db.query(
      `SELECT t.*, c."title" as "campaignTitle", u."email" as "userEmail"
       FROM "transactions" t
       LEFT JOIN "campaigns" c ON t."campaignId" = c."campaignId"
       LEFT JOIN "users" u ON t."userId" = u."userId"
       WHERE t."transactionType" = $1
       ORDER BY t."transactionTimestamp" DESC
       LIMIT $2 OFFSET $3`,
      [transactionType, limit, offset]
    );

    return result.rows;
  }

  async getTransactionSummary(limit = 10) {
    const result = await db.query(
      `SELECT 
        DATE("transactionTimestamp") as "date",
        COUNT(*) as "transactionCount",
        SUM(CASE WHEN "status" = 'succeeded' THEN "amount" ELSE 0 END) as "totalAmount",
        COUNT(CASE WHEN "status" = 'succeeded' THEN 1 END) as "successfulCount"
       FROM "transactions"
       WHERE "transactionTimestamp" >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY DATE("transactionTimestamp")
       ORDER BY "date" DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }
}

export default new TransactionRepository();
