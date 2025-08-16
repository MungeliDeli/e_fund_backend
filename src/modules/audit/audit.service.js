/**
 * Audit Service
 *
 * Contains business logic for audit log management including creation, retrieval,
 * filtering, and data processing. Handles audit log formatting and provides
 * high-level operations for the audit module.
 *
 * Key Features:
 * - Audit log creation and management
 * - Advanced filtering and pagination
 * - Data formatting and processing
 * - Business rule enforcement
 * - Error handling and validation
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import auditRepository from "./audit.repository.js";
import { transaction } from "../../db/index.js";
import {
  ValidationError,
  NotFoundError,
  DatabaseError,
  AuthorizationError,
} from "../../utils/appError.js";
import logger from "../../utils/logger.js";
import {
  AUDIT_CONFIG,
  ACTION_SECURITY_LEVELS,
  SECURITY_LEVELS,
} from "./audit.constants.js";

/**
 * Format audit log data for API response
 * @param {Object} auditLog - Raw audit log data from database
 * @returns {Object} Formatted audit log object
 */
function formatAuditLog(auditLog) {
  return {
    logId: auditLog.logId,
    userId: auditLog.userId,
    actionType: auditLog.actionType,
    entityType: auditLog.entityType,
    entityId: auditLog.entityId,
    details: auditLog.details || null,
    timestamp: auditLog.timestamp,
    ipAddress: auditLog.ipAddress,
    userAgent: auditLog.userAgent,
    sessionId: auditLog.sessionId,
    securityLevel:
      ACTION_SECURITY_LEVELS[auditLog.actionType] || SECURITY_LEVELS.LOW,
  };
}

/**
 * Sanitize sensitive data from audit log details
 * @param {Object} details - Audit log details object
 * @returns {Object} Sanitized details object
 */
function sanitizeDetails(details) {
  if (!details || typeof details !== "object") {
    return details;
  }

  const sanitized = { ...details };

  // Remove sensitive fields
  AUDIT_CONFIG.SENSITIVE_FIELDS.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  });

  return sanitized;
}

/**
 * Create a new audit log entry
 * @param {Object} auditData - Audit log data
 * @returns {Promise<Object>} Created audit log
 */
async function createAuditLog(auditData) {
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

    // Validate required fields
    if (!actionType || !entityType) {
      throw new ValidationError("actionType and entityType are required");
    }

    // Sanitize sensitive data
    const sanitizedDetails = sanitizeDetails(details);

    // Check details size limit
    if (
      sanitizedDetails &&
      JSON.stringify(sanitizedDetails).length > AUDIT_CONFIG.MAX_DETAILS_SIZE
    ) {
      throw new ValidationError(
        `Details object size exceeds maximum limit of ${AUDIT_CONFIG.MAX_DETAILS_SIZE} characters`
      );
    }

    const auditLogData = {
      userId,
      actionType,
      entityType,
      entityId,
      details: sanitizedDetails,
      ipAddress,
      userAgent,
      sessionId,
    };

    const result = await transaction(async (client) => {
      return await auditRepository.createAuditLog(auditLogData, client);
    });

    logger.info(`Audit log created: ${actionType} for ${entityType}`, {
      logId: result.logId,
      actionType,
      entityType,
      entityId,
      userId,
    });

    return formatAuditLog(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    logger.error("Error in createAuditLog service:", error);
    throw new DatabaseError("Failed to create audit log");
  }
}

/**
 * Get audit logs with filtering and pagination
 * @param {Object} filters - Filter criteria
 * @param {Object} pagination - Pagination parameters
 * @returns {Promise<Object>} Paginated audit logs
 */
async function getAuditLogs(filters = {}, pagination = {}) {
  try {
    // Validate pagination parameters
    const { page = 1, limit = AUDIT_CONFIG.DEFAULT_PAGE_SIZE } = pagination;

    if (page < 1) {
      throw new ValidationError("Page number must be at least 1");
    }

    if (limit < 1 || limit > AUDIT_CONFIG.MAX_PAGE_SIZE) {
      throw new ValidationError(
        `Limit must be between 1 and ${AUDIT_CONFIG.MAX_PAGE_SIZE}`
      );
    }

    const result = await auditRepository.getAuditLogs(filters, pagination);

    return {
      logs: result.logs.map(formatAuditLog),
      pagination: result.pagination,
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    logger.error("Error in getAuditLogs service:", error);
    throw new DatabaseError("Failed to retrieve audit logs");
  }
}

/**
 * Get audit log by ID
 * @param {string} logId - Audit log ID
 * @returns {Promise<Object>} Audit log
 */
async function getAuditLogById(logId) {
  try {
    const auditLog = await auditRepository.getAuditLogById(logId);
    return formatAuditLog(auditLog);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error("Error in getAuditLogById service:", error);
    throw new DatabaseError("Failed to retrieve audit log");
  }
}

/**
 * Get audit logs by user ID
 * @param {string} userId - User ID
 * @param {Object} pagination - Pagination parameters
 * @returns {Promise<Object>} Paginated audit logs for user
 */
async function getAuditLogsByUser(userId, pagination = {}) {
  try {
    const result = await auditRepository.getAuditLogsByUser(userId, pagination);

    return {
      logs: result.logs.map(formatAuditLog),
      pagination: result.pagination,
    };
  } catch (error) {
    logger.error("Error in getAuditLogsByUser service:", error);
    throw new DatabaseError("Failed to retrieve user audit logs");
  }
}

/**
 * Get audit logs by entity
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 * @param {Object} pagination - Pagination parameters
 * @returns {Promise<Object>} Paginated audit logs for entity
 */
async function getAuditLogsByEntity(entityType, entityId, pagination = {}) {
  try {
    const result = await auditRepository.getAuditLogsByEntity(
      entityType,
      entityId,
      pagination
    );

    return {
      logs: result.logs.map(formatAuditLog),
      pagination: result.pagination,
    };
  } catch (error) {
    logger.error("Error in getAuditLogsByEntity service:", error);
    throw new DatabaseError("Failed to retrieve entity audit logs");
  }
}

/**
 * Get audit log statistics
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Object>} Audit log statistics
 */
async function getAuditLogStats(filters = {}) {
  try {
    const stats = await auditRepository.getAuditLogStats(filters);

    return {
      totalLogs: parseInt(stats.totalLogs) || 0,
      uniqueUsers: parseInt(stats.uniqueUsers) || 0,
      uniqueActions: parseInt(stats.uniqueActions) || 0,
      uniqueEntities: parseInt(stats.uniqueEntities) || 0,
      earliestLog: stats.earliestLog,
      latestLog: stats.latestLog,
    };
  } catch (error) {
    logger.error("Error in getAuditLogStats service:", error);
    throw new DatabaseError("Failed to retrieve audit log statistics");
  }
}

/**
 * Delete audit logs older than specified date (admin only)
 * @param {Date} cutoffDate - Cutoff date for deletion
 * @param {Object} user - Current user (for authorization)
 * @returns {Promise<number>} Number of deleted logs
 */
async function deleteOldAuditLogs(cutoffDate, user) {
  try {
    // Check if user has admin privileges
    if (!user || !["superAdmin", "supportAdmin"].includes(user.userType)) {
      throw new AuthorizationError(
        "Insufficient permissions to delete audit logs"
      );
    }

    if (!cutoffDate || !(cutoffDate instanceof Date)) {
      throw new ValidationError("Valid cutoff date is required");
    }

    const deletedCount = await transaction(async (client) => {
      return await auditRepository.deleteOldAuditLogs(cutoffDate, client);
    });

    logger.info(`Deleted ${deletedCount} old audit logs`, {
      cutoffDate,
      deletedCount,
      deletedBy: user.userId,
    });

    return deletedCount;
  } catch (error) {
    if (
      error instanceof ValidationError ||
      error instanceof AuthorizationError
    ) {
      throw error;
    }
    logger.error("Error in deleteOldAuditLogs service:", error);
    throw new DatabaseError("Failed to delete old audit logs");
  }
}

/**
 * Get audit log summary for dashboard
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Object>} Audit log summary
 */
async function getAuditLogSummary(filters = {}) {
  try {
    const [stats, recentLogs] = await Promise.all([
      getAuditLogStats(filters),
      getAuditLogs(filters, { page: 1, limit: 10 }),
    ]);

    return {
      statistics: stats,
      recentLogs: recentLogs.logs,
      summary: {
        totalLogs: stats.totalLogs,
        uniqueUsers: stats.uniqueUsers,
        dateRange: {
          from: stats.earliestLog,
          to: stats.latestLog,
        },
      },
    };
  } catch (error) {
    logger.error("Error in getAuditLogSummary service:", error);
    throw new DatabaseError("Failed to retrieve audit log summary");
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
  getAuditLogSummary,
};
