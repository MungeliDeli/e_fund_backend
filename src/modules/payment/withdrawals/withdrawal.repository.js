import { query } from "../../../db/index.js";
import logger from "../../../utils/logger.js";
import { DatabaseError, NotFoundError } from "../../../utils/appError.js";

export const createWithdrawalRequest = async (payload) => {
  const {
    campaignId,
    organizerId,
    amount,
    currency,
    destinationType,
    destination,
    notes,
  } = payload;

  try {
    const result = await query(
      `INSERT INTO "withdrawalRequests" (
        "campaignId", "organizerId", "amount", "currency",
        "destinationType", "destination", "notes"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        campaignId,
        organizerId,
        amount,
        currency,
        destinationType,
        JSON.stringify(destination),
        notes || null,
      ]
    );
    return result.rows[0];
  } catch (error) {
    logger.error("Failed to create withdrawal request", {
      error: error.message,
    });
    throw new DatabaseError("Failed to create withdrawal request");
  }
};

export const updateWithdrawalRequest = async (withdrawalRequestId, update) => {
  const fields = [];
  const values = [];
  let i = 1;
  for (const [key, val] of Object.entries(update)) {
    if (val === undefined) continue;
    if (key === "destination" && typeof val === "object") {
      fields.push(`"${key}" = $${i++}`);
      values.push(JSON.stringify(val));
    } else {
      fields.push(`"${key}" = $${i++}`);
      values.push(val);
    }
  }
  if (fields.length === 0) return getWithdrawalById(withdrawalRequestId);
  values.push(withdrawalRequestId);

  try {
    const result = await query(
      `UPDATE "withdrawalRequests"
       SET ${fields.join(", ")}, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "withdrawalRequestId" = $${i}
       RETURNING *`,
      values
    );
    if (result.rowCount === 0) throw new NotFoundError("Withdrawal not found");
    return result.rows[0];
  } catch (error) {
    logger.error("Failed to update withdrawal request", {
      error: error.message,
    });
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to update withdrawal request");
  }
};

export const getWithdrawalById = async (withdrawalRequestId) => {
  try {
    const result = await query(
      `SELECT * FROM "withdrawalRequests" WHERE "withdrawalRequestId" = $1`,
      [withdrawalRequestId]
    );
    if (result.rowCount === 0) throw new NotFoundError("Withdrawal not found");
    return result.rows[0];
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to fetch withdrawal request");
  }
};

export const listWithdrawalsForOrganizer = async (
  organizerId,
  { campaignId, status, from, to, limit = 50, offset = 0 }
) => {
  const where = ['w."organizerId" = $1'];
  const values = [organizerId];
  let idx = 2;
  if (campaignId) {
    where.push(`w."campaignId" = $${idx++}`);
    values.push(campaignId);
  }
  if (status) {
    where.push(`w."status" = $${idx++}`);
    values.push(status);
  }
  if (from) {
    where.push(`w."createdAt" >= $${idx++}`);
    values.push(from);
  }
  if (to) {
    where.push(`w."createdAt" <= $${idx++}`);
    values.push(to);
  }
  values.push(limit, offset);

  const sql = `
    SELECT 
      w.*,
      c."name" as "campaignName",
      op."organizationName" as "organizerName"
    FROM "withdrawalRequests" w
    LEFT JOIN "campaigns" c ON w."campaignId" = c."campaignId"
    LEFT JOIN "organizationProfiles" op ON w."organizerId" = op."userId"
    WHERE ${where.join(" AND ")}
    ORDER BY w."createdAt" DESC
    LIMIT $${idx++} OFFSET $${idx}
  `;
  try {
    const result = await query(sql, values);
    return result.rows;
  } catch (error) {
    throw new DatabaseError("Failed to list withdrawals for organizer");
  }
};

export const listWithdrawals = async ({
  campaignId,
  organizerId,
  status,
  minAmount,
  maxAmount,
  from,
  to,
  limit = 50,
  offset = 0,
}) => {
  const where = ["1=1"];
  const values = [];
  let idx = 1;
  if (campaignId) {
    where.push(`w."campaignId" = $${idx++}`);
    values.push(campaignId);
  }
  if (organizerId) {
    where.push(`w."organizerId" = $${idx++}`);
    values.push(organizerId);
  }
  if (status) {
    where.push(`w."status" = $${idx++}`);
    values.push(status);
  }
  if (minAmount) {
    where.push(`w."amount" >= $${idx++}`);
    values.push(minAmount);
  }
  if (maxAmount) {
    where.push(`w."amount" <= $${idx++}`);
    values.push(maxAmount);
  }
  if (from) {
    where.push(`w."createdAt" >= $${idx++}`);
    values.push(from);
  }
  if (to) {
    where.push(`w."createdAt" <= $${idx++}`);
    values.push(to);
  }
  values.push(limit, offset);

  const sql = `
    SELECT 
      w.*,
      c."name" as "campaignName",
      op."organizationName" as "organizerName"
    FROM "withdrawalRequests" w
    LEFT JOIN "campaigns" c ON w."campaignId" = c."campaignId"
    LEFT JOIN "organizationProfiles" op ON w."organizerId" = op."userId"
    WHERE ${where.join(" AND ")}
    ORDER BY w."createdAt" DESC
    LIMIT $${idx++} OFFSET $${idx}
  `;
  try {
    const result = await query(sql, values);
    return result.rows;
  } catch (error) {
    throw new DatabaseError("Failed to list withdrawals");
  }
};

export const sumCompletedDonationsByCampaign = async (campaignId) => {
  try {
    const result = await query(
      `SELECT COALESCE(SUM("amount"), 0) AS total
       FROM "donations"
       WHERE "campaignId" = $1 AND "status" = 'completed'`,
      [campaignId]
    );
    return parseFloat(result.rows[0].total) || 0;
  } catch (error) {
    throw new DatabaseError("Failed to sum completed donations");
  }
};

export const sumReservedWithdrawalsByCampaign = async (campaignId) => {
  try {
    const result = await query(
      `SELECT COALESCE(SUM("amount"), 0) AS total
       FROM "withdrawalRequests"
       WHERE "campaignId" = $1 AND "status" IN ('pending','approved','processing','paid')`,
      [campaignId]
    );
    return parseFloat(result.rows[0].total) || 0;
  } catch (error) {
    throw new DatabaseError("Failed to sum reserved withdrawals");
  }
};

export const sumPaidWithdrawalsByCampaign = async (campaignId) => {
  try {
    const result = await query(
      `SELECT COALESCE(SUM("amount"), 0) AS total
       FROM "withdrawalRequests"
       WHERE "campaignId" = $1 AND "status" = 'paid'`,
      [campaignId]
    );
    return parseFloat(result.rows[0].total) || 0;
  } catch (error) {
    throw new DatabaseError("Failed to sum paid withdrawals");
  }
};

export const countWithdrawalsThisWeek = async (campaignId) => {
  try {
    // Count only successful withdrawals (paid) in the current week.
    // Use updatedAt because status transitions to 'paid' may happen after creation.
    const result = await query(
      `SELECT COUNT(*)::int AS cnt
       FROM "withdrawalRequests"
       WHERE "campaignId" = $1
         AND "status" = 'paid'
         AND date_trunc('week', "updatedAt") = date_trunc('week', NOW())`,
      [campaignId]
    );
    return result.rows[0].cnt || 0;
  } catch (error) {
    throw new DatabaseError("Failed to count weekly withdrawals");
  }
};

export const countWithdrawals = async (filters = {}) => {
  const where = ["1=1"];
  const values = [];
  let idx = 1;

  if (filters.campaignId) {
    where.push(`w."campaignId" = $${idx++}`);
    values.push(filters.campaignId);
  }
  if (filters.organizerId) {
    where.push(`w."organizerId" = $${idx++}`);
    values.push(filters.organizerId);
  }
  if (filters.status) {
    where.push(`w."status" = $${idx++}`);
    values.push(filters.status);
  }
  if (filters.minAmount) {
    where.push(`w."amount" >= $${idx++}`);
    values.push(filters.minAmount);
  }
  if (filters.maxAmount) {
    where.push(`w."amount" <= $${idx++}`);
    values.push(filters.maxAmount);
  }
  if (filters.from) {
    where.push(`w."createdAt" >= $${idx++}`);
    values.push(filters.from);
  }
  if (filters.to) {
    where.push(`w."createdAt" <= $${idx++}`);
    values.push(filters.to);
  }

  const sql = `
    SELECT COUNT(*) as total
    FROM "withdrawalRequests" w
    WHERE ${where.join(" AND ")}
  `;

  try {
    const result = await query(sql, values);
    return parseInt(result.rows[0].total) || 0;
  } catch (error) {
    throw new DatabaseError("Failed to count withdrawals");
  }
};

export const getWithdrawalByTransactionId = async (transactionId) => {
  try {
    const result = await query(
      `SELECT * FROM "withdrawalRequests" WHERE "transactionId" = $1`,
      [transactionId]
    );
    if (result.rowCount === 0) return null;
    return result.rows[0];
  } catch (error) {
    throw new DatabaseError("Failed to fetch withdrawal by transaction ID");
  }
};

export default {
  createWithdrawalRequest,
  updateWithdrawalRequest,
  getWithdrawalById,
  getWithdrawalByTransactionId,
  listWithdrawalsForOrganizer,
  listWithdrawals,
  sumCompletedDonationsByCampaign,
  sumReservedWithdrawalsByCampaign,
  sumPaidWithdrawalsByCampaign,
  countWithdrawalsThisWeek,
  countWithdrawals,
};
