import { Router } from "express";
import { catchAsync } from "../../../middlewares/errorHandler.js";
import {
  authenticate,
  optionalAuth,
} from "../../../middlewares/auth.middleware.js";
import {
  getMessagesByCampaign,
  getMessageById,
  moderateMessage,
  getPendingMessagesCount,
  getFeaturedMessages,
  getMessagesByUser,
  toggleFeaturedStatus,
} from "./message.controller.js";
import {
  validateModerateMessage,
  validateMessageId,
  validateCampaignId,
} from "./message.validation.js";

const router = Router();

// Public routes (no authentication required)
router.get(
  "/campaign/:campaignId",
  validateCampaignId,
  catchAsync(getMessagesByCampaign)
);
router.get(
  "/campaign/:campaignId/featured",
  validateCampaignId,
  catchAsync(getFeaturedMessages)
);
router.get("/:messageId", validateMessageId, catchAsync(getMessageById));

// Authenticated routes
router.get("/user/:userId", authenticate, catchAsync(getMessagesByUser));
router.get(
  "/campaign/:campaignId/pending-count",
  authenticate,
  validateCampaignId,
  catchAsync(getPendingMessagesCount)
);

// Organizer/Admin routes (require authentication)
router.patch(
  "/:messageId/moderate",
  authenticate,
  validateMessageId,
  validateModerateMessage,
  catchAsync(moderateMessage)
);
router.patch(
  "/:messageId/toggle-featured",
  authenticate,
  validateMessageId,
  catchAsync(toggleFeaturedStatus)
);

export default router;
