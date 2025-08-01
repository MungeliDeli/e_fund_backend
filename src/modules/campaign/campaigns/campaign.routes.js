/**
 * Campaign Routes
 *
 * Defines all campaign management API endpoints for the FundFlow backend.
 * Maps HTTP routes to controller actions, applies middleware for authentication
 * and authorization, and organizes endpoints for campaign CRUD operations.
 *
 * Key Features:
 * - Campaign creation, updates, and retrieval
 * - Draft saving and submission for approval
 * - Campaign listing with filters
 * - Middleware integration for authentication and authorization
 * - RESTful route organization
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { Router } from "express";
import {
  createCampaign,
  updateCampaign,
  getCampaignById,
  getCampaignsByOrganizer,
  saveCampaignDraft,
  submitCampaignForApproval,
  canEditCampaign,
  getCampaignByShareLink,
} from "./campaign.controller.js";
import {
  validateCreateCampaign,
  validateUpdateCampaign,
  validateSaveDraft,
  validateCampaignId,
} from "./campaign.validation.js";

import { logRequestCount } from "../../../middlewares/requestLogger.middleware.js";
import { catchAsync } from "../../../middlewares/errorHandler.js";
import { authenticate } from "../../../middlewares/auth.middleware.js";

const router = Router();

// Apply request logger to all campaign routes
router.use(logRequestCount);

// Public routes (no authentication required)
router.get("/share/:shareLink", catchAsync(getCampaignByShareLink));

// Protected routes (authentication required)
router.use(authenticate);
// router.use(requireOrganizationUser);

// Campaign CRUD operations
router.post("/", validateCreateCampaign, catchAsync(createCampaign));
router.get("/my-campaigns", catchAsync(getCampaignsByOrganizer));
router.get("/:campaignId", validateCampaignId, catchAsync(getCampaignById));
router.put(
  "/:campaignId",
  validateCampaignId,
  validateUpdateCampaign,
  catchAsync(updateCampaign)
);

// Draft and submission operations
router.post("/draft", validateSaveDraft, catchAsync(saveCampaignDraft));
router.put(
  "/draft/:campaignId",
  validateCampaignId,
  validateSaveDraft,
  catchAsync(saveCampaignDraft)
);
router.post(
  "/:campaignId/submit",
  validateCampaignId,
  catchAsync(submitCampaignForApproval)
);

// Utility endpoints
router.get(
  "/:campaignId/can-edit",
  validateCampaignId,
  catchAsync(canEditCampaign)
);

export default router;
