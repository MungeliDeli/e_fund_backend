/**
 * Audit Routes
 *
 * Defines all audit log API endpoints for the FundFlow backend.
 * Maps HTTP routes to controller actions, applies middleware for validation and authentication,
 * and organizes endpoints for audit log management and retrieval.
 *
 * Key Features:
 * - Audit log creation and retrieval routes
 * - Advanced filtering and pagination routes
 * - Statistics and summary routes
 * - Admin-only management routes
 * - Middleware integration for validation and authentication
 * - RESTful route organization
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { Router } from "express";
import { logRequestCount } from "../../middlewares/requestLogger.middleware.js";
import { catchAsync } from "../../middlewares/errorHandler.js";
import {
  authenticate,
  requireSupportAdmin,
} from "../../middlewares/auth.middleware.js";
import {
  validateCreateAuditLog,
  validateGetAuditLogs,
  validateAuditLogId,
  validateUserId,
  validateEntity,
} from "./audit.validation.js";
import {
  createAuditLog,
  getAuditLogs,
  getAuditLogById,
  getAuditLogsByUser,
  getAuditLogsByEntity,
  getAuditLogStats,
  getAuditLogSummary,
  deleteOldAuditLogs,
  exportAuditLogs,
} from "./audit.controller.js";

const router = Router();

// Apply request logger to all audit routes
router.use(logRequestCount);

/**
 * @route   POST /api/v1/audit/logs
 * @desc    Create a new audit log entry
 * @access  Private (requires authentication)
 */
router.post(
  "/logs",
  authenticate,
  validateCreateAuditLog,
  catchAsync(createAuditLog)
);

/**
 * @route   GET /api/v1/audit/logs
 * @desc    Get audit logs with filtering and pagination
 * @access  Private (requires authentication)
 */
router.get(
  "/logs",
  authenticate,
  validateGetAuditLogs,
  catchAsync(getAuditLogs)
);

/**
 * @route   GET /api/v1/audit/logs/:logId
 * @desc    Get audit log by ID
 * @access  Private (requires authentication)
 */
router.get(
  "/logs/:logId",
  authenticate,
  validateAuditLogId,
  catchAsync(getAuditLogById)
);

/**
 * @route   GET /api/v1/audit/logs/user/:userId
 * @desc    Get audit logs by user ID
 * @access  Private (requires authentication)
 */
router.get(
  "/logs/user/:userId",
  authenticate,
  validateUserId,
  validateGetAuditLogs,
  catchAsync(getAuditLogsByUser)
);

/**
 * @route   GET /api/v1/audit/logs/entity/:entityType/:entityId
 * @desc    Get audit logs by entity
 * @access  Private (requires authentication)
 */
router.get(
  "/logs/entity/:entityType/:entityId",
  authenticate,
  validateEntity,
  validateGetAuditLogs,
  catchAsync(getAuditLogsByEntity)
);

/**
 * @route   GET /api/v1/audit/stats
 * @desc    Get audit log statistics
 * @access  Private (requires authentication)
 */
router.get(
  "/stats",
  authenticate,
  validateGetAuditLogs,
  catchAsync(getAuditLogStats)
);

/**
 * @route   GET /api/v1/audit/summary
 * @desc    Get audit log summary for dashboard
 * @access  Private (requires authentication)
 */
router.get(
  "/summary",
  authenticate,
  validateGetAuditLogs,
  catchAsync(getAuditLogSummary)
);

/**
 * @route   GET /api/v1/audit/export
 * @desc    Export audit logs (JSON or CSV)
 * @access  Private (requires admin authentication)
 */
router.get(
  "/export",
  authenticate,
  requireSupportAdmin,
  validateGetAuditLogs,
  catchAsync(exportAuditLogs)
);

/**
 * @route   DELETE /api/v1/audit/logs/cleanup
 * @desc    Delete old audit logs (admin only)
 * @access  Private (requires admin authentication)
 */
router.delete(
  "/logs/cleanup",
  authenticate,
  requireSupportAdmin,
  catchAsync(deleteOldAuditLogs)
);

export default router;
