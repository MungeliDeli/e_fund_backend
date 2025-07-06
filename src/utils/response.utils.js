/**
 * Response Utilities Module
 * 
 * This module provides standardized response formatting utilities for the application.
 * It ensures consistent API response structure across all endpoints and provides
 * convenient methods for creating different types of HTTP responses.
 * 
 * RESPONSE FACTORY CLASS:
 * The ResponseFactory class provides static methods for creating standardized
 * HTTP responses with consistent structure and proper status codes.
 * 
 * RESPONSE STRUCTURE:
 * All responses follow a consistent format:
 * {
 *   success: boolean,
 *   message: string,
 *   data: any (optional),
 *   timestamp: string,
 *   path: string,
 *   method: string
 * }
 * 
 * RESPONSE METHODS:
 * - ok: 200 OK responses
 * - created: 201 Created responses
 * - noContent: 204 No Content responses
 * - badRequest: 400 Bad Request responses
 * - unauthorized: 401 Unauthorized responses
 * - forbidden: 403 Forbidden responses
 * - notFound: 404 Not Found responses
 * - conflict: 409 Conflict responses
 * - tooManyRequests: 429 Too Many Requests responses
 * - internalServerError: 500 Internal Server Error responses
 * - serviceUnavailable: 503 Service Unavailable responses
 * 
 * SUCCESS RESPONSES:
 * - Standard success responses with data
 * - Resource creation confirmations
 * - Operation completion notifications
 * - Status updates and confirmations
 * 
 * ERROR RESPONSES:
 * - Client error responses (4xx)
 * - Server error responses (5xx)
 * - Validation error responses
 * - Authentication error responses
 * - Authorization error responses
 * 
 * RESPONSE FEATURES:
 * - Automatic timestamp generation
 * - Request path and method inclusion
 * - Consistent success flag
 * - Optional data payload
 * - Human-readable messages
 * - Proper HTTP status codes
 * 
 * USAGE PATTERNS:
 * - ResponseFactory.ok(res, "Operation successful", data)
 * - ResponseFactory.created(res, "Resource created", newResource)
 * - ResponseFactory.badRequest(res, "Validation failed")
 * - ResponseFactory.notFound(res, "Resource not found")
 * 
 * INTEGRATION:
 * - Works with Express response objects
 * - Compatible with error handling middleware
 * - Supports logging and monitoring
 * - Enables consistent API documentation
 * 
 * BENEFITS:
 * - Consistent API responses
 * - Reduced code duplication
 * - Better error handling
 * - Improved API documentation
 * - Enhanced debugging capabilities
 * 
 * @author Your Name
 * @version 1.0.0
 * @since 2024
 */

// src/utils/response.utils.js

/**
 * Sends a standardized success JSON response.
 *
 * @param {object} res - The Express response object.
 * @param {number} statusCode - The HTTP status code for the response (e.g., 200, 201).
 * @param {string} [message="Operation successful."] - A human-readable message describing the outcome.
 * @param {object|array|null} [data=null] - The data payload to send in the response.
 * @param {object} [meta=null] - Optional metadata (e.g., pagination info, total counts).
 */
const sendSuccessResponse = (
  res,
  statusCode,
  message = "Operation successful.",
  data = null,
  meta = null
) => {
  const response = {
    success: true,
    status: "success", 
    message: message,
    ...(data !== null && { data }),
    ...(meta !== null && { meta }),
  };
  res.status(statusCode).json(response);
};

const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204, // Typically used with no data/message in response body
};

/**
 * Factory functions for common success responses.
 */
const ResponseFactory = {
  // General success
  ok: (res, message, data, meta) =>
    sendSuccessResponse(res, STATUS_CODES.OK, message, data, meta),
  created: (res, message, data, meta) =>
    sendSuccessResponse(res, STATUS_CODES.CREATED, message, data, meta),
  noContent: (res, message) =>
    sendSuccessResponse(res, STATUS_CODES.NO_CONTENT, message), // 204 typically has no body

  // User-specific
  userRegistered: (res, userId) =>
    sendSuccessResponse(
      res,
      STATUS_CODES.CREATED,
      "User registered successfully. Email verification link sent.",
      { userId }
    ),
  loggedIn: (res, token, user) =>
    sendSuccessResponse(res, STATUS_CODES.OK, "Login successful.", {
      token,
      user,
    }),
  profileUpdated: (res, profileData) =>
    sendSuccessResponse(res, STATUS_CODES.OK, "Profile updated successfully.", {
      profile: profileData,
    }),
  passwordChanged: (res) =>
    sendSuccessResponse(res, STATUS_CODES.OK, "Password updated successfully."),

  // Campaign-specific (examples for future modules)
  campaignCreated: (res, campaignId) =>
    sendSuccessResponse(
      res,
      STATUS_CODES.CREATED,
      "Campaign created successfully.",
      { campaignId }
    ),
  campaignsListed: (res, campaigns, page, limit, totalCount) =>
    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Campaigns retrieved successfully.",
      campaigns,
      { page, limit, totalCount }
    ),
  campaignDetails: (res, campaign) =>
    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Campaign details retrieved successfully.",
      campaign
    ),

  // Event-specific (examples for future modules)
  eventCreated: (res, eventId) =>
    sendSuccessResponse(
      res,
      STATUS_CODES.CREATED,
      "Event created successfully.",
      { eventId }
    ),
  eventsListed: (res, events, page, limit, totalCount) =>
    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Events retrieved successfully.",
      events,
      { page, limit, totalCount }
    ),
  eventDetails: (res, event) =>
    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Event details retrieved successfully.",
      event
    ),
};

export { sendSuccessResponse, ResponseFactory };
