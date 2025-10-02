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
import multer from "multer";
import {
  createCampaign,
  updateCampaign,
  getCampaignById,
  getCampaignsByOrganizer,
  getAllCampaigns,
  canEditCampaign,
  getCampaignByShareLink,
  processPendingStartCampaigns,
  publishPendingStartCampaign,
} from "./campaign.controller.js";
import {
  validateCreateCampaign,
  validateUpdateCampaign,
  validateCampaignId,
} from "./campaign.validation.js";

import { logRequestCount } from "../../../middlewares/requestLogger.middleware.js";
import { catchAsync } from "../../../middlewares/errorHandler.js";
import { authenticate } from "../../../middlewares/auth.middleware.js";
import processUploadsMiddleware from "../../../middlewares/processUploads.middleware.js";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Maximum 5 files (1 main + 3 secondary + 1 extra)
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only image and video files are allowed"), false);
    }
  },
}).fields([
  { name: "mainMedia", maxCount: 1 },
  { name: "secondaryImage0", maxCount: 1 },
  { name: "secondaryImage1", maxCount: 1 },
  { name: "secondaryImage2", maxCount: 1 },
]);

const router = Router();

// Public routes (no authentication required)
router.get("/share/:shareLink", catchAsync(getCampaignByShareLink));

  
router.use(authenticate);
// router.use(requireOrganizationUser);

// Campaign CRUD operations
router.post(
  "/",
  upload,
  processUploadsMiddleware(),
  validateCreateCampaign, 
  catchAsync(createCampaign)
);
router.get("/my-campaigns", catchAsync(getCampaignsByOrganizer));
router.get("/all", catchAsync(getAllCampaigns)); // Admin endpoint
router.get("/:campaignId", validateCampaignId, catchAsync(getCampaignById));
router.put(
  "/:campaignId",
  validateCampaignId,
  validateUpdateCampaign,
  catchAsync(updateCampaign)
);

// Draft operations removed during demolition

// Utility endpoints
router.get(
  "/:campaignId/can-edit",
  validateCampaignId,
  catchAsync(canEditCampaign)
);

// Admin endpoints
router.post("/process-pending-start", catchAsync(processPendingStartCampaigns));

// Organizer endpoints
router.post(
  "/:campaignId/activate",
  validateCampaignId,
  catchAsync(publishPendingStartCampaign)
);

export default router;
