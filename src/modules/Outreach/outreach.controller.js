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
  deleteOutreachLinkToken,
} from "./outreach.service.js";
import { successResponse } from "../../utils/response.utils.js";
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

  return successResponse(
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

  return successResponse(res, 200, "Outreach email sent successfully", result);
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

  return successResponse(
    res,
    200,
    "Outreach analytics retrieved successfully",
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

  return successResponse(res, 200, "Link token deleted successfully");
};
