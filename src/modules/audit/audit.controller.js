/**
 * Audit Controller
 *
 * Handles HTTP requests for audit log operations including creation, retrieval,
 * filtering, and management. Maps HTTP endpoints to service operations and
 * provides proper response formatting.
 *
 * Key Features:
 * - Audit log CRUD operations
 * - Advanced filtering and pagination
 * - Proper HTTP response formatting
 * - Error handling and validation
 * - Authorization checks
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import auditService from "./audit.service.js";
import { ResponseFactory } from "../../utils/response.utils.js";
import logger from "../../utils/logger.js";

/**
 * Create a new audit log entry
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function createAuditLog(req, res) {
  const auditData = req.body;

  const auditLog = await auditService.createAuditLog(auditData);

  logger.info("Audit log created via API", {
    logId: auditLog.logId,
    actionType: auditLog.actionType,
    entityType: auditLog.entityType,
  });

  ResponseFactory.created(res, "Audit log created successfully", auditLog);
}

/**
 * Get audit logs with filtering and pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAuditLogs(req, res) {
  const q = req.validated?.query || req.query || {};
  const filters = {
    actionType: q.actionType,
    entityType: q.entityType,
    entityId: q.entityId,
    userId: q.userId,
    startDate: q.startDate,
    endDate: q.endDate,
    search: q.search,
  };

  const pagination = {
    page: parseInt(q.page) || 1,
    limit: parseInt(q.limit) || 50,
    sortBy: q.sortBy || "timestamp",
    sortOrder: q.sortOrder || "desc",
  };

  // Remove undefined values
  Object.keys(filters).forEach((key) => {
    if (filters[key] === undefined) {
      delete filters[key];
    }
  });

  const result = await auditService.getAuditLogs(filters, pagination);

  ResponseFactory.ok(res, "Audit logs retrieved successfully", result);
}

/**
 * Get audit log by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAuditLogById(req, res) {
  const { logId } = req.params;

  const auditLog = await auditService.getAuditLogById(logId);

  ResponseFactory.ok(res, "Audit log retrieved successfully", auditLog);
}

/**
 * Get audit logs by user ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAuditLogsByUser(req, res) {
  const { userId } = req.params;

  const q1 = req.validated?.query || req.query || {};
  const pagination = {
    page: parseInt(q1.page) || 1,
    limit: parseInt(q1.limit) || 50,
    sortBy: q1.sortBy || "timestamp",
    sortOrder: q1.sortOrder || "desc",
  };

  const result = await auditService.getAuditLogsByUser(userId, pagination);

  ResponseFactory.ok(res, "User audit logs retrieved successfully", result);
}

/**
 * Get audit logs by entity
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAuditLogsByEntity(req, res) {
  const { entityType, entityId } = req.params;

  const q2 = req.validated?.query || req.query || {};
  const pagination = {
    page: parseInt(q2.page) || 1,
    limit: parseInt(q2.limit) || 50,
    sortBy: q2.sortBy || "timestamp",
    sortOrder: q2.sortOrder || "desc",
  };

  const result = await auditService.getAuditLogsByEntity(
    entityType,
    entityId,
    pagination
  );

  ResponseFactory.ok(res, "Entity audit logs retrieved successfully", result);
}

/**
 * Get audit log statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAuditLogStats(req, res) {
  const q3 = req.validated?.query || req.query || {};
  const filters = {
    startDate: q3.startDate,
    endDate: q3.endDate,
    userId: q3.userId,
    actionType: q3.actionType,
  };

  // Remove undefined values
  Object.keys(filters).forEach((key) => {
    if (filters[key] === undefined) {
      delete filters[key];
    }
  });

  const stats = await auditService.getAuditLogStats(filters);

  ResponseFactory.ok(res, "Audit log statistics retrieved successfully", stats);
}

/**
 * Get audit log summary for dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAuditLogSummary(req, res) {
  const q4 = req.validated?.query || req.query || {};
  const filters = {
    startDate: q4.startDate,
    endDate: q4.endDate,
    userId: q4.userId,
    actionType: q4.actionType,
  };

  // Remove undefined values
  Object.keys(filters).forEach((key) => {
    if (filters[key] === undefined) {
      delete filters[key];
    }
  });

  const summary = await auditService.getAuditLogSummary(filters);

  ResponseFactory.ok(res, "Audit log summary retrieved successfully", summary);
}

/**
 * Delete old audit logs (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function deleteOldAuditLogs(req, res) {
  const { cutoffDate } = req.body;
  const user = req.user;

  const deletedCount = await auditService.deleteOldAuditLogs(
    new Date(cutoffDate),
    user
  );

  logger.info("Old audit logs deleted via API", {
    cutoffDate,
    deletedCount,
    deletedBy: user.userId,
  });

  ResponseFactory.ok(
    res,
    `${deletedCount} old audit logs deleted successfully`,
    {
      deletedCount,
      cutoffDate,
    }
  );
}

/**
 * Export audit logs (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function exportAuditLogs(req, res) {
  const filters = {
    actionType: req.query.actionType,
    entityType: req.query.entityType,
    entityId: req.query.entityId,
    userId: req.query.userId,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  };

  const format = req.query.format || "json"; // json, csv

  // Remove undefined values
  Object.keys(filters).forEach((key) => {
    if (filters[key] === undefined) {
      delete filters[key];
    }
  });

  // Get all logs for export (no pagination)
  const result = await auditService.getAuditLogs(filters, {
    page: 1,
    limit: 10000,
  });

  if (format === "csv") {
    // Set headers for CSV download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="audit_logs.csv"'
    );

    // Convert to CSV format
    const csvHeaders = [
      "logId",
      "userId",
      "actionType",
      "entityType",
      "entityId",
      "timestamp",
      "ipAddress",
      "securityLevel",
    ];
    const csvData = result.logs.map((log) => [
      log.logId,
      log.userId,
      log.actionType,
      log.entityType,
      log.entityId,
      log.timestamp,
      log.ipAddress,
      log.securityLevel,
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map((row) => row.map((field) => `"${field || ""}"`).join(","))
      .join("\n");

    return res.send(csvContent);
  }

  // Default JSON response
  ResponseFactory.ok(res, "Audit logs exported successfully", {
    format,
    totalLogs: result.logs.length,
    logs: result.logs,
  });
}

export {
  createAuditLog,
  getAuditLogs,
  getAuditLogById,
  getAuditLogsByUser,
  getAuditLogsByEntity,
  getAuditLogStats,
  getAuditLogSummary,
  deleteOldAuditLogs,
  exportAuditLogs,
};
