import { db } from "../../../db/index.js";
import logger from "../../../utils/logger.js";

export const createDonation = async (donationData, client = null) => {
  const query = `INSERT INTO "donations" (
    "campaignId", "organizerId", "donorUserId", "amount", "isAnonymous", 
    "status", "paymentTransactionId"
  ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;

  const params = [
    donationData.campaignId,
    donationData.organizerId,
    donationData.donorUserId || null,
    donationData.amount,
    donationData.isAnonymous || false,
    donationData.status || "pending",
    donationData.paymentTransactionId,
  ];

  if (client) {
    const result = await client.query(query, params);
    return result.rows[0];
  } else {
    const result = await db.query(query, params);
    return result.rows[0];
  }
};

export const getDonationById = async (donationId) => {
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
};

export const getDonationsByCampaign = async (
  campaignId,
  limit = 50,
  offset = 0
) => {
  console.log("campaignId", campaignId);
  const result = await db.query(
    `SELECT d.*, dm."messageText", dm."status" as "messageStatus", dm."isFeatured"
     FROM "donations" d
     LEFT JOIN "donationMessages" dm ON d."messageId" = dm."messageId"
     WHERE d."campaignId" = $1
     ORDER BY d."donationDate" DESC
     LIMIT $2 OFFSET $3`,
    [campaignId, limit, offset]
  );

  return result.rows;
};

export const getDonationsByOrganizer = async (
  organizerId,
  limit = 50,
  offset = 0
) => {
  const result = await db.query(
    `SELECT d.*, c.name AS "campaignName",
            dm."messageText", dm."status" as "messageStatus", dm."isFeatured"
     FROM "donations" d
     JOIN "campaigns" c ON d."campaignId" = c."campaignId"
     LEFT JOIN "donationMessages" dm ON d."messageId" = dm."messageId"
     WHERE d."organizerId" = $1
     ORDER BY d."donationDate" DESC
     LIMIT $2 OFFSET $3`,
    [organizerId, limit, offset]
  );

  return result.rows;
};

export const getAllDonations = async (limit = 50, offset = 0) => {
  const result = await db.query(
    `SELECT d.*, c.name AS "campaignName",
            dm."messageText", dm."status" as "messageStatus", dm."isFeatured"
     FROM "donations" d
     JOIN "campaigns" c ON d."campaignId" = c."campaignId"
     LEFT JOIN "donationMessages" dm ON d."messageId" = dm."messageId"
     ORDER BY d."donationDate" DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
};

export const updateDonationStatus = async (donationId, status) => {
  const result = await db.query(
    `UPDATE "donations" SET "status" = $1 WHERE "donationId" = $2 RETURNING *`,
    [status, donationId]
  );

  return result.rows[0] || null;
};

export const updateReceiptSent = async (donationId, receiptSent) => {
  const result = await db.query(
    `UPDATE "donations" SET "receiptSent" = $1 WHERE "donationId" = $2 RETURNING *`,
    [receiptSent, donationId]
  );

  return result.rows[0] || null;
};

export const updateDonationTransactionId = async (
  donationId,
  transactionId,
  client = null
) => {
  const query = `UPDATE "donations" SET "paymentTransactionId" = $1 WHERE "donationId" = $2 RETURNING *`;
  const params = [transactionId, donationId];

  if (client) {
    const result = await client.query(query, params);
    return result.rows[0] || null;
  } else {
    const result = await db.query(query, params);
    return result.rows[0] || null;
  }
};

export const updateDonationMessageId = async (
  donationId,
  messageId,
  client = null
) => {
  const query = `UPDATE "donations" SET "messageId" = $1 WHERE "donationId" = $2 RETURNING *`;
  const params = [messageId, donationId];

  if (client) {
    const result = await client.query(query, params);
    return result.rows[0] || null;
  } else {
    const result = await db.query(query, params);
    return result.rows[0] || null;
  }
};

export const getDonationStats = async (campaignId) => {
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
};

export const getDonationsByUser = async (userId, limit = 50, offset = 0) => {
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
};

export const updateCampaignStatistics = async (
  campaignId,
  amount,
  client = null
) => {
  const query = `UPDATE "campaigns" 
     SET "currentRaisedAmount" = "currentRaisedAmount" + $1,
         "updatedAt" = CURRENT_TIMESTAMP
     WHERE "campaignId" = $2 
     RETURNING "currentRaisedAmount"`;

  const params = [amount, campaignId];

  if (client) {
    const result = await client.query(query, params);
    return result.rows[0] || null;
  } else {
    const result = await db.query(query, params);
    return result.rows[0] || null;
  }
};

export const recalculateCampaignStatistics = async (
  campaignId,
  client = null
) => {
  const query = `
    WITH agg AS (
      SELECT 
        COALESCE(SUM("amount"), 0) AS totalAmount,
        COUNT(*) AS completedCount
      FROM "donations"
      WHERE "campaignId" = $1 AND "status" = 'completed'
    ), upd AS (
      UPDATE "campaigns" c
      SET "currentRaisedAmount" = agg.totalAmount,
          "updatedAt" = CURRENT_TIMESTAMP
      FROM agg
      WHERE c."campaignId" = $1
      RETURNING c."currentRaisedAmount", c."goalAmount"
    )
    SELECT upd."currentRaisedAmount", upd."goalAmount", agg.completedCount
    FROM upd, agg`;

  const params = [campaignId];

  if (client) {
    const result = await client.query(query, params);
    return result.rows[0] || null;
  } else {
    const result = await db.query(query, params);
    return result.rows[0] || null;
  }
};
