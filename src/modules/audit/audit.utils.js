/**
 * Audit Utilities
 *
 * Provides helper functions for audit logging operations including user actions,
 * system events, security events, and general logging utilities. Simplifies
 * audit log creation across the application.
 *
 * Key Features:
 * - Main logging function for all audit events
 * - User-specific action logging
 * - System-level action logging
 * - Security event logging
 * - Context-aware logging utilities
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import auditService from "./audit.service.js";
import {
  AUTH_ACTIONS,
  CAMPAIGN_ACTIONS,
  USER_ACTIONS,
  SYSTEM_ACTIONS,
  DONATION_ACTIONS,
  OUTREACH_ACTIONS,
  NOTIFICATION_ACTIONS,
  ENTITY_TYPES,
} from "./audit.constants.js";
import logger from "../../utils/logger.js";

/**
 * Main logging function for all audit events
 * @param {Object} req - Express request object
 * @param {string} actionType - Type of action being logged
 * @param {string} entityType - Type of entity being acted upon
 * @param {string} entityId - ID of the entity (optional)
 * @param {Object} details - Additional details about the action
 * @param {string} userId - User ID (optional, will use req.user.userId if not provided)
 * @returns {Promise<Object>} Created audit log
 */
async function logAction(
  req,
  actionType,
  entityType,
  entityId = null,
  details = {},
  userId = null
) {
  try {
    const context = req.auditContext || {};
    const user = userId || req.user?.userId || context.userId;

    const auditData = {
      userId: user,
      actionType,
      entityType,
      entityId,
      details: {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl || req.url,
        ...details,
      },
      ipAddress: context.ipAddress || req.ip,
      userAgent: context.userAgent || req.headers["user-agent"],
      sessionId: context.sessionId,
    };

    const auditLog = await auditService.createAuditLog(auditData);

    logger.info(`Audit log created: ${actionType}`, {
      logId: auditLog.logId,
      actionType,
      entityType,
      entityId,
      userId: user,
    });

    return auditLog;
  } catch (error) {
    logger.error("Failed to create audit log:", error);
    throw error;
  }
}

/**
 * Log user-specific actions
 * @param {Object} req - Express request object
 * @param {string} actionType - Type of user action
 * @param {string} entityId - User ID being acted upon
 * @param {Object} details - Additional details
 * @returns {Promise<Object>} Created audit log
 */
async function logUserAction(req, actionType, entityId = null, details = {}) {
  const user = entityId || req.user?.userId;

  return await logAction(req, actionType, ENTITY_TYPES.USER, user, {
    actionCategory: "USER_MANAGEMENT",
    ...details,
  });
}

/**
 * Log system-level actions
 * @param {Object} req - Express request object
 * @param {string} actionType - Type of system action
 * @param {Object} details - Additional details
 * @returns {Promise<Object>} Created audit log
 */
async function logSystemAction(req, actionType, details = {}) {
  return await logAction(req, actionType, ENTITY_TYPES.SYSTEM, null, {
    actionCategory: "SYSTEM",
    ...details,
  });
}

/**
 * Log security-related events
 * @param {Object} req - Express request object
 * @param {string} actionType - Type of security action
 * @param {Object} details - Additional details
 * @returns {Promise<Object>} Created audit log
 */
async function logSecurityEvent(req, actionType, details = {}) {
  return await logAction(req, actionType, "Security", null, {
    actionCategory: "SECURITY",
    severity: details.severity || "MEDIUM",
    ...details,
  });
}

/**
 * Log authentication events
 * @param {Object} req - Express request object
 * @param {string} actionType - Type of auth action
 * @param {Object} details - Additional details
 * @returns {Promise<Object>} Created audit log
 */
async function logAuthEvent(req, actionType, details = {}) {
  const user = req.user?.userId || details.userId;

  return await logAction(req, actionType, ENTITY_TYPES.USER, user, {
    actionCategory: "AUTHENTICATION",
    success: details.success !== false,
    ...details,
  });
}

/**
 * Log campaign-related events
 * @param {Object} req - Express request object
 * @param {string} actionType - Type of campaign action
 * @param {string} campaignId - Campaign ID
 * @param {Object} details - Additional details
 * @returns {Promise<Object>} Created audit log
 */
async function logCampaignEvent(req, actionType, campaignId, details = {}) {
  return await logAction(req, actionType, ENTITY_TYPES.CAMPAIGN, campaignId, {
    actionCategory: "CAMPAIGN",
    ...details,
  });
}

/**
 * Log donation-related events
 * @param {Object} req - Express request object
 * @param {string} actionType - Type of donation action
 * @param {string} donationId - Donation ID
 * @param {Object} details - Additional details
 * @returns {Promise<Object>} Created audit log
 */
async function logDonationEvent(req, actionType, donationId, details = {}) {
  return await logAction(req, actionType, ENTITY_TYPES.DONATION, donationId, {
    actionCategory: "DONATION",
    ...details,
  });
}

/**
 * Log outreach-related events
 * @param {Object} req - Express request object
 * @param {string} actionType - Type of outreach action
 * @param {string} entityType - Type of outreach entity (Contact, Segment)
 * @param {string} entityId - Entity ID
 * @param {Object} details - Additional details
 * @returns {Promise<Object>} Created audit log
 */
async function logOutreachEvent(
  req,
  actionType,
  entityType,
  entityId,
  details = {}
) {
  return await logAction(req, actionType, entityType, entityId, {
    actionCategory: "OUTREACH",
    ...details,
  });
}

/**
 * Log notification events
 * @param {Object} req - Express request object
 * @param {string} actionType - Type of notification action
 * @param {string} notificationId - Notification ID
 * @param {Object} details - Additional details
 * @returns {Promise<Object>} Created audit log
 */
async function logNotificationEvent(
  req,
  actionType,
  notificationId,
  details = {}
) {
  return await logAction(
    req,
    actionType,
    ENTITY_TYPES.NOTIFICATION,
    notificationId,
    {
      actionCategory: "NOTIFICATION",
      ...details,
    }
  );
}

/**
 * Log data access events
 * @param {Object} req - Express request object
 * @param {string} entityType - Type of entity being accessed
 * @param {string} entityId - Entity ID
 * @param {string} accessType - Type of access (READ, WRITE, DELETE)
 * @param {Object} details - Additional details
 * @returns {Promise<Object>} Created audit log
 */
async function logDataAccess(
  req,
  entityType,
  entityId,
  accessType,
  details = {}
) {
  const actionType = `${entityType.toUpperCase()}_${accessType.toUpperCase()}`;

  return await logAction(req, actionType, entityType, entityId, {
    actionCategory: "DATA_ACCESS",
    accessType,
    ...details,
  });
}

/**
 * Log error events
 * @param {Object} req - Express request object
 * @param {Error} error - Error object
 * @param {string} context - Error context
 * @param {Object} details - Additional details
 * @returns {Promise<Object>} Created audit log
 */
async function logError(req, error, context = "GENERAL", details = {}) {
  return await logAction(req, "ERROR_OCCURRED", "System", null, {
    actionCategory: "ERROR",
    errorMessage: error.message,
    errorStack: error.stack,
    errorName: error.name,
    context,
    ...details,
  });
}

/**
 * Log performance events
 * @param {Object} req - Express request object
 * @param {string} operation - Operation being measured
 * @param {number} duration - Duration in milliseconds
 * @param {Object} details - Additional details
 * @returns {Promise<Object>} Created audit log
 */
async function logPerformance(req, operation, duration, details = {}) {
  const actionType =
    duration > 1000 ? "PERFORMANCE_SLOW" : "PERFORMANCE_NORMAL";

  return await logAction(req, actionType, "System", null, {
    actionCategory: "PERFORMANCE",
    operation,
    duration,
    threshold: 1000,
    ...details,
  });
}

/**
 * Log configuration changes
 * @param {Object} req - Express request object
 * @param {string} configKey - Configuration key being changed
 * @param {any} oldValue - Previous value
 * @param {any} newValue - New value
 * @param {Object} details - Additional details
 * @returns {Promise<Object>} Created audit log
 */
async function logConfigChange(
  req,
  configKey,
  oldValue,
  newValue,
  details = {}
) {
  return await logAction(
    req,
    SYSTEM_ACTIONS.CONFIGURATION_CHANGED,
    "System",
    null,
    {
      actionCategory: "CONFIGURATION",
      configKey,
      oldValue,
      newValue,
      ...details,
    }
  );
}

/**
 * Log file operations
 * @param {Object} req - Express request object
 * @param {string} operation - File operation (UPLOAD, DOWNLOAD, DELETE)
 * @param {string} fileName - Name of the file
 * @param {string} fileId - File ID
 * @param {Object} details - Additional details
 * @returns {Promise<Object>} Created audit log
 */
async function logFileOperation(
  req,
  operation,
  fileName,
  fileId,
  details = {}
) {
  const actionType = `FILE_${operation.toUpperCase()}`;

  return await logAction(req, actionType, ENTITY_TYPES.MEDIA, fileId, {
    actionCategory: "FILE_OPERATION",
    fileName,
    operation,
    ...details,
  });
}

/**
 * Log batch operations
 * @param {Object} req - Express request object
 * @param {string} operation - Batch operation type
 * @param {number} itemCount - Number of items processed
 * @param {Object} details - Additional details
 * @returns {Promise<Object>} Created audit log
 */
async function logBatchOperation(req, operation, itemCount, details = {}) {
  return await logAction(req, "BATCH_OPERATION", "System", null, {
    actionCategory: "BATCH",
    operation,
    itemCount,
    ...details,
  });
}

/**
 * Create a summary of audit events for reporting
 * @param {Object} filters - Filter criteria
 * @param {Date} startDate - Start date for summary
 * @param {Date} endDate - End date for summary
 * @returns {Promise<Object>} Audit summary
 */
async function createAuditSummary(
  filters = {},
  startDate = null,
  endDate = null
) {
  try {
    const summaryFilters = {
      ...filters,
      startDate: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      endDate: endDate || new Date(),
    };

    const summary = await auditService.getAuditLogSummary(summaryFilters);

    logger.info("Audit summary created", {
      totalLogs: summary.statistics.totalLogs,
      dateRange: summary.summary.dateRange,
    });

    return summary;
  } catch (error) {
    logger.error("Failed to create audit summary:", error);
    throw error;
  }
}

export {
  logAction,
  logUserAction,
  logSystemAction,
  logSecurityEvent,
  logAuthEvent,
  logCampaignEvent,
  logDonationEvent,
  logOutreachEvent,
  logNotificationEvent,
  logDataAccess,
  logError,
  logPerformance,
  logConfigChange,
  logFileOperation,
  logBatchOperation,
  createAuditSummary,
};
