/**
 * Audit Repository
 *
 * Handles all database operations for audit logs including creation, retrieval,
 * filtering, and data management. Implements efficient querying with proper
 * indexing and transaction support.
 *
 * Key Features:
 * - Audit log creation and retrieval
 * - Advanced filtering and pagination
 * - Efficient querying with database indexes
 * - Transaction support for data integrity
 * - Data sanitization and validation
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { pool } from "../../db/index.js";
import { DatabaseError, NotFoundError } from "../../utils/appError.js";
import logger from "../../utils/logger.js";

/**
 * Create a new audit log entry
 * @param {Object} auditData - Audit log data
 * @param {Object} client - Database client for transaction
 * @returns {Promise<Object>} Created audit log
 */
async function createAuditLog(auditData, client = pool) {
  try {
    const {
      userId,
      actionType,
      entityType,
      entityId,
      details,
      ipAddress,
      userAgent,
      sessionId,
    } = auditData;

    const query = `
      INSERT INTO "auditLogs" (
        "userId", "actionType", "entityType", "entityId", 
        "details", "ipAddress", "userAgent", "sessionId"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      userId,
      actionType,
      entityType,
      entityId,
      details ? JSON.stringify(details) : null,
      ipAddress,
      userAgent,
      sessionId,
    ];

    const result = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    logger.error("Error creating audit log:", error);
    throw new DatabaseError("Failed to create audit log");
  }
}

/**
 * Get audit logs with filtering and pagination
 * @param {Object} filters - Filter criteria
 * @param {Object} pagination - Pagination parameters
 * @param {Object} client - Database client for transaction
 * @returns {Promise<Object>} Paginated audit logs
 */
async function getAuditLogs(filters = {}, pagination = {}, client = pool) {
  try {
    const {
      actionType,
      entityType,
      entityId,
      userId,
      startDate,
      endDate,
      search,
    } = filters;

    const {
      page = 1,
      limit = 50,
      sortBy = "timestamp",
      sortOrder = "desc",
    } = pagination;

    // Build WHERE clause
    const whereConditions = [];
    const values = [];
    let valueIndex = 1;

    if (actionType) {
      whereConditions.push(`"actionType" = $${valueIndex++}`);
      values.push(actionType);
    }

    if (entityType) {
      whereConditions.push(`"entityType" = $${valueIndex++}`);
      values.push(entityType);
    }

    if (entityId) {
      whereConditions.push(`"entityId" = $${valueIndex++}`);
      values.push(entityId);
    }

    if (userId) {
      whereConditions.push(`"userId" = $${valueIndex++}`);
      values.push(userId);
    }

    if (startDate) {
      whereConditions.push(`"timestamp" >= $${valueIndex++}`);
      values.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`"timestamp" <= $${valueIndex++}`);
      values.push(endDate);
    }

    if (search) {
      whereConditions.push(`(
        "actionType"::text ILIKE $${valueIndex} OR 
        "entityType" ILIKE $${valueIndex} OR
        "details"::text ILIKE $${valueIndex}
      )`);
      values.push(`%${search}%`);
      valueIndex++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Validate sortBy to prevent SQL injection
    const allowedSortFields = [
      "timestamp",
      "actionType",
      "entityType",
      "userId",
    ];
    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "timestamp";
    const safeSortOrder = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "auditLogs"
      ${whereClause}
    `;

    const countResult = await client.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Data query
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT 
        a."logId",
        a."userId",
        -- Prefer organization name if exists; else individual's full name; else NULL
        COALESCE(op."organizationShortName", CONCAT(ip."firstName", ' ', ip."lastName")) AS "userDisplayName",
        a."actionType",
        a."entityType",
        a."entityId",
        a."details",
        a."timestamp",
        a."ipAddress",
        a."userAgent",
        a."sessionId"
      FROM "auditLogs" a
      LEFT JOIN "organizationProfiles" op ON op."userId" = a."userId"
      LEFT JOIN "individualProfiles" ip ON ip."userId" = a."userId"
      ${whereClause}
      ORDER BY "${safeSortBy}" ${safeSortOrder}
      LIMIT $${valueIndex++} OFFSET $${valueIndex++}
    `;

    const dataValues = [...values, limit, offset];
    const dataResult = await client.query(dataQuery, dataValues);

    return {
      logs: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  } catch (error) {
    logger.error("Error retrieving audit logs:", error);
    throw new DatabaseError("Failed to retrieve audit logs");
  }
}

/**
 * Get audit log by ID
 * @param {string} logId - Audit log ID
 * @param {Object} client - Database client for transaction
 * @returns {Promise<Object>} Audit log
 */
async function getAuditLogById(logId, client = pool) {
  try {
    const query = `
      SELECT 
        "logId", "userId", "actionType", "entityType", "entityId",
        "details", "timestamp", "ipAddress", "userAgent", "sessionId"
      FROM "auditLogs"
      WHERE "logId" = $1
    `;

    const result = await client.query(query, [logId]);

    if (result.rows.length === 0) {
      throw new NotFoundError("Audit log not found");
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error retrieving audit log by ID:", error);
    throw new DatabaseError("Failed to retrieve audit log");
  }
}

/**
 * Get audit logs by user ID
 * @param {string} userId - User ID
 * @param {Object} pagination - Pagination parameters
 * @param {Object} client - Database client for transaction
 * @returns {Promise<Object>} Paginated audit logs for user
 */
async function getAuditLogsByUser(userId, pagination = {}, client = pool) {
  try {
    const filters = { userId };
    return await getAuditLogs(filters, pagination, client);
  } catch (error) {
    logger.error("Error retrieving audit logs by user:", error);
    throw new DatabaseError("Failed to retrieve user audit logs");
  }
}

/**
 * Get audit logs by entity
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 * @param {Object} pagination - Pagination parameters
 * @param {Object} client - Database client for transaction
 * @returns {Promise<Object>} Paginated audit logs for entity
 */
async function getAuditLogsByEntity(
  entityType,
  entityId,
  pagination = {},
  client = pool
) {
  try {
    const filters = { entityType, entityId };
    return await getAuditLogs(filters, pagination, client);
  } catch (error) {
    logger.error("Error retrieving audit logs by entity:", error);
    throw new DatabaseError("Failed to retrieve entity audit logs");
  }
}

/**
 * Get audit log statistics
 * @param {Object} filters - Filter criteria
 * @param {Object} client - Database client for transaction
 * @returns {Promise<Object>} Audit log statistics
 */
async function getAuditLogStats(filters = {}, client = pool) {
  try {
    const { startDate, endDate, userId, actionType } = filters;

    // Build WHERE clause
    const whereConditions = [];
    const values = [];
    let valueIndex = 1;

    if (startDate) {
      whereConditions.push(`"timestamp" >= $${valueIndex++}`);
      values.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`"timestamp" <= $${valueIndex++}`);
      values.push(endDate);
    }

    if (userId) {
      whereConditions.push(`"userId" = $${valueIndex++}`);
      values.push(userId);
    }

    if (actionType) {
      whereConditions.push(`"actionType" = $${valueIndex++}`);
      values.push(actionType);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const query = `
      SELECT 
        COUNT(*) as totalLogs,
        COUNT(DISTINCT "userId") as uniqueUsers,
        COUNT(DISTINCT "actionType") as uniqueActions,
        COUNT(DISTINCT "entityType") as uniqueEntities,
        MIN("timestamp") as earliestLog,
        MAX("timestamp") as latestLog
      FROM "auditLogs"
      ${whereClause}
    `;

    const result = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    logger.error("Error retrieving audit log statistics:", error);
    throw new DatabaseError("Failed to retrieve audit log statistics");
  }
}

/**
 * Delete audit logs older than specified date
 * @param {Date} cutoffDate - Cutoff date for deletion
 * @param {Object} client - Database client for transaction
 * @returns {Promise<number>} Number of deleted logs
 */
async function deleteOldAuditLogs(cutoffDate, client = pool) {
  try {
    const query = `
      DELETE FROM "auditLogs"
      WHERE "timestamp" < $1
    `;

    const result = await client.query(query, [cutoffDate]);
    return result.rowCount;
  } catch (error) {
    logger.error("Error deleting old audit logs:", error);
    throw new DatabaseError("Failed to delete old audit logs");
  }
}

export default {
  createAuditLog,
  getAuditLogs,
  getAuditLogById,
  getAuditLogsByUser,
  getAuditLogsByEntity,
  getAuditLogStats,
  deleteOldAuditLogs,
};
