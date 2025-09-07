/**
 * Social Media Controller
 *
 * Handles HTTP requests for social media sharing functionality including
 * link generation and statistics retrieval.
 *
 * Key Features:
 * - Social media link generation endpoints
 * - Social media statistics endpoints
 * - Request validation and response formatting
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import {
  generateSocialMediaLinks,
  getSocialMediaStats,
} from "./socialMedia.service.js";
import { sendSuccessResponse } from "../../../utils/response.utils.js";
import logger from "../../../utils/logger.js";

/**
 * Generate social media sharing links for a campaign
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const generateLinks = async (req, res) => {
  const { campaignId } = req.params;
  const organizerId = req.user.userId;
  const options = req.body;

  const socialLinks = await generateSocialMediaLinks(
    campaignId,
    organizerId,
    options
  );

  logger.info("Social media links generated via controller", {
    campaignId,
    organizerId,
    totalLinks: Object.keys(socialLinks.socialLinks).length,
  });

  return sendSuccessResponse(
    res,
    200,
    "Social media links generated successfully",
    socialLinks
  );
};

/**
 * Get social media sharing statistics for a campaign
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getStats = async (req, res) => {
  const { campaignId } = req.params;
  const organizerId = req.user.userId;

  const stats = await getSocialMediaStats(campaignId, organizerId);

  logger.info("Social media stats retrieved via controller", {
    campaignId,
    organizerId,
    totalSocialShares: stats.totalSocialShares,
  });

  return sendSuccessResponse(
    res,
    200,
    "Social media statistics retrieved successfully",
    stats
  );
};
