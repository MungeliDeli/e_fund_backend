/**
 * Tracking Routes
 *
 * Defines tracking endpoints for email opens and link clicks.
 * Maps HTTP routes to controller actions with proper middleware.
 *
 * Key Features:
 * - Pixel tracking endpoint for email opens
 * - Click tracking endpoint with redirects
 * - Rate limiting for abuse prevention
 * - Public access (no authentication required)
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { Router } from "express";
import {
  generateTrackingPixel,
  handleClickTracking,
} from "./tracking.controller.js";
import { catchAsync } from "../../../middlewares/errorHandler.js";
import { trackingLimiter } from "../../../middlewares/rateLimiters.js";

const router = Router();

// Apply rate limiting to all tracking routes
router.use(trackingLimiter);

// Pixel tracking endpoint for email opens
router.get("/pixel/:linkTokenId.png", catchAsync(generateTrackingPixel));

// Click tracking endpoint with redirect
router.get("/click/:linkTokenId", catchAsync(handleClickTracking));

export default router;
