import { Router } from "express";
import { catchAsync } from "../../../middlewares/errorHandler.js";
import {
  authenticate,
  optionalAuth,
} from "../../../middlewares/auth.middleware.js";
import {
  createDonation,
  getDonationById,
  getDonationsByCampaign,
  updateDonationStatus,
  updateReceiptSent,
  getDonationStats,
  getDonationsByUser,
  updateCampaignStatistics,
} from "./donation.controller.js";
import {
  validateCreateDonation,
  validateUpdateDonationStatus,
  validateUpdateReceiptSent,
  validateDonationId,
  validateCampaignId,
} from "./donation.validation.js";

const router = Router();

// Public routes (no authentication required)
router.get(
  "/campaign/:campaignId",
  validateCampaignId,
  catchAsync(getDonationsByCampaign)
);
router.get(
  "/campaign/:campaignId/stats",
  validateCampaignId,
  catchAsync(getDonationStats)
);
router.get("/:donationId", validateDonationId, catchAsync(getDonationById));

// Authenticated routes
router.get("/user/:userId", authenticate, catchAsync(getDonationsByUser));

// Organizer/Admin routes (require authentication)
router.post(
  "/",
  optionalAuth,
  validateCreateDonation,
  catchAsync(createDonation)
);
router.patch(
  "/:donationId/status",
  authenticate,
  validateDonationId,
  validateUpdateDonationStatus,
  catchAsync(updateDonationStatus)
);
router.patch(
  "/:donationId/receipt",
  authenticate,
  validateDonationId,
  validateUpdateReceiptSent,
  catchAsync(updateReceiptSent)
);
router.patch(
  "/campaign/:campaignId/statistics",
  authenticate,
  validateCampaignId,
  catchAsync(updateCampaignStatistics)
);

export default router;
