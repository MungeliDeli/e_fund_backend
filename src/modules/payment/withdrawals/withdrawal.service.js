import * as withdrawalRepo from "./withdrawal.repository.js";
import * as transactionService from "../transactions/transaction.service.js";
import * as campaignRepo from "../../campaign/campaigns/campaign.repository.js";
import { initiatePayout } from "../providers/zynlepay.provider.js";
import { AppError } from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";
import { logServiceEvent } from "../../audit/audit.utils.js";
import notificationService from "../../notifications/notification.service.js";
import {
  ENTITY_TYPES,
  WITHDRAWAL_ACTIONS,
} from "../../audit/audit.constants.js";

const RESERVED_STATUSES = ["pending", "approved", "processing", "paid"];

export const computeAvailableBalance = async (campaignId) => {
  const completed = await withdrawalRepo.sumCompletedDonationsByCampaign(
    campaignId
  );
  const reserved = await withdrawalRepo.sumReservedWithdrawalsByCampaign(
    campaignId
  );
  return { completed, reserved, available: Math.max(0, completed - reserved) };
};

export const requestWithdrawal = async (organizerId, payload) => {
  const { campaignId, amount } = payload;

  const campaign = await campaignRepo.findCampaignById(campaignId);
  if (!campaign || campaign.organizerId !== organizerId) {
    throw new AppError("Campaign not found or not owned by organizer", 404);
  }

  // Require at least one completed donation
  const { completed, available } = await computeAvailableBalance(campaignId);
  if (completed <= 0) {
    throw new AppError(
      "Withdrawals allowed only after first completed donation",
      409
    );
  }

  // Min = 10% of goal
  const minAmount = Number(campaign.goalAmount) * 0.1;
  if (amount < minAmount) {
    throw new AppError("Amount below minimum withdrawal (10% of goal)", 422);
  }

  // Max = available balance
  if (amount > available) {
    throw new AppError("Amount exceeds available balance", 422);
  }

  // Frequency: 2 per week
  const weeklyCount = await withdrawalRepo.countWithdrawalsThisWeek(campaignId);
  if (weeklyCount >= 2) {
    throw new AppError("Weekly withdrawal limit reached (2 per week)", 429);
  }

  const created = await withdrawalRepo.createWithdrawalRequest({
    ...payload,
    organizerId,
    currency: payload.currency || "ZMW",
  });

  try {
    await logServiceEvent(
      organizerId,
      WITHDRAWAL_ACTIONS.WITHDRAWAL_REQUESTED,
      ENTITY_TYPES.WITHDRAWAL_REQUEST,
      created.withdrawalRequestId,
      {
        campaignId,
        amount: created.amount,
        currency: created.currency,
      }
    );
    await notificationService.createAndDispatch({
      userId: organizerId,
      type: "inApp",
      category: "withdrawals",
      priority: "medium",
      title: "Withdrawal request received",
      message: `Your withdrawal request of ${created.amount} ${created.currency} has been received and is pending review`,
      relatedEntityType: "WithdrawalRequest",
      relatedEntityId: created.withdrawalRequestId,
    });
    // Notify admins in-app (financial and super/support)
    try {
      const admins = await campaignRepo.findUsersByRoles([
        "financialAdmin",
        "superAdmin",
        "supportAdmin",
      ]);
      for (const admin of admins) {
        await notificationService.createAndDispatch({
          userId: admin.userId,
          type: "inApp",
          category: "withdrawals",
          priority: "high",
          title: "New withdrawal request",
          message: `Campaign ${campaignId} has a new withdrawal request of ${created.amount} ${created.currency}`,
          relatedEntityType: "WithdrawalRequest",
          relatedEntityId: created.withdrawalRequestId,
          data: {
            campaignId,
            organizerId,
            withdrawalRequestId: created.withdrawalRequestId,
          },
        });
      }
    } catch (nErr) {
      logger.warn("Failed to notify admins for withdrawal request", {
        error: nErr.message,
      });
    }
  } catch (e) {
    logger.warn("Audit log failed for withdrawal request create", {
      error: e.message,
    });
  }

  const balances = await computeAvailableBalance(campaignId);
  return { created, balances };
};

export const approveWithdrawal = async (
  adminUserId,
  withdrawalRequestId,
  notes
) => {
  // Get withdrawal details first
  const withdrawal = await withdrawalRepo.getWithdrawalById(
    withdrawalRequestId
  );
  if (!withdrawal) {
    throw new AppError("Withdrawal request not found", 404);
  }

  if (withdrawal.status !== "pending") {
    throw new AppError("Withdrawal request is not in pending status", 409);
  }

  // Update status to approved first
  const updated = await withdrawalRepo.updateWithdrawalRequest(
    withdrawalRequestId,
    {
      status: "approved",
      approvedByUserId: adminUserId,
      approvedAt: new Date(),
      notes: notes || null,
    }
  );

  try {
    await logServiceEvent(
      adminUserId,
      WITHDRAWAL_ACTIONS.WITHDRAWAL_APPROVED,
      ENTITY_TYPES.WITHDRAWAL_REQUEST,
      withdrawalRequestId,
      {
        approvedByUserId: adminUserId,
      }
    );

    // Extract phone number from destination
    const destination =
      typeof withdrawal.destination === "string"
        ? JSON.parse(withdrawal.destination)
        : withdrawal.destination;

    const phoneNumber = destination?.phoneNumber;
    if (!phoneNumber) {
      throw new AppError(
        "Phone number not found in withdrawal destination",
        400
      );
    }

    // Generate reference number
    const referenceNo = `WD-${withdrawalRequestId}-${Date.now()}`;

    // Initiate payment with ZynlePay
    logger.info("Initiating ZynlePay payout", {
      withdrawalRequestId,
      phoneNumber,
      amount: withdrawal.amount,
      referenceNo,
    });

    const paymentResult = await initiatePayout({
      phoneNumber,
      amount: withdrawal.amount,
      referenceNo,
    });

    logger.info("ZynlePay payout initiated", {
      withdrawalRequestId,
      paymentResult,
    });

    // Create transaction record
    const transaction = await transactionService.createTransaction({
      userId: withdrawal.organizerId,
      campaignId: withdrawal.campaignId,
      amount: withdrawal.amount,
      currency: withdrawal.currency,
      gatewayTransactionId: referenceNo,
      gatewayUsed: "zynlepay",
      transactionType: "withdrawal_out",
      phoneNumber,
      gatewayRequestId: paymentResult.gatewayRequestId,
    });

    // Update withdrawal with transaction ID and processing status
    const finalUpdated = await withdrawalRepo.updateWithdrawalRequest(
      withdrawalRequestId,
      {
        status: "processing",
        transactionId: transaction.transactionId,
      }
    );

    // Send notifications
    await notificationService.createAndDispatch({
      userId: withdrawal.organizerId,
      type: "inApp",
      category: "withdrawals",
      priority: "high",
      title: "Withdrawal payment initiated",
      message: `Your withdrawal of ${withdrawal.amount} ${withdrawal.currency} has been approved and payment is being processed to ${phoneNumber}`,
      relatedEntityType: "WithdrawalRequest",
      relatedEntityId: withdrawalRequestId,
    });

    // Send email notification
    try {
      const { createWithdrawalInitiatedTemplate } = await import(
        "../../../utils/emailTemplates.js"
      );
      const html = createWithdrawalInitiatedTemplate({
        organizerName: "", // Will be filled by notification service
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        phoneNumber,
        withdrawalRequestId,
      });

      await notificationService.createAndDispatch({
        userId: withdrawal.organizerId,
        type: "email",
        category: "withdrawals",
        priority: "high",
        title: "Withdrawal payment initiated",
        message: html,
        relatedEntityType: "WithdrawalRequest",
        relatedEntityId: withdrawalRequestId,
      });
    } catch (emailErr) {
      logger.warn("Failed to send withdrawal initiated email", {
        error: emailErr.message,
        withdrawalRequestId,
      });
    }

    return {
      ...finalUpdated,
      paymentInitiated: true,
      transactionId: transaction.transactionId,
      gatewayRequestId: paymentResult.gatewayRequestId,
      referenceNo,
    };
  } catch (error) {
    logger.error("Failed to initiate payment for approved withdrawal", {
      withdrawalRequestId,
      error: error.message,
    });

    // Mark withdrawal as failed if payment initiation fails
    await withdrawalRepo.updateWithdrawalRequest(withdrawalRequestId, {
      status: "failed",
      notes: `Payment initiation failed: ${error.message}`,
    });

    // Send failure notification
    await notificationService.createAndDispatch({
      userId: withdrawal.organizerId,
      type: "inApp",
      category: "withdrawals",
      priority: "high",
      title: "Withdrawal payment failed",
      message: `Your withdrawal of ${withdrawal.amount} ${withdrawal.currency} failed to initiate. Please contact support.`,
      relatedEntityType: "WithdrawalRequest",
      relatedEntityId: withdrawalRequestId,
    });

    // Preserve provider's status code and message for clear user feedback
    const statusCode = error?.statusCode || 502;
    const message =
      error?.message || "Withdrawal approved but payout initiation failed";
    throw new AppError(message, statusCode);
  }
};

export const rejectWithdrawal = async (
  adminUserId,
  withdrawalRequestId,
  reason
) => {
  const updated = await withdrawalRepo.updateWithdrawalRequest(
    withdrawalRequestId,
    {
      status: "rejected",
      approvedByUserId: adminUserId,
      approvedAt: new Date(),
      notes: reason || null,
    }
  );
  try {
    await logServiceEvent(
      adminUserId,
      WITHDRAWAL_ACTIONS.WITHDRAWAL_REJECTED,
      ENTITY_TYPES.WITHDRAWAL_REQUEST,
      withdrawalRequestId,
      {
        approvedByUserId: adminUserId,
        reason,
      }
    );
    const wr = await withdrawalRepo.getWithdrawalById(withdrawalRequestId);
    await notificationService.createAndDispatch({
      userId: wr.organizerId,
      type: "inApp",
      category: "withdrawals",
      priority: "medium",
      title: "Withdrawal request rejected",
      message: `Your withdrawal request of ${wr.amount} ${
        wr.currency
      } was rejected${reason ? `: ${reason}` : ""}`,
      relatedEntityType: "WithdrawalRequest",
      relatedEntityId: withdrawalRequestId,
    });

    // Send email notification
    try {
      const { createWithdrawalRejectedTemplate } = await import(
        "../../../utils/emailTemplates.js"
      );
      const html = createWithdrawalRejectedTemplate({
        organizerName: "", // Will be filled by notification service
        amount: wr.amount,
        currency: wr.currency,
        withdrawalRequestId,
        reason: reason || "No reason provided",
      });

      await notificationService.createAndDispatch({
        userId: wr.organizerId,
        type: "email",
        category: "withdrawals",
        priority: "medium",
        title: "Withdrawal request rejected",
        message: html,
        relatedEntityType: "WithdrawalRequest",
        relatedEntityId: withdrawalRequestId,
      });
    } catch (emailErr) {
      logger.warn("Failed to send withdrawal rejected email", {
        error: emailErr.message,
        withdrawalRequestId,
      });
    }
  } catch {}
  return updated;
};

export const initiatePayoutManual = async (withdrawalRequestId) => {
  const wr = await withdrawalRepo.getWithdrawalById(withdrawalRequestId);
  if (!RESERVED_STATUSES.includes(wr.status)) {
    throw new AppError("Withdrawal not in a payable state", 409);
  }
  // Create a transaction record in processing state (gatewayUsed='manual')
  const referenceNo = `WD-${wr.withdrawalRequestId}`;
  const txn = await transactionService.createTransaction({
    userId: wr.organizerId,
    campaignId: wr.campaignId,
    amount: wr.amount,
    currency: wr.currency,
    gatewayTransactionId: referenceNo,
    gatewayUsed: "manual",
    transactionType: "withdrawal_out",
  });

  const updated = await withdrawalRepo.updateWithdrawalRequest(
    withdrawalRequestId,
    {
      status: "processing",
      transactionId: txn.transactionId,
    }
  );

  try {
    await logServiceEvent(
      wr.organizerId,
      WITHDRAWAL_ACTIONS.WITHDRAWAL_PROCESSING,
      ENTITY_TYPES.WITHDRAWAL_REQUEST,
      withdrawalRequestId,
      {
        transactionId: txn.transactionId,
      }
    );
    await notificationService.createAndDispatch({
      userId: wr.organizerId,
      type: "inApp",
      category: "withdrawals",
      priority: "medium",
      title: "Withdrawal payout initiated",
      message: `Your withdrawal of ${wr.amount} ${wr.currency} is being processed`,
      relatedEntityType: "WithdrawalRequest",
      relatedEntityId: withdrawalRequestId,
    });
  } catch {}
  return { updated, transaction: txn };
};

export const markPaid = async (withdrawalRequestId) => {
  const wr = await withdrawalRepo.getWithdrawalById(withdrawalRequestId);
  if (!wr.transactionId) throw new AppError("No transaction linked", 409);
  await transactionService.updateTransactionStatus(
    wr.transactionId,
    "succeeded"
  );
  const updated = await withdrawalRepo.updateWithdrawalRequest(
    withdrawalRequestId,
    {
      status: "paid",
    }
  );
  try {
    await logServiceEvent(
      wr.organizerId,
      WITHDRAWAL_ACTIONS.WITHDRAWAL_COMPLETED,
      ENTITY_TYPES.WITHDRAWAL_REQUEST,
      withdrawalRequestId,
      {
        transactionId: wr.transactionId,
      }
    );
    await notificationService.createAndDispatch({
      userId: wr.organizerId,
      type: "inApp",
      category: "withdrawals",
      priority: "high",
      title: "Withdrawal paid",
      message: `Your withdrawal of ${wr.amount} ${wr.currency} has been paid`,
      relatedEntityType: "WithdrawalRequest",
      relatedEntityId: withdrawalRequestId,
    });
  } catch {}
  return updated;
};

export const markFailed = async (withdrawalRequestId, reason) => {
  const wr = await withdrawalRepo.getWithdrawalById(withdrawalRequestId);
  if (wr.transactionId) {
    await transactionService.updateTransactionStatus(
      wr.transactionId,
      "failed"
    );
  }
  const updated = await withdrawalRepo.updateWithdrawalRequest(
    withdrawalRequestId,
    {
      status: "failed",
      notes: reason || wr.notes,
    }
  );
  try {
    await logServiceEvent(
      wr.organizerId,
      WITHDRAWAL_ACTIONS.WITHDRAWAL_FAILED,
      ENTITY_TYPES.WITHDRAWAL_REQUEST,
      withdrawalRequestId,
      {
        transactionId: wr.transactionId,
        reason,
      }
    );
    await notificationService.createAndDispatch({
      userId: wr.organizerId,
      type: "inApp",
      category: "withdrawals",
      priority: "high",
      title: "Withdrawal failed",
      message: `Your withdrawal of ${wr.amount} ${wr.currency} failed${
        reason ? `: ${reason}` : ""
      }`,
      relatedEntityType: "WithdrawalRequest",
      relatedEntityId: withdrawalRequestId,
    });
  } catch {}
  return updated;
};

export default {
  computeAvailableBalance,
  requestWithdrawal,
  approveWithdrawal,
  rejectWithdrawal,
  initiatePayoutManual,
  markPaid,
  markFailed,
};
