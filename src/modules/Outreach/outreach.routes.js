/**
 * Outreach Routes
 *
 * Defines HTTP routes for outreach functionality including
 * link token management, email sending, and analytics.
 *
 * Key Features:
 * - Link token CRUD operations
 * - Email sending endpoints
 * - Analytics retrieval
 * - Proper middleware composition
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { Router } from "express";
import { catchAsync } from "../../middlewares/errorHandler.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  createLinkToken,
  sendEmail,
  getAnalytics,
  deleteLinkToken,
} from "./outreach.controller.js";
import {
  validateCreateLinkToken,
  validateSendEmail,
  validateCampaignId,
  validateLinkTokenId,
} from "./outreach.validation.js";

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Link token management
router.post(
  "/link-tokens",
  validateCreateLinkToken,
  catchAsync(createLinkToken)
);
router.delete(
  "/link-tokens/:linkTokenId",
  validateLinkTokenId,
  catchAsync(deleteLinkToken)
);

// Email sending
router.post("/send-email", validateSendEmail, catchAsync(sendEmail));

// Analytics
router.get(
  "/analytics/:campaignId",
  validateCampaignId,
  catchAsync(getAnalytics)
);

export default router;
