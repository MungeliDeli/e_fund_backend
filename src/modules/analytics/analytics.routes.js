/**
 * Analytics Routes
 *
 * Defines all campaign analytics API endpoints for the FundFlow backend.
 * Maps HTTP routes to controller actions, applies middleware for validation and authentication,
 * and organizes endpoints for campaign analytics, financial metrics, and donor insights.
 *
 * Key Features:
 * - Campaign analytics summary routes
 * - Financial metrics and progress tracking routes
 * - Donor insights and breakdown analysis routes
 * - Top donors ranking and statistics routes
 * - Middleware integration for validation and authentication
 * - RESTful route organization
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { Router } from "express";
import { logRequestCount } from "../../middlewares/requestLogger.middleware.js";
import { catchAsync } from "../../middlewares/errorHandler.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  getCampaignAnalyticsSummary,
  getCampaignFinancialMetrics,
  getCampaignDonorInsights,
  getCampaignTopDonors,
  getCampaignProgress,
  healthCheck,
  getTopOrganizers,
  getTopCampaigns,
} from "./analytics.controller.js";

const router = Router();

// Apply request logger to all analytics routes
router.use(logRequestCount);

/**
 * @route   GET /api/v1/campaigns/:campaignId/analytics/summary
 * @desc    Get comprehensive campaign analytics summary
 * @access  Private (requires authentication)
 */
router.get(
  "/campaigns/:campaignId/analytics/summary",
  authenticate,
  catchAsync(getCampaignAnalyticsSummary)
);

/**
 * @route   GET /api/v1/campaigns/:campaignId/analytics/financial
 * @desc    Get campaign financial metrics
 * @access  Private (requires authentication)
 */
router.get(
  "/campaigns/:campaignId/analytics/financial",
  authenticate,
  catchAsync(getCampaignFinancialMetrics)
);

/**
 * @route   GET /api/v1/campaigns/:campaignId/analytics/donors
 * @desc    Get campaign donor insights and breakdown
 * @access  Private (requires authentication)
 */
router.get(
  "/campaigns/:campaignId/analytics/donors",
  authenticate,
  catchAsync(getCampaignDonorInsights)
);

/**
 * @route   GET /api/v1/campaigns/:campaignId/analytics/top-donors
 * @desc    Get top donors for a campaign
 * @access  Private (requires authentication)
 */
router.get(
  "/campaigns/:campaignId/analytics/top-donors",
  authenticate,
  catchAsync(getCampaignTopDonors)
);

/**
 * @route   GET /api/v1/campaigns/:campaignId/analytics/progress
 * @desc    Get campaign progress percentage
 * @access  Private (requires authentication)
 */
router.get(
  "/campaigns/:campaignId/analytics/progress",
  authenticate,
  catchAsync(getCampaignProgress)
);

/**
 * @route   GET /api/v1/analytics/health
 * @desc    Health check endpoint for analytics module
 * @access  Public
 */
router.get("/health", healthCheck);

// Leaderboards (public)
router.get("/leaderboard/top-organizers", catchAsync(getTopOrganizers));
router.get("/leaderboard/top-campaigns", catchAsync(getTopCampaigns));

export default router;
