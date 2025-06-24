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
