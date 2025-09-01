/**
 * Social Media Routes
 *
 * Defines RESTful endpoints for social media sharing functionality.
 * All routes require authentication and proper validation.
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { Router } from "express";
import { catchAsync } from "../../../middlewares/errorHandler.js";
import { authenticate } from "../../../middlewares/auth.middleware.js";
import { generateLinks, getStats } from "./socialMedia.controller.js";
import {
  validateCampaignId,
  validateSocialMediaOptions,
} from "./socialMedia.validation.js";

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Social media link generation
router.post(
  "/campaigns/:campaignId/generate-links",
  validateCampaignId,
  validateSocialMediaOptions,
  catchAsync(generateLinks)
);

// Social media statistics
router.get(
  "/campaigns/:campaignId/social-stats",
  validateCampaignId,
  catchAsync(getStats)
);

export default router;
