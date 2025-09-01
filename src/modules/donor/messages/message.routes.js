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
  // New organizer methods
  getMessagesByCampaignForOrganizer,
  getPendingMessagesCountForOrganizer,
  moderateMessageForOrganizer,
  bulkApproveAllMessages,
  bulkRejectAllMessages,
  toggleFeaturedStatusForOrganizer,
  getCampaignMessageStats,
} from "./message.controller.js";
import {
  validateModerateMessage,
  validateMessageId,
  validateCampaignId,
  validateBulkOperation,
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

// New organizer-specific routes (with permission checks)
router.get(
  "/organizer/campaign/:campaignId",
  authenticate,
  validateCampaignId,
  catchAsync(getMessagesByCampaignForOrganizer)
);
router.get(
  "/organizer/campaign/:campaignId/pending-count",
  authenticate,
  validateCampaignId,
  catchAsync(getPendingMessagesCountForOrganizer)
);
router.patch(
  "/organizer/:messageId/moderate",
  authenticate,
  validateMessageId,
  validateModerateMessage,
  catchAsync(moderateMessageForOrganizer)
);
router.patch(
  "/organizer/campaign/:campaignId/bulk-approve",
  authenticate,
  validateCampaignId,
  validateBulkOperation,
  catchAsync(bulkApproveAllMessages)
);
router.patch(
  "/organizer/campaign/:campaignId/bulk-reject",
  authenticate,
  validateCampaignId,
  validateBulkOperation,
  catchAsync(bulkRejectAllMessages)
);
router.patch(
  "/organizer/:messageId/toggle-featured",
  authenticate,
  validateMessageId,
  catchAsync(toggleFeaturedStatusForOrganizer)
);
router.get(
  "/organizer/campaign/:campaignId/stats",
  authenticate,
  validateCampaignId,
  catchAsync(getCampaignMessageStats)
);

export default router;
