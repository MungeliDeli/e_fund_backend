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
  getLinkTokens,
  getContactAnalyticsController,
  getAnalytics,
  getOrganizerAnalyticsController,
  deleteLinkToken,
} from "./outreach.controller.js";
import {
  validateCreateLinkToken,
  validateSendEmail,
  validateCampaignId,
  validateLinkTokenId,
  validateContactId,
  validateLinkTokenFilters,
} from "./outreach.validation.js";
import { socialMediaRoutes } from "./socialMedia/index.js";
import outreachCampaignRoutes from "./outreachCampaign/outreachCampaign.routes.js";

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Link token management
router.post(
  "/link-tokens",
  validateCreateLinkToken,
  catchAsync(createLinkToken)
);
router.get(
  "/campaigns/:campaignId/link-tokens",
  validateCampaignId,
  validateLinkTokenFilters,
  catchAsync(getLinkTokens)
);
router.delete(
  "/link-tokens/:linkTokenId",
  validateLinkTokenId,
  catchAsync(deleteLinkToken)
);

// Email sending
router.post("/send-email", validateSendEmail, catchAsync(sendEmail));
router.get("/analytics/organizer", catchAsync(getOrganizerAnalyticsController));

// Analytics
router.get(
  "/analytics/:campaignId",
  validateCampaignId,
  catchAsync(getAnalytics)
);
router.get(
  "/contacts/:contactId/analytics",
  validateContactId,
  catchAsync(getContactAnalyticsController)
);

// Mount social media routes
router.use("/social-media", socialMediaRoutes);

// Mount outreach campaign routes
router.use("/", outreachCampaignRoutes);

export default router;
