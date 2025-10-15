import { Router } from "express";
import { catchAsync } from "../../../middlewares/errorHandler.js";
import {
  authenticate,
  requireAdmin,
} from "../../../middlewares/auth.middleware.js";
import {
  validateCreateWithdrawal,
  validateListWithdrawals,
  validateAdminListWithdrawals,
  validateWithdrawalId,
} from "./withdrawal.validation.js";
import {
  requestWithdrawal,
  listMyWithdrawals,
  adminListWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  initiatePayoutManual,
  markPaid,
  markFailed,
} from "./withdrawal.controller.js";

const router = Router();

// Organizer endpoints
router.post(
  "/",
  authenticate,
  validateCreateWithdrawal,
  catchAsync(requestWithdrawal)
);

router.get(
  "/",
  authenticate,
  validateListWithdrawals,
  catchAsync(listMyWithdrawals)
);

// Admin endpoints
router.get(
  "/admin",
  authenticate,
  requireAdmin,
  validateAdminListWithdrawals,
  catchAsync(adminListWithdrawals)
);

router.post(
  "/admin/:withdrawalRequestId/approve",
  authenticate,
  requireAdmin,
  validateWithdrawalId,
  catchAsync(approveWithdrawal)
);

router.post(
  "/admin/:withdrawalRequestId/reject",
  authenticate,
  requireAdmin,
  validateWithdrawalId,
  catchAsync(rejectWithdrawal)
);

router.post(
  "/admin/:withdrawalRequestId/initiate-payout",
  authenticate,
  requireAdmin,
  validateWithdrawalId,
  catchAsync(initiatePayoutManual)
);

router.post(
  "/admin/:withdrawalRequestId/mark-paid",
  authenticate,
  requireAdmin,
  validateWithdrawalId,
  catchAsync(markPaid)
);

router.post(
  "/admin/:withdrawalRequestId/mark-failed",
  authenticate,
  requireAdmin,
  validateWithdrawalId,
  catchAsync(markFailed)
);

export default router;
