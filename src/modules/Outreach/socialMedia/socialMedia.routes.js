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
import { getStats } from "./socialMedia.controller.js";
import { validateCampaignId } from "./socialMedia.validation.js";

const router = Router();

// Authenticated-only routes (share routes removed)
router.use(authenticate);

// Keep stats endpoint for analytics pages
router.get(
  "/campaigns/:campaignId/social-stats",
  validateCampaignId,
  catchAsync(getStats)
);

export default router;
