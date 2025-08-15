/**
 * Audit Middleware
 *
 * Provides automatic audit logging middleware for capturing request context,
 * IP addresses, user agents, and session information. Integrates with the
 * audit service to automatically log important system events.
 *
 * Key Features:
 * - Automatic request context capture
 * - IP address and user agent extraction
 * - Session tracking and management
 * - Request/response logging
 * - Performance monitoring
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import auditService from "./audit.service.js";
import { AUTH_ACTIONS, SYSTEM_ACTIONS } from "./audit.constants.js";
import logger from "../../utils/logger.js";

/**
 * Extract client IP address from request
 * @param {Object} req - Express request object
 * @returns {string} Client IP address
 */
function getClientIp(req) {
  // Check for forwarded headers (when behind proxy/load balancer)
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim();
  }

  // Check for real IP header
  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    return realIp;
  }

  // Fallback to connection remote address
  return (
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown"
  );
}

/**
 * Extract user agent from request
 * @param {Object} req - Express request object
 * @returns {string} User agent string
 */
function getUserAgent(req) {
  return req.headers["user-agent"] || "unknown";
}

/**
 * Generate or retrieve session ID
 * @param {Object} req - Express request object
 * @returns {string} Session ID
 */
function getSessionId(req) {
  // If using express-session
  if (req.session && req.session.id) {
    return req.session.id;
  }

  // If using custom session management
  if (req.headers["x-session-id"]) {
    return req.headers["x-session-id"];
  }

  // Generate a temporary session ID based on request
  const sessionKey = `${req.ip}-${req.headers["user-agent"]}-${Date.now()}`;
  return require("crypto").createHash("md5").update(sessionKey).digest("hex");
}

/**
 * Create audit context from request
 * @param {Object} req - Express request object
 * @returns {Object} Audit context
 */
function createAuditContext(req) {
  return {
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    sessionId: getSessionId(req),
    userId: req.user?.userId || null,
    method: req.method,
    url: req.originalUrl || req.url,
    timestamp: new Date(),
  };
}

/**
 * Middleware to capture and log authentication events
 * @param {string} actionType - Type of authentication action
 * @returns {Function} Express middleware
 */
function logAuthEvent(actionType) {
  return async (req, res, next) => {
    try {
      const context = createAuditContext(req);

      // Extract relevant data from request
      const details = {
        method: context.method,
        url: context.url,
        success: true, // Will be updated in response interceptor
        ...(req.body && { requestData: req.body }),
      };

      // Log the authentication event
      await auditService.createAuditLog({
        userId: context.userId,
        actionType,
        entityType: "User",
        entityId: context.userId,
        details,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
      });

      logger.info(`Auth event logged: ${actionType}`, {
        userId: context.userId,
        ipAddress: context.ipAddress,
        actionType,
      });

      next();
    } catch (error) {
      // Don't block the request if audit logging fails
      logger.error("Failed to log auth event:", error);
      next();
    }
  };
}

/**
 * Middleware to log API requests (for monitoring)
 * @param {Array} excludePaths - Paths to exclude from logging
 * @returns {Function} Express middleware
 */
function logApiRequests(excludePaths = []) {
  return async (req, res, next) => {
    const startTime = Date.now();
    const context = createAuditContext(req);

    // Skip logging for excluded paths
    if (excludePaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    // Store context in request for later use
    req.auditContext = context;

    // Intercept response to log completion
    const originalSend = res.send;
    res.send = function (data) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Log the API request
      logApiRequest(context, {
        statusCode,
        duration,
        responseSize: data ? data.length : 0,
        success: statusCode < 400,
      }).catch((error) => {
        logger.error("Failed to log API request:", error);
      });

      originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Log API request details
 * @param {Object} context - Audit context
 * @param {Object} responseInfo - Response information
 */
async function logApiRequest(context, responseInfo) {
  try {
    const actionType = responseInfo.success
      ? "API_REQUEST_SUCCESS"
      : "API_REQUEST_ERROR";

    await auditService.createAuditLog({
      userId: context.userId,
      actionType,
      entityType: "API",
      entityId: null,
      details: {
        method: context.method,
        url: context.url,
        statusCode: responseInfo.statusCode,
        duration: responseInfo.duration,
        responseSize: responseInfo.responseSize,
        success: responseInfo.success,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
    });
  } catch (error) {
    logger.error("Failed to log API request:", error);
  }
}

/**
 * Middleware to log security events
 * @param {string} actionType - Type of security action
 * @param {Object} additionalDetails - Additional details to log
 * @returns {Function} Express middleware
 */
function logSecurityEvent(actionType, additionalDetails = {}) {
  return async (req, res, next) => {
    try {
      const context = createAuditContext(req);

      await auditService.createAuditLog({
        userId: context.userId,
        actionType,
        entityType: "Security",
        entityId: null,
        details: {
          method: context.method,
          url: context.url,
          ...additionalDetails,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
      });

      logger.warn(`Security event logged: ${actionType}`, {
        userId: context.userId,
        ipAddress: context.ipAddress,
        actionType,
        ...additionalDetails,
      });

      next();
    } catch (error) {
      logger.error("Failed to log security event:", error);
      next();
    }
  };
}

/**
 * Middleware to log system events
 * @param {string} actionType - Type of system action
 * @param {Object} details - Event details
 * @returns {Function} Express middleware
 */
function logSystemEvent(actionType, details = {}) {
  return async (req, res, next) => {
    try {
      const context = createAuditContext(req);

      await auditService.createAuditLog({
        userId: context.userId,
        actionType,
        entityType: "System",
        entityId: null,
        details: {
          timestamp: new Date().toISOString(),
          ...details,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
      });

      logger.info(`System event logged: ${actionType}`, {
        actionType,
        details,
      });

      next();
    } catch (error) {
      logger.error("Failed to log system event:", error);
      next();
    }
  };
}

/**
 * Middleware to inject audit context into request
 * @returns {Function} Express middleware
 */
function injectAuditContext() {
  return (req, res, next) => {
    req.auditContext = createAuditContext(req);
    next();
  };
}

/**
 * Helper function to log custom events
 * @param {Object} req - Express request object
 * @param {string} actionType - Action type
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 * @param {Object} details - Additional details
 */
async function logCustomEvent(
  req,
  actionType,
  entityType,
  entityId,
  details = {}
) {
  try {
    const context = req.auditContext || createAuditContext(req);

    await auditService.createAuditLog({
      userId: context.userId,
      actionType,
      entityType,
      entityId,
      details: {
        timestamp: new Date().toISOString(),
        ...details,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
    });

    logger.info(`Custom event logged: ${actionType}`, {
      actionType,
      entityType,
      entityId,
      userId: context.userId,
    });
  } catch (error) {
    logger.error("Failed to log custom event:", error);
  }
}

export {
  logAuthEvent,
  logApiRequests,
  logSecurityEvent,
  logSystemEvent,
  injectAuditContext,
  logCustomEvent,
  createAuditContext,
  getClientIp,
  getUserAgent,
  getSessionId,
};
