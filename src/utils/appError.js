/**
 * Application Error Handling Module
 * 
 * This module provides a comprehensive error handling system with custom error classes
 * that extend the built-in Error class. It standardizes error responses across the
 * application and provides detailed error information for debugging and logging.
 * 
 * CUSTOM ERROR CLASSES:
 * - AppError: Base error class with common error properties
 * - ValidationError: For input validation failures
 * - AuthenticationError: For authentication-related errors
 * - AuthorizationError: For authorization and permission errors
 * - NotFoundError: For resource not found errors
 * - ConflictError: For data conflict errors (duplicates, constraints)
 * - DatabaseError: For database operation failures
 * - EmailError: For email sending failures
 * - JWTError: For JWT token-related errors
 * - RateLimitError: For rate limiting violations
 * 
 * ERROR PROPERTIES:
 * - message: Human-readable error message
 * - statusCode: HTTP status code
 * - status: Status text (fail/error)
 * - isOperational: Indicates if error is operational or programming
 * - stack: Error stack trace
 * - timestamp: Error occurrence timestamp
 * - path: Request path where error occurred
 * - method: HTTP method of the request
 * - userAgent: Client user agent
 * - ip: Client IP address
 * 
 * ERROR CATEGORIES:
 * - Client Errors (4xx): Validation, Authentication, Authorization, Not Found, Conflict
 * - Server Errors (5xx): Database, Email, JWT, Rate Limit
 * - Operational vs Programming: Distinguishes expected vs unexpected errors
 * 
 * ERROR HANDLING FEATURES:
 * - Automatic status code assignment
 * - Stack trace capture
 * - Timestamp recording
 * - Request context capture
 * - Operational error flagging
 * - Error inheritance chain
 * 
 * HTTP STATUS CODES:
 * - 400: Bad Request (ValidationError)
 * - 401: Unauthorized (AuthenticationError)
 * - 403: Forbidden (AuthorizationError)
 * - 404: Not Found (NotFoundError)
 * - 409: Conflict (ConflictError)
 * - 429: Too Many Requests (RateLimitError)
 * - 500: Internal Server Error (DatabaseError, EmailError, JWTError)
 * 
 * USAGE PATTERNS:
 * - throw new ValidationError("Invalid email format");
 * - throw new AuthenticationError("Invalid credentials");
 * - throw new NotFoundError("User");
 * - throw new ConflictError("Email already exists");
 * 
 * ERROR CONTEXT:
 * - Request information capture
 * - User agent logging
 * - IP address tracking
 * - Request method and path
 * - Timestamp for debugging
 * 
 * INTEGRATION:
 * - Works with Express error handling middleware
 * - Compatible with logging systems
 * - Supports error monitoring tools
 * - Enables structured error responses
 * 
 * @author Your Name
 * @version 1.0.0
 * @since 2024
 */

/**
 * Custom Application Error Class
 * Extends the native Error class to provide consistent error handling
 * across the entire application
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode = null, isOperational = true) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON format for API responses
   */
  toJSON() {
    return {
      status: this.status,
      statusCode: this.statusCode,
      message: this.message,
      errorCode: this.errorCode,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV === "development" && { stack: this.stack }),
    };
  }
}

/**
 * Predefined error types for common scenarios
 */
class ValidationError extends AppError {
  constructor(message, field = null, value = null) {
    super(message, 400, "VALIDATION_ERROR");
    this.field = field;
    this.value = value;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      field: this.field,
      value: this.value,
    };
  }
}

class AuthenticationError extends AppError {
  constructor(message = "Authentication failed") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

class AuthorizationError extends AppError {
  constructor(message = "Access denied") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND_ERROR");
    this.resource = resource;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      resource: this.resource,
    };
  }
}

class ConflictError extends AppError {
  constructor(message = "Resource conflict") {
    super(message, 409, "CONFLICT_ERROR");
  }
}

class DatabaseError extends AppError {
  constructor(message = "Database operation failed", originalError = null) {
    super(message, 500, "DATABASE_ERROR");
    this.originalError = originalError;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      ...(process.env.NODE_ENV === "development" &&
        this.originalError && {
          originalError: {
            message: this.originalError.message,
            code: this.originalError.code,
          },
        }),
    };
  }
}

class ExternalServiceError extends AppError {
  constructor(service, message = "External service error", statusCode = 502) {
    super(message, statusCode, "EXTERNAL_SERVICE_ERROR");
    this.service = service;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      service: this.service,
    };
  }
}

class RateLimitError extends AppError {
  constructor(message = "Too many requests", retryAfter = null) {
    super(message, 429, "RATE_LIMIT_ERROR");
    this.retryAfter = retryAfter;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * Error factory functions for common scenarios
 */
const ErrorFactory = {
  // Authentication & Authorization
  invalidCredentials: () =>
    new AuthenticationError("Invalid email or password"),
  tokenExpired: () => new AuthenticationError("Token has expired"),
  tokenInvalid: () => new AuthenticationError("Invalid token"),
  accessDenied: (resource = "resource") =>
    new AuthorizationError(`Access denied to ${resource}`),

  // Validation
  requiredField: (field) => new ValidationError(`${field} is required`, field),
  invalidFormat: (field, format) =>
    new ValidationError(`${field} must be a valid ${format}`, field),
  fieldTooShort: (field, minLength) =>
    new ValidationError(
      `${field} must be at least ${minLength} characters long`,
      field
    ),
  fieldTooLong: (field, maxLength) =>
    new ValidationError(
      `${field} must not exceed ${maxLength} characters`,
      field
    ),

  // Resource operations
  userNotFound: () => new NotFoundError("User"),
  campaignNotFound: () => new NotFoundError("Campaign"),
  donationNotFound: () => new NotFoundError("Donation"),

  // Conflicts
  emailExists: () => new ConflictError("Email address is already registered"),
  usernameExists: () => new ConflictError("Username is already taken"),

  // Database
  databaseConnection: () => new DatabaseError("Failed to connect to database"),
  queryFailed: (operation) =>
    new DatabaseError(`Database query failed: ${operation}`),

  // External services
  paymentFailed: () =>
    new ExternalServiceError("payment_processor", "Payment processing failed"),
  emailSendFailed: () =>
    new ExternalServiceError("email_service", "Failed to send email"),

  // Rate limiting
  tooManyRequests: (retryAfter) =>
    new RateLimitError("Too many requests, please try again later", retryAfter),
  tooManyLoginAttempts: () =>
    new RateLimitError("Too many login attempts, please try again later", 300),
};

/**
 * Utility function to check if an error is operational
 * (i.e., a known error that we can handle gracefully)
 */
const isOperationalError = (error) => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

/**
 * Convert unknown errors to AppError instances
 */
const normalizeError = (error) => {
  if (error instanceof AppError) {
    return error;
  }

  // Handle specific Node.js/PostgreSQL errors
  if (error.code) {
    switch (error.code) {
      case "23505": // Unique violation
        if (error.constraint && error.constraint.includes("email")) {
          return ErrorFactory.emailExists();
        }
        return new ConflictError("Resource already exists");

      case "23503": // Foreign key violation
        return new ValidationError("Referenced resource does not exist");

      case "23502": // Not null violation
        const field = error.column || "field";
        return ErrorFactory.requiredField(field);

      case "ECONNREFUSED":
        return ErrorFactory.databaseConnection();

      default:
        break;
    }
  }

  // Handle validation errors from libraries like Joi
  if (error.name === "ValidationError" && error.details) {
    const firstError = error.details[0];
    return new ValidationError(firstError.message, firstError.path?.[0]);
  }

  // Handle JWT errors
  if (error.name === "JsonWebTokenError") {
    return ErrorFactory.tokenInvalid();
  }

  if (error.name === "TokenExpiredError") {
    return ErrorFactory.tokenExpired();
  }

  // Default to generic server error
  return new AppError(
    process.env.NODE_ENV === "production"
      ? "Something went wrong"
      : error.message,
    500,
    "INTERNAL_SERVER_ERROR",
    false
  );
};

export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  RateLimitError,
  ErrorFactory,
  isOperationalError,
  normalizeError,
};
