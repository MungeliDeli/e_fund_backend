import { Router } from "express";
import { catchAsync } from "../../../middlewares/errorHandler.js";
import {
  authenticate,
  optionalAuth,
} from "../../../middlewares/auth.middleware.js";
import transactionController from "./transaction.controller.js";

const {
  createTransaction,
  getTransactionById,
  getTransactionsByCampaign,
  getTransactionsByUser,
  updateTransactionStatus,
  getTransactionStats,
  getTransactionsByType,
  getTransactionSummary,
  processPaymentSuccess,
  processPaymentFailure,
} = transactionController;
import {
  validateCreateTransaction,
  validateUpdateTransactionStatus,
  validateTransactionId,
  validateCampaignId,
  validateUserId,
} from "./transaction.validation.js";

const router = Router();

// Public routes (no authentication required)
router.get(
  "/campaign/:campaignId",
  validateCampaignId,
  catchAsync(getTransactionsByCampaign)
);
router.get(
  "/campaign/:campaignId/stats",
  validateCampaignId,
  catchAsync(getTransactionStats)
);
router.get("/type/:transactionType", catchAsync(getTransactionsByType));
router.get("/summary", catchAsync(getTransactionSummary));

// Authenticated routes
router.get(
  "/user/:userId",
  authenticate,
  validateUserId,
  catchAsync(getTransactionsByUser)
);
router.get(
  "/:transactionId",
  validateTransactionId,
  catchAsync(getTransactionById)
);

// Admin/System routes (require authentication)
router.post(
  "/",
  optionalAuth,
  validateCreateTransaction,
  catchAsync(createTransaction)
);
router.patch(
  "/:transactionId/status",
  authenticate,
  validateTransactionId,
  validateUpdateTransactionStatus,
  catchAsync(updateTransactionStatus)
);

// Payment gateway webhook routes (no authentication required for webhooks)
router.post(
  "/:gatewayTransactionId/success",
  catchAsync(processPaymentSuccess)
);
router.post(
  "/:gatewayTransactionId/failure",
  catchAsync(processPaymentFailure)
);

export default router;
