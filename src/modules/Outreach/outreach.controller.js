/**
 * Outreach Controller
 *
 * Handles HTTP requests for outreach functionality including
 * link token management, email sending, and analytics.
 *
 * Key Features:
 * - Link token CRUD operations
 * - Email sending endpoints
 * - Analytics retrieval
 * - Request validation and response formatting
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import {
  createOutreachLinkToken,
  sendOutreachEmailService,
  getOutreachAnalytics,
  getContactAnalytics,
  getOutreachLinkTokens,
  deleteOutreachLinkToken,
  getOrganizerAnalytics,
} from "./outreach.service.js";
import { sendSuccessResponse } from "../../utils/response.utils.js";
import logger from "../../utils/logger.js";

/**
 * Create a new outreach link token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createLinkToken = async (req, res) => {
  const linkTokenData = req.body;
  const organizerId = req.user.userId;

  const linkToken = await createOutreachLinkToken(linkTokenData, organizerId);

  logger.info("Outreach link token created via controller", {
    linkTokenId: linkToken.linkTokenId,
    organizerId,
  });

  return sendSuccessResponse(
    res,
    201,
    "Link token created successfully",
    linkToken
  );
};

/**
 * Send outreach email to contact or segment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const sendEmail = async (req, res) => {
  const emailData = req.body;
  const organizerId = req.user.userId;

  const result = await sendOutreachEmailService(emailData, organizerId);

  logger.info("Outreach email sent via controller", {
    campaignId: result.campaignId,
    type: result.type,
    totalRecipients: result.totalRecipients,
    successfulSends: result.successfulSends,
    organizerId,
  });

  return sendSuccessResponse(
    res,
    200,
    "Outreach email sent successfully",
    result
  );
};

/**
 * Get outreach link tokens for a campaign
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getLinkTokens = async (req, res) => {
  const { campaignId } = req.params;
  const organizerId = req.user.userId;
  const filters = req.query;

  const linkTokens = await getOutreachLinkTokens(
    campaignId,
    organizerId,
    filters
  );

  logger.info("Outreach link tokens retrieved via controller", {
    campaignId,
    organizerId,
    totalTokens: linkTokens.length,
    filters,
  });

  return sendSuccessResponse(
    res,
    200,
    "Outreach link tokens retrieved successfully",
    linkTokens
  );
};

/**
 * Get contact analytics for outreach
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getContactAnalyticsController = async (req, res) => {
  const { contactId } = req.params;
  const organizerId = req.user.userId;

  const analytics = await getContactAnalytics(contactId, organizerId);

  logger.info("Contact analytics retrieved via controller", {
    contactId,
    organizerId,
    totalDonations: analytics.totalDonations,
  });

  return sendSuccessResponse(
    res,
    200,
    "Contact analytics retrieved successfully",
    analytics
  );
};

/**
 * Get outreach analytics for a campaign
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAnalytics = async (req, res) => {
  const { campaignId } = req.params;
  const organizerId = req.user.userId;

  const analytics = await getOutreachAnalytics(campaignId, organizerId);

  logger.info("Outreach analytics retrieved via controller", {
    campaignId,
    organizerId,
    totalLinkTokens: analytics.totalLinkTokens,
  });

  return sendSuccessResponse(
    res,
    200,
    "Outreach analytics retrieved successfully",
    analytics
  );
};

/**
 * Get organizer-level outreach analytics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getOrganizerAnalyticsController = async (req, res) => {
  const organizerId = req.user.userId;
  const filters = req.query;

  const analytics = await getOrganizerAnalytics(organizerId, filters);

  logger.info("Organizer analytics retrieved via controller", {
    organizerId,
    totalEmailsSent: analytics.emailsSent,
    totalRevenue: analytics.revenue,
  });

  return sendSuccessResponse(
    res,
    200,
    "Organizer analytics retrieved successfully",
    analytics
  );
};

/**
 * Delete an outreach link token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteLinkToken = async (req, res) => {
  const { linkTokenId } = req.params;
  const organizerId = req.user.userId;

  await deleteOutreachLinkToken(linkTokenId, organizerId);

  logger.info("Outreach link token deleted via controller", {
    linkTokenId,
    organizerId,
  });

  return sendSuccessResponse(res, 200, "Link token deleted successfully");
};
