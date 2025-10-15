/**
 * Analytics Controller
 *
 * Handles HTTP requests for campaign analytics including financial metrics,
 * donor insights, and performance statistics. Delegates business logic to
 * the Analytics Service and formats API responses.
 *
 * Key Features:
 * - Campaign analytics summary endpoint
 * - Financial metrics and progress tracking
 * - Donor insights and breakdown analysis
 * - Top donors ranking and statistics
 * - Consistent API response formatting
 * - Error handling and validation
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import analyticsService from "./analytics.service.js";
import { ResponseFactory } from "../../utils/response.utils.js";
import logger from "../../utils/logger.js";

/**
 * Analytics Controller
 * Handles HTTP requests and responses for analytics operations
 */

/**
 * Get comprehensive campaign analytics summary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCampaignAnalyticsSummary = async (req, res) => {
  const { campaignId } = req.params;

  const analyticsData = await analyticsService.getCampaignAnalyticsSummary(
    campaignId
  );

  ResponseFactory.ok(
    res,
    "Campaign analytics summary retrieved successfully",
    analyticsData
  );

  logger.api.response(
    req.method,
    req.originalUrl,
    200,
    Date.now() - req.startTime
  );
};

/**
 * Get campaign financial metrics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCampaignFinancialMetrics = async (req, res) => {
  const { campaignId } = req.params;

  const financialData = await analyticsService.getCampaignFinancialMetrics(
    campaignId
  );

  ResponseFactory.ok(
    res,
    "Campaign financial metrics retrieved successfully",
    financialData
  );

  logger.api.response(
    req.method,
    req.originalUrl,
    200,
    Date.now() - req.startTime
  );
};

/**
 * Get campaign donor insights
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCampaignDonorInsights = async (req, res) => {
  const { campaignId } = req.params;

  const donorInsights = await analyticsService.getCampaignDonorInsights(
    campaignId
  );

  ResponseFactory.ok(
    res,
    "Campaign donor insights retrieved successfully",
    donorInsights
  );

  logger.api.response(
    req.method,
    req.originalUrl,
    200,
    Date.now() - req.startTime
  );
};

/**
 * Get top donors for a campaign
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCampaignTopDonors = async (req, res) => {
  const { campaignId } = req.params;
  const { limit } = req.query;

  const topDonors = await analyticsService.getCampaignTopDonors(
    campaignId,
    limit ? parseInt(limit) : undefined
  );

  ResponseFactory.ok(res, "Campaign top donors retrieved successfully", {
    donors: topDonors,
    count: topDonors.length,
    limit: limit ? parseInt(limit) : 10,
  });

  logger.api.response(
    req.method,
    req.originalUrl,
    200,
    Date.now() - req.startTime
  );
};

/**
 * Get campaign progress percentage
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCampaignProgress = async (req, res) => {
  const { campaignId } = req.params;
  const { goalAmount } = req.query;

  if (!goalAmount) {
    return ResponseFactory.badRequest(
      res,
      "Goal amount is required as a query parameter"
    );
  }

  const progressData = await analyticsService.getCampaignProgress(
    campaignId,
    parseFloat(goalAmount)
  );

  ResponseFactory.ok(
    res,
    "Campaign progress calculated successfully",
    progressData
  );

  logger.api.response(
    req.method,
    req.originalUrl,
    200,
    Date.now() - req.startTime
  );
};

/**
 * Health check endpoint for analytics module
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const healthCheck = (req, res) => {
  ResponseFactory.ok(res, "Analytics service is healthy", {
    service: "analytics",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
};

/**
 * Get top organizers leaderboard
 */
export const getTopOrganizers = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 5, 20);
  const data = await analyticsService.getTopOrganizers(limit);
  ResponseFactory.ok(res, "Top organizers retrieved", data);
};

/**
 * Get top campaigns leaderboard
 */
export const getTopCampaigns = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 5, 20);
  const data = await analyticsService.getTopCampaigns(limit);
  ResponseFactory.ok(res, "Top campaigns retrieved", data);
};
