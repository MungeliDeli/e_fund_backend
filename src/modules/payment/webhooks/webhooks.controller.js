import config from "../../../config/index.js";
import logger from "../../../utils/logger.js";
import * as transactionRepository from "../transactions/transaction.repository.js";
import * as transactionService from "../transactions/transaction.service.js";
import * as donationRepository from "../../donor/donation/donation.repository.js";
import * as withdrawalRepository from "../withdrawals/withdrawal.repository.js";
import notificationService from "../../notifications/notification.service.js";
import { logServiceEvent } from "../../audit/audit.utils.js";
import {
  DONATION_ACTIONS,
  ENTITY_TYPES,
  WITHDRAWAL_ACTIONS,
} from "../../audit/audit.constants.js";

const isTerminal = (status) =>
  ["succeeded", "failed", "timeout", "cancelled"].includes(status);

function mapProviderStatus(responseCode) {
  // Map provider response codes to internal transaction status
  switch (String(responseCode)) {
    case "100":
      return "succeeded";
    case "120":
    case "990":
      return "processing";
    case "995":
      return "failed";
    default:
      return "failed";
  }
}

function verifySharedSecret(req) {
  const secret = config?.payments?.webhooks?.secret;
  if (!secret) return true; // If no secret configured, allow (dev)
  const provided = req.headers["x-webhook-signature"] || req.query.signature;
  return provided && provided === secret;
}

async function processWebhookBody(req, res) {
  // Log all incoming webhook requests for debugging
  logger.info("Webhook received", {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    query: req.query,
  });

  if (!verifySharedSecret(req)) {
    logger.warn("Webhook signature verification failed", {
      headers: req.headers,
      query: req.query,
    });
    return res
      .status(401)
      .json({ success: false, message: "Invalid webhook signature" });
  }

  const payload = req.body || {};
  const responseCode = payload.response_code || payload.responseCode;
  const gatewayRequestId = payload.transaction_id || payload.gatewayRequestId;
  const referenceNo = payload.reference_no || payload.referenceNo; // our gatewayTransactionId

  logger.info("Webhook payload parsed", {
    responseCode,
    gatewayRequestId,
    referenceNo,
    fullPayload: payload,
  });

  if (!responseCode || (!gatewayRequestId && !referenceNo)) {
    logger.warn("Webhook missing required fields", {
      responseCode,
      gatewayRequestId,
      referenceNo,
      payload,
    });
    return res
      .status(400)
      .json({ success: false, message: "Missing required webhook fields" });
  }

  const status = mapProviderStatus(responseCode);

  // Prefer gatewayRequestId; fallback to referenceNo
  let txn = null;
  if (gatewayRequestId) {
    txn = await transactionRepository.getTransactionByGatewayRequestId(
      gatewayRequestId
    );
  }
  if (!txn && referenceNo) {
    txn = await transactionRepository.getTransactionByGatewayId(referenceNo);
  }

  if (!txn) {
    logger.warn("Webhook transaction not found", {
      gatewayRequestId,
      referenceNo,
    });
    return res
      .status(404)
      .json({ success: false, message: "Transaction not found" });
  }

  // Update transaction using repository helper
  await transactionRepository.setTransactionWebhookByGatewayRequestId(
    gatewayRequestId || txn.gatewayTransactionId,
    { status, gatewayResponse: payload, webhookReceived: true }
  );

  if (status === "succeeded") {
    // Mark transaction succeeded via service to keep logs consistent as well
    await transactionService.processPaymentSuccess(
      txn.gatewayTransactionId,
      payload
    );

    // Handle withdrawal transactions
    if (txn.transactionType === "withdrawal_out") {
      try {
        const withdrawal =
          await withdrawalRepository.getWithdrawalByTransactionId(
            txn.transactionId
          );
        if (withdrawal) {
          // Update withdrawal status to paid
          await withdrawalRepository.updateWithdrawalRequest(
            withdrawal.withdrawalRequestId,
            { status: "paid" }
          );

          // Log audit event
          await logServiceEvent(
            withdrawal.organizerId,
            WITHDRAWAL_ACTIONS.WITHDRAWAL_COMPLETED,
            ENTITY_TYPES.WITHDRAWAL_REQUEST,
            withdrawal.withdrawalRequestId,
            {
              transactionId: txn.transactionId,
              gatewayRequestId: txn.gatewayRequestId,
            }
          );

          // Send success notification to organizer
          await notificationService.createAndDispatch({
            userId: withdrawal.organizerId,
            type: "inApp",
            category: "withdrawals",
            priority: "high",
            title: "Withdrawal completed",
            message: `Your withdrawal of ${withdrawal.amount} ${withdrawal.currency} has been successfully processed`,
            relatedEntityType: "WithdrawalRequest",
            relatedEntityId: withdrawal.withdrawalRequestId,
          });

          // Send email notification
          try {
            const { createWithdrawalCompletedTemplate } = await import(
              "../../../utils/emailTemplates.js"
            );
            const destination =
              typeof withdrawal.destination === "string"
                ? JSON.parse(withdrawal.destination)
                : withdrawal.destination;

            const html = createWithdrawalCompletedTemplate({
              organizerName: "", // Will be filled by notification service
              amount: withdrawal.amount,
              currency: withdrawal.currency,
              phoneNumber: destination?.phoneNumber,
              withdrawalRequestId: withdrawal.withdrawalRequestId,
            });

            await notificationService.createAndDispatch({
              userId: withdrawal.organizerId,
              type: "email",
              category: "withdrawals",
              priority: "high",
              title: "Withdrawal completed successfully",
              message: html,
              relatedEntityType: "WithdrawalRequest",
              relatedEntityId: withdrawal.withdrawalRequestId,
            });
          } catch (emailErr) {
            logger.warn("Failed to send withdrawal completed email", {
              error: emailErr.message,
              withdrawalRequestId: withdrawal.withdrawalRequestId,
            });
          }
        }
      } catch (withdrawalErr) {
        logger.warn("Failed to process withdrawal success webhook", {
          error: withdrawalErr.message,
          transactionId: txn.transactionId,
        });
      }
    }

    // Update donation status to completed and recalc campaign stats
    try {
      const donation =
        await donationRepository.getDonationByPaymentTransactionId(
          txn.transactionId
        );
      if (donation) {
        await donationRepository.updateDonationStatus(
          donation.donationId,
          "completed"
        );
        // Capture stats before/after for milestone detection
        const beforeStats = await donationRepository.getDonationStats(
          donation.campaignId
        );
        const afterStats =
          await donationRepository.recalculateCampaignStatistics(
            donation.campaignId
          );

        // Organizer in-app per donation
        try {
          await notificationService.createAndDispatch({
            userId: donation.organizerId || null,
            type: "inApp",
            category: "donation",
            priority: "medium",
            title: `New donation received`,
            message: `Your campaign received a donation of ${donation.amount} ${
              txn.currency || "ZMW"
            }.`,
            data: {
              campaignId: donation.campaignId,
              donationId: donation.donationId,
              amount: donation.amount,
              currency: txn.currency || "ZMW",
            },
            relatedEntityType: "donation",
            relatedEntityId: donation.donationId,
            templateId: "donation.received.v2",
          });
        } catch (inAppErr) {
          logger.warn("Failed to send organizer in-app donation notification", {
            error: inAppErr?.message,
          });
        }

        // Audit log - successful donation
        try {
          await logServiceEvent(
            donation.donorUserId || null,
            DONATION_ACTIONS.DONATION_MADE,
            ENTITY_TYPES.DONATION,
            donation.donationId,
            {
              campaignId: donation.campaignId,
              amount: donation.amount,
              currency: txn.currency || "ZMW",
              status: "successful",
              isAnonymous: donation.isAnonymous,
              paymentMethod: txn.gatewayUsed,
              phoneNumber: txn.phoneNumber,
              transactionId: txn.transactionId,
              gatewayTransactionId: txn.gatewayTransactionId,
              gatewayUsed: txn.gatewayUsed,
              completedAt: new Date().toISOString(),
            }
          );
        } catch (auditErr) {
          logger.warn("Failed to log successful donation audit (webhook)", {
            error: auditErr?.message,
          });
        }

        // Donor receipt email (if userId present and not anonymous)
        try {
          if (donation.donorUserId && !donation.isAnonymous) {
            const { createDonationReceiptTemplate } = await import(
              "../../../utils/emailTemplates.js"
            );
            const campaignUrl = `${
              process.env.FRONTEND_URL || "http://localhost:5173"
            }/campaigns/${donation.campaignId}`;
            const html = createDonationReceiptTemplate({
              organizerName: "Campaign Organizer",
              campaignTitle: "",
              donorName: "",
              donationAmount: donation.amount,
              currency: txn.currency || "ZMW",
              donationId: donation.donationId,
              campaignUrl,
              thankYouMessage: null,
            });
            await notificationService.createAndDispatch({
              userId: donation.donorUserId,
              type: "email",
              category: "donation",
              priority: "medium",
              title: `Thank you for your donation`,
              message: html,
              data: {
                campaignId: donation.campaignId,
                donationId: donation.donationId,
              },
              relatedEntityType: "donation",
              relatedEntityId: donation.donationId,
              templateId: "donation.receipt.email.v1",
            });
          }
        } catch (donorEmailErr) {
          logger.warn("Failed to send donor receipt email", {
            error: donorEmailErr?.message,
            donationId: donation.donationId,
          });
        }

        // Milestones for organizer: 25%, 50%, 70%, 100%
        try {
          const milestones = [25, 50, 70, 100];
          const getPct = (stats) => {
            const goal = Number(stats?.goalAmount) || 0;
            if (!goal) return 0;
            const raised = Number(
              stats?.totalAmount || stats?.currentRaisedAmount || 0
            );
            return Math.floor(Math.min(100, (raised / goal) * 100));
          };
          const beforePct = getPct(beforeStats);
          const afterPct = getPct(afterStats);
          const reached = milestones.find(
            (m) => beforePct < m && afterPct >= m
          );
          if (reached && donation.organizerId) {
            // In-app
            await notificationService.createAndDispatch({
              userId: donation.organizerId,
              type: "inApp",
              category: "milestone",
              priority: "high",
              title: `Milestone reached: ${reached}%`,
              message: `Your campaign crossed ${reached}% of its goal.`,
              data: {
                campaignId: donation.campaignId,
                milestone: reached,
                currentAmount:
                  afterStats?.totalAmount || afterStats?.currentRaisedAmount,
                goalAmount: afterStats?.goalAmount,
              },
              relatedEntityType: "campaign",
              relatedEntityId: donation.campaignId,
              templateId: "campaign.milestone.v1",
            });
            // Email
            const { createMilestoneTemplate } = await import(
              "../../../utils/emailTemplates.js"
            );
            const campaignUrl = `${
              process.env.FRONTEND_URL || "http://localhost:5173"
            }/campaigns/${donation.campaignId}`;
            const html = createMilestoneTemplate({
              organizerName: "",
              campaignTitle: "",
              percentageReached: reached,
              currentAmount:
                afterStats?.totalAmount || afterStats?.currentRaisedAmount,
              goalAmount: afterStats?.goalAmount,
              campaignUrl,
            });
            await notificationService.createAndDispatch({
              userId: donation.organizerId,
              type: "email",
              category: "milestone",
              priority: "high",
              title: `Milestone reached: ${reached}%`,
              message: html,
              data: {
                campaignId: donation.campaignId,
                milestone: reached,
              },
              relatedEntityType: "campaign",
              relatedEntityId: donation.campaignId,
              templateId: "campaign.milestone.email.v1",
            });
          }
        } catch (milestoneErr) {
          logger.warn("Milestone notifications failed", {
            error: milestoneErr?.message,
            campaignId: donation.campaignId,
          });
        }
      }
    } catch (e) {
      logger.warn("Failed to update donation on success webhook", {
        error: e?.message,
        transactionId: txn.transactionId,
      });
    }
  } else if (status === "failed") {
    await transactionService.processPaymentFailure(
      txn.gatewayTransactionId,
      payload
    );

    // Handle withdrawal transaction failures
    if (txn.transactionType === "withdrawal_out") {
      try {
        const withdrawal =
          await withdrawalRepository.getWithdrawalByTransactionId(
            txn.transactionId
          );
        if (withdrawal) {
          // Update withdrawal status to failed
          await withdrawalRepository.updateWithdrawalRequest(
            withdrawal.withdrawalRequestId,
            {
              status: "failed",
              notes: `Payment failed: ${
                payload?.response_description ||
                payload?.message ||
                "Unknown error"
              }`,
            }
          );

          // Log audit event
          await logServiceEvent(
            withdrawal.organizerId,
            WITHDRAWAL_ACTIONS.WITHDRAWAL_FAILED,
            ENTITY_TYPES.WITHDRAWAL_REQUEST,
            withdrawal.withdrawalRequestId,
            {
              transactionId: txn.transactionId,
              gatewayRequestId: txn.gatewayRequestId,
              error: payload?.response_description || payload?.message,
            }
          );

          // Send failure notification to organizer
          await notificationService.createAndDispatch({
            userId: withdrawal.organizerId,
            type: "inApp",
            category: "withdrawals",
            priority: "high",
            title: "Withdrawal failed",
            message: `Your withdrawal of ${withdrawal.amount} ${withdrawal.currency} failed to process. Please contact support.`,
            relatedEntityType: "WithdrawalRequest",
            relatedEntityId: withdrawal.withdrawalRequestId,
          });

          // Send email notification
          try {
            const { createWithdrawalFailedTemplate } = await import(
              "../../../utils/emailTemplates.js"
            );
            const destination =
              typeof withdrawal.destination === "string"
                ? JSON.parse(withdrawal.destination)
                : withdrawal.destination;

            const html = createWithdrawalFailedTemplate({
              organizerName: "", // Will be filled by notification service
              amount: withdrawal.amount,
              currency: withdrawal.currency,
              phoneNumber: destination?.phoneNumber,
              withdrawalRequestId: withdrawal.withdrawalRequestId,
              errorMessage:
                payload?.response_description ||
                payload?.message ||
                "Unknown error",
            });

            await notificationService.createAndDispatch({
              userId: withdrawal.organizerId,
              type: "email",
              category: "withdrawals",
              priority: "high",
              title: "Withdrawal failed",
              message: html,
              relatedEntityType: "WithdrawalRequest",
              relatedEntityId: withdrawal.withdrawalRequestId,
            });
          } catch (emailErr) {
            logger.warn("Failed to send withdrawal failed email", {
              error: emailErr.message,
              withdrawalRequestId: withdrawal.withdrawalRequestId,
            });
          }
        }
      } catch (withdrawalErr) {
        logger.warn("Failed to process withdrawal failure webhook", {
          error: withdrawalErr.message,
          transactionId: txn.transactionId,
        });
      }
    }

    try {
      const donation =
        await donationRepository.getDonationByPaymentTransactionId(
          txn.transactionId
        );
      if (donation) {
        await donationRepository.updateDonationStatus(
          donation.donationId,
          "failed"
        );
        // Audit log - failed donation
        try {
          await logServiceEvent(
            donation.donorUserId || null,
            DONATION_ACTIONS.DONATION_MADE,
            ENTITY_TYPES.DONATION,
            donation.donationId,
            {
              campaignId: donation.campaignId,
              amount: donation.amount,
              currency: txn.currency || "ZMW",
              status: "failed",
              isAnonymous: donation.isAnonymous,
              paymentMethod: txn.gatewayUsed,
              phoneNumber: txn.phoneNumber,
              transactionId: txn.transactionId,
              gatewayTransactionId: txn.gatewayTransactionId,
              gatewayUsed: txn.gatewayUsed,
              failedAt: new Date().toISOString(),
              error:
                payload?.response_description ||
                payload?.message ||
                "gateway failure",
            }
          );
        } catch (auditErr) {
          logger.warn("Failed to log failed donation audit (webhook)", {
            error: auditErr?.message,
          });
        }
        // If the donation had a message, delete it to avoid showing on organizer side
        try {
          if (donation.messageId) {
            const { deleteMessage } = await import(
              "../../donor/messages/message.service.js"
            );
            await deleteMessage(donation.messageId);
            await donationRepository.updateDonationMessageId(
              donation.donationId,
              null
            );
          }
        } catch (msgErr) {
          logger.warn("Failed to delete message on failed webhook", {
            error: msgErr?.message,
            donationId: donation.donationId,
            messageId: donation.messageId,
          });
        }
      }
    } catch (e) {
      logger.warn("Failed to update donation on failure webhook", {
        error: e?.message,
        transactionId: txn.transactionId,
      });
    }
  }

  return res.status(200).json({ success: true });
}

export const handleAirtelWebhook = async (req, res) => {
  return processWebhookBody(req, res);
};

export const handleMtnWebhook = async (req, res) => {
  return processWebhookBody(req, res);
};

// Test endpoint to verify webhook is accessible
export const testWebhook = async (req, res) => {
  logger.info("Webhook test endpoint hit", {
    method: req.method,
    headers: req.headers,
    body: req.body,
    query: req.query,
  });

  return res.status(200).json({
    success: true,
    message: "Webhook endpoint is accessible",
    timestamp: new Date().toISOString(),
    received: {
      method: req.method,
      headers: Object.keys(req.headers),
      bodyKeys: Object.keys(req.body || {}),
      queryKeys: Object.keys(req.query || {}),
    },
  });
};
