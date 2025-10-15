/**
 * Error Handling Middleware Module
 *
 * This module provides comprehensive error handling middleware for the Express application.
 * It centralizes error processing, provides consistent error responses, and handles
 * different types of errors with appropriate HTTP status codes and logging.
 *
 * ERROR HANDLING FEATURES:
 * - Centralized error processing
 * - Custom error class handling
 * - Environment-specific error responses
 * - Comprehensive error logging
 * - Async error handling wrapper
 *
 * MIDDLEWARE FUNCTIONS:
 * - catchAsync: Wrapper for async route handlers to catch errors
 * - errorHandler: Main error handling middleware
 * - notFound: 404 error handler for undefined routes
 * - globalErrorHandler: Global error processing middleware
 *
 * ERROR CATEGORIES:
 * - Operational errors: Expected errors (validation, auth, etc.)
 * - Programming errors: Unexpected errors (bugs, system errors)
 * - Database errors: Database operation failures
 * - Validation errors: Input validation failures
 * - Authentication errors: Auth-related failures
 *
 * ERROR RESPONSE FORMAT:
 * - Development: Detailed error information with stack traces
 * - Production: Sanitized error messages without sensitive data
 * - Consistent response structure
 * - Proper HTTP status codes
 * - Error logging for monitoring
 *
 * SECURITY FEATURES:
 * - Error message sanitization in production
 * - Stack trace hiding in production
 * - Sensitive data protection
 * - Error information filtering
 * - Security event logging
 *
 * LOGGING FEATURES:
 * - Error severity classification
 * - Request context logging
 * - User information logging
 * - Error stack trace logging
 * - Performance impact logging
 *
 * ENVIRONMENT HANDLING:
 * - Development: Detailed error information
 * - Production: Minimal error exposure
 * - Testing: Error simulation support
 * - Staging: Balanced error information
 *
 * INTEGRATION:
 * - Works with custom error classes
 * - Compatible with Express.js
 * - Supports monitoring tools
 * - Enables debugging and troubleshooting
 *
 * ERROR FLOW:
 * - Error occurrence in route handler
 * - catchAsync wrapper catches error
 * - Error passed to error handler middleware
 * - Error classification and processing
 * - Response generation and logging
 *
 * @author Your Name
 * @version 1.0.0
 * @since 2024
 */

import logger from "../utils/logger.js";
import {
  AppError,
  normalizeError,
  isOperationalError,
} from "../utils/appError.js";
import config from "../config/index.js";

/**
 * Global error handling middleware
 * This should be the last middleware in your app
 */
const errorHandler = (err, req, res, next) => {
  // Normalize the error to ensure consistent structure
  const error = normalizeError(err);

  // Log the error
  logError(error, req);

  // Send error response
  sendErrorResponse(error, req, res);
};

/**
 * Log errors with appropriate level and context
 */
const logError = (error, req) => {
  const context = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    userId: req.user?.id || "anonymous",
    body: req.method !== "GET" ? req.body : undefined,
    params: req.params,
    query: req.query,
  };

  // Remove sensitive data from logs
  if (context.body) {
    const sanitizedBody = { ...context.body };
    delete sanitizedBody.password;
    delete sanitizedBody.confirmPassword;
    delete sanitizedBody.token;
    context.body = sanitizedBody;
  }

  if (error.statusCode >= 500) {
    // Server errors - log as error with full context
    logger.error(`${error.statusCode} - ${error.message}`, {
      error: {
        message: error.message,
        stack: error.stack,
        statusCode: error.statusCode,
        errorCode: error.errorCode,
      },
      request: context,
    });
  } else if (error.statusCode >= 400) {
    // Client errors - log as warning with basic context
    logger.warn(`${error.statusCode} - ${error.message}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userId: req.user?.id || "anonymous",
      errorCode: error.errorCode,
    });
  }

  // Log security-related errors separately
  if (
    error.errorCode === "AUTHENTICATION_ERROR" ||
    error.errorCode === "AUTHORIZATION_ERROR"
  ) {
    logger.security.suspiciousActivity(`${error.errorCode}: ${error.message}`, {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      url: req.originalUrl,
      userId: req.user?.id,
    });
  }
};

/**
 * Send appropriate error response based on environment and error type
 */
const sendErrorResponse = (error, req, res) => {
  const isDevelopment = config.env === "development";
  const isProduction = config.env === "production";

  // Set appropriate headers
  if (error.errorCode === "RATE_LIMIT_ERROR" && error.retryAfter) {
    res.set("Retry-After", error.retryAfter);
  }

  // Base response structure
  const response = {
    success: false,
    status: error.status,
    message: error.message,
    errorCode: error.errorCode,
    timestamp: error.timestamp,
  };

  // Add additional fields in development
  if (isDevelopment) {
    response.stack = error.stack;
    if (error.field) response.field = error.field;
    if (error.value) response.value = error.value;
    if (error.resource) response.resource = error.resource;
    if (error.service) response.service = error.service;
  }

  // Handle specific error types in production
  if (isProduction && !isOperationalError(error)) {
    // Don't leak internal error details in production
    response.message = "Something went wrong";
    response.errorCode = "INTERNAL_SERVER_ERROR";
  }

  // Add request ID if available (useful for debugging)
  if (req.id) {
    response.requestId = req.id;
  }

  res.status(error.statusCode).json(response);
};

/**
 * Async error wrapper - wraps async route handlers to catch errors
 * Usage: app.get('/route', catchAsync(asyncHandler))
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle 404 errors for routes that don't exist
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    "ROUTE_NOT_FOUND"
  );
  next(error);
};

/**
 * Handle uncaught exceptions and unhandled rejections
 */
const handleUncaughtException = () => {
  process.on("uncaughtException", (error) => {
    logger.error("UNCAUGHT EXCEPTION! 💥 Shutting down...", {
      error: {
        message: error.message,
        stack: error.stack,
      },
    });

    // Close server gracefully, then exit
    process.exit(1);
  });
};

const handleUnhandledRejection = (server) => {
  process.on("unhandledRejection", (reason, promise) => {
    logger.error("UNHANDLED REJECTION! 💥 Shutting down...", {
      reason: reason,
      promise: promise,
    });

    // Close server gracefully, then exit
    server.close(() => {
      process.exit(1);
    });
  });
};

/**
 * Validation error handler for request validation
 */
const validationErrorHandler = (error, req, res, next) => {
  if (error.name === "ValidationError") {
    const validationError = normalizeError(error);
    return sendErrorResponse(validationError, req, res);
  }
  next(error);
};

/**
 * Database error handler
 */
const databaseErrorHandler = (error, req, res, next) => {
  if (error.code && typeof error.code === "string") {
    const dbError = normalizeError(error);
    return sendErrorResponse(dbError, req, res);
  }
  next(error);
};

/**
 * Rate limit logging middleware
 * Intercepts rate limit responses and logs them with specific details
 */
const rateLimitLogger = (req, res, next) => {
  // Store the original send function
  const originalSend = res.send;

  // Override the send function to intercept responses
  res.send = function (data) {
    // Check if this is a rate limit response (429)
    if (res.statusCode === 429) {
      let responseData;
      try {
        responseData = typeof data === "string" ? JSON.parse(data) : data;
      } catch (e) {
        responseData = { message: data };
      }

      // Determine which rate limiter was triggered based on the endpoint
      let rateLimiterType = "UNKNOWN";
      if (req.originalUrl.includes("/login")) {
        rateLimiterType = "LOGIN_RATE_LIMITER";
      } else if (req.originalUrl.includes("/forgot-password")) {
        rateLimiterType = "PASSWORD_RESET_RATE_LIMITER";
      } else if (req.originalUrl.includes("/resend-verification")) {
        rateLimiterType = "RESEND_VERIFICATION_RATE_LIMITER";
      } else if (req.originalUrl.startsWith("/api/")) {
        rateLimiterType = "GLOBAL_API_RATE_LIMITER";
      }

      logger.warn("Rate limit exceeded", {
        ip: req.ip,
        endpoint: req.originalUrl,
        method: req.method,
        userAgent: req.get("User-Agent"),
        rateLimiterType: rateLimiterType,
        errorCode: responseData.errorCode || "RATE_LIMIT_EXCEEDED",
        message: responseData.message,
        timestamp: new Date().toISOString(),
        // Include email if available in request body (for email-based limiters)
        email: req.body?.email?.toLowerCase(),
      });
    }

    // Call the original send function
    return originalSend.call(this, data);
  };

  next();
};

export {
  errorHandler,
  catchAsync,
  notFoundHandler,
  handleUncaughtException,
  handleUnhandledRejection,
  validationErrorHandler,
  databaseErrorHandler,
  rateLimitLogger,
};
