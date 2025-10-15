import { db } from "../../../db/index.js";
import logger from "../../../utils/logger.js";

export const createTransaction = async (transactionData) => {
  const result = await db.query(
    `INSERT INTO "transactions" (
      "userId", "campaignId", "amount", "currency", "gatewayTransactionId", 
      "gatewayUsed", "status", "transactionType", "feesAmount", "phoneNumber"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
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
      transactionData.phoneNumber || null,
    ]
  );

  return result.rows[0];
};

export const getTransactionById = async (transactionId) => {
  const result = await db.query(
    `SELECT t.*, c.name as "campaignName", u."email" as "userEmail"
     FROM "transactions" t
     LEFT JOIN "campaigns" c ON t."campaignId" = c."campaignId"
     LEFT JOIN "users" u ON t."userId" = u."userId"
     WHERE t."transactionId" = $1`,
    [transactionId]
  );

  return result.rows[0] || null;
};

export const getTransactionsByCampaign = async (
  campaignId,
  limit = 50,
  offset = 0
) => {
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
};

export const getTransactionsByUser = async (userId, limit = 50, offset = 0) => {
  const result = await db.query(
    `SELECT t.*, c.name as "campaignName"
     FROM "transactions" t
     LEFT JOIN "campaigns" c ON t."campaignId" = c."campaignId"
     WHERE t."userId" = $1
     ORDER BY t."transactionTimestamp" DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return result.rows;
};

export const updateTransactionStatus = async (transactionId, status) => {
  const result = await db.query(
    `UPDATE "transactions" 
     SET "status" = $1, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "transactionId" = $2 
     RETURNING *`,
    [status, transactionId]
  );

  return result.rows[0] || null;
};

export const setTransactionProcessing = async (
  transactionId,
  {
    gatewayRequestId = null,
    gatewayResponse = null,
    status = "processing",
  } = {}
) => {
  const result = await db.query(
    `UPDATE "transactions"
     SET "status" = $3,
         "gatewayRequestId" = COALESCE($1, "gatewayRequestId"),
         "gatewayResponse" = COALESCE($2, "gatewayResponse"),
         "processingStartedAt" = COALESCE("processingStartedAt", CURRENT_TIMESTAMP),
         "updatedAt" = CURRENT_TIMESTAMP
     WHERE "transactionId" = $4
     RETURNING *`,
    [gatewayRequestId, gatewayResponse, status, transactionId]
  );

  return result.rows[0] || null;
};

export const setTransactionFailureByGatewayId = async (
  gatewayTransactionId,
  failurePayload = null
) => {
  const result = await db.query(
    `UPDATE "transactions"
     SET "status" = 'failed',
         "gatewayResponse" = COALESCE($2, "gatewayResponse"),
         "processingCompletedAt" = CURRENT_TIMESTAMP,
         "updatedAt" = CURRENT_TIMESTAMP
     WHERE "gatewayTransactionId" = $1
     RETURNING *`,
    [gatewayTransactionId, failurePayload]
  );

  return result.rows[0] || null;
};

export const setTransactionSuccessByGatewayId = async (
  gatewayTransactionId,
  gatewayResponse = null
) => {
  const result = await db.query(
    `UPDATE "transactions"
     SET "status" = 'succeeded',
         "gatewayResponse" = COALESCE($2, "gatewayResponse"),
         "processingCompletedAt" = CURRENT_TIMESTAMP,
         "updatedAt" = CURRENT_TIMESTAMP
     WHERE "gatewayTransactionId" = $1
     RETURNING *`,
    [gatewayTransactionId, gatewayResponse]
  );

  return result.rows[0] || null;
};

export const getTransactionStats = async (campaignId) => {
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
};

export const getTransactionByGatewayId = async (gatewayTransactionId) => {
  const result = await db.query(
    `SELECT * FROM "transactions" WHERE "gatewayTransactionId" = $1`,
    [gatewayTransactionId]
  );

  return result.rows[0] || null;
};

export const getTransactionByGatewayRequestId = async (gatewayRequestId) => {
  const result = await db.query(
    `SELECT * FROM "transactions" WHERE "gatewayRequestId" = $1`,
    [gatewayRequestId]
  );

  return result.rows[0] || null;
};

export const setTransactionWebhookByGatewayRequestId = async (
  gatewayRequestId,
  { status, gatewayResponse, webhookReceived = true }
) => {
  const result = await db.query(
    `UPDATE "transactions"
     SET "status" = $2,
         "gatewayResponse" = COALESCE($3, "gatewayResponse"),
         "webhookReceived" = $4,
         "processingCompletedAt" = CASE WHEN $5 IN ('succeeded','failed','timeout','cancelled') THEN CURRENT_TIMESTAMP ELSE "processingCompletedAt" END,
         "updatedAt" = CURRENT_TIMESTAMP
     WHERE "gatewayRequestId" = $1
     RETURNING *`,
    [gatewayRequestId, status, gatewayResponse, webhookReceived, String(status)]
  );

  return result.rows[0] || null;
};

export const setTransactionWebhookByGatewayId = async (
  gatewayTransactionId,
  { status, gatewayResponse, webhookReceived = true }
) => {
  const result = await db.query(
    `UPDATE "transactions"
     SET "status" = $2,
         "gatewayResponse" = COALESCE($3, "gatewayResponse"),
         "webhookReceived" = $4,
         "processingCompletedAt" = CASE WHEN $5 IN ('succeeded','failed','timeout','cancelled') THEN CURRENT_TIMESTAMP ELSE "processingCompletedAt" END,
         "updatedAt" = CURRENT_TIMESTAMP
     WHERE "gatewayTransactionId" = $1
     RETURNING *`,
    [
      gatewayTransactionId,
      status,
      gatewayResponse,
      webhookReceived,
      String(status),
    ]
  );

  return result.rows[0] || null;
};

export const getTransactionsByType = async (
  transactionType,
  limit = 50,
  offset = 0
) => {
  const result = await db.query(
    `SELECT t.*, c.name as "campaignName", u."email" as "userEmail"
     FROM "transactions" t
     LEFT JOIN "campaigns" c ON t."campaignId" = c."campaignId"
     LEFT JOIN "users" u ON t."userId" = u."userId"
     WHERE t."transactionType" = $1
     ORDER BY t."transactionTimestamp" DESC
     LIMIT $2 OFFSET $3`,
    [transactionType, limit, offset]
  );

  return result.rows;
};

export const getTransactionSummary = async (limit = 10) => {
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
};

export const getAdminTransactions = async (filters) => {
  const {
    page = 1,
    limit = 50,
    search,
    campaignId,
    status,
    gatewayUsed,
    sortBy = "transactionTimestamp",
    sortOrder = "desc",
  } = filters;

  const offset = (page - 1) * limit;

  // Build the base query with joins
  let baseQuery = `
    FROM "transactions" t
    LEFT JOIN "users" u ON t."userId" = u."userId"
    LEFT JOIN "campaigns" c ON t."campaignId" = c."campaignId"
    WHERE 1=1
  `;

  const queryParams = [];
  let paramCount = 0;

  // Add search filter
  if (search) {
    paramCount++;
    baseQuery += ` AND (
      u."email" ILIKE $${paramCount} OR 
      c.name ILIKE $${paramCount} OR 
      t."gatewayTransactionId" ILIKE $${paramCount}
    )`;
    queryParams.push(`%${search}%`);
  }

  // Add campaign filter
  if (campaignId) {
    paramCount++;
    baseQuery += ` AND t."campaignId" = $${paramCount}`;
    queryParams.push(campaignId);
  }

  // Add status filter
  if (status) {
    paramCount++;
    baseQuery += ` AND t."status" = $${paramCount}`;
    queryParams.push(status);
  }

  // Add gateway filter
  if (gatewayUsed) {
    paramCount++;
    baseQuery += ` AND t."gatewayUsed" = $${paramCount}`;
    queryParams.push(gatewayUsed);
  }

  // Normalize sortBy for joined/alias columns
  const sortColumnMap = {
    campaignName: "c.name",
    userEmail: 'u."email"',
  };
  const orderBy = sortColumnMap[sortBy] || `t."${sortBy}"`;

  // Build the SELECT query
  const selectQuery = `
    SELECT 
      t."transactionId",
      t."userId",
      t."campaignId",
      t."amount",
      t."currency",
      t."gatewayTransactionId",
      t."gatewayUsed",
      t."status",
      t."transactionTimestamp",
      t."feesAmount",
      t."transactionType",
      t."phoneNumber",
      t."createdAt",
      t."updatedAt",
      u."email" as "userEmail",
      c.name as "campaignName"
    ${baseQuery}
    ORDER BY ${orderBy} ${sortOrder.toUpperCase()}
    LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
  `;

  // Build the count query
  const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;

  // Add limit and offset parameters
  queryParams.push(limit, offset);

  // Execute both queries
  const [transactionsResult, countResult] = await Promise.all([
    db.query(selectQuery, queryParams),
    db.query(countQuery, queryParams.slice(0, -2)), // Remove limit and offset for count
  ]);

  const transactions = transactionsResult.rows;
  const total = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(total / limit);

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};
