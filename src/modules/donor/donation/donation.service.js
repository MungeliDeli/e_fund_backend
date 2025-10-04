import * as donationRepository from "./donation.repository.js";
import * as transactionService from "../../payment/transactions/transaction.service.js";
import * as messageService from "../messages/message.service.js";
import zynlepayProvider from "../../payment/providers/zynlepay.provider.js";
import { logServiceEvent } from "../../audit/audit.utils.js";
import { DONATION_ACTIONS, ENTITY_TYPES } from "../../audit/audit.constants.js";
import { getCampaignById } from "../../campaign/campaigns/campaign.service.js";
import { getUserById } from "../../users/individualUser/user.service.js";
import notificationService from "../../notifications/notification.service.js";
import { AppError } from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";
import { transaction } from "../../../db/index.js";
import { getLinkTokenById } from "../../Outreach/linkTokens/linkToken.repository.js";
import { recordEmailEvent } from "../../Outreach/emailEvents/emailEvent.repository.js";
import { markRecipientClickedByLinkToken } from "../../Outreach/outreachCampaign/outreachCampaignRecipients.repository.js";
import { query } from "../../../db/index.js";

export const createDonation = async (donationData, userId = null) => {
  try {
    // Use database transaction to ensure data consistency
    const result = await transaction(async (client) => {
      // 0. Outreach attribution: resolve contactId from linkTokenId if provided
      let resolvedLinkTokenId = donationData.linkTokenId || null;
      let resolvedContactId = donationData.contactId || null;
      if (resolvedLinkTokenId && !resolvedContactId) {
        try {
          const token = await getLinkTokenById(resolvedLinkTokenId, null);
          resolvedContactId = token?.contactId || null;
        } catch (e) {
          logger.warn(
            "Provided linkTokenId not found; proceeding without contactId",
            {
              linkTokenId: resolvedLinkTokenId,
              error: e.message,
            }
          );
        }
      }
      // 1. Create transaction record FIRST
      const generateReference = () =>
        `FR_${donationData.campaignId}_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

      const transactionPayload = {
        userId: userId,
        campaignId: donationData.campaignId,
        amount: donationData.amount,
        currency: donationData.currency || "USD",
        gatewayUsed: donationData.paymentMethod,
        status: "pending",
        transactionType: "donation_in",
        gatewayTransactionId:
          donationData.gatewayTransactionId || generateReference(),
        phoneNumber: donationData.phoneNumber,
      };

      const transaction = await transactionService.createTransaction(
        transactionPayload
      );

      logger.info("Transaction record created", {
        transactionId: transaction.transactionId,
        gatewayTransactionId: transaction.gatewayTransactionId,
      });

      // 2. Create donation record WITH transaction ID
      // Force anonymous if no authenticated user
      const isAnonymousEffective = userId ? !!donationData.isAnonymous : true;
      const donationPayload = {
        campaignId: donationData.campaignId,
        donorUserId: userId, // Can be null for anonymous donations
        amount: donationData.amount,
        isAnonymous: isAnonymousEffective,
        status: "pending",
        paymentTransactionId: transaction.transactionId, // ✅ Now we have the transaction ID
        linkTokenId: resolvedLinkTokenId,
        contactId: resolvedContactId,
      };

      // Fetch campaign to set organizerId on donation for faster organizer queries
      try {
        const campaign = await getCampaignById(donationData.campaignId);
        if (campaign && campaign.organizerId) {
          donationPayload.organizerId = campaign.organizerId;
        }
      } catch (e) {
        logger.warn("Failed to resolve organizerId for donation payload", {
          campaignId: donationData.campaignId,
          error: e.message,
        });
      }

      const donation = await donationRepository.createDonation(
        donationPayload,
        client
      );

      logger.info("Donation record created", {
        donationId: donation.donationId,
        campaignId: donationData.campaignId,
        amount: donationData.amount,
        isAnonymous: donationData.isAnonymous,
      });

      // 4. Create donation message if provided
      let messageId = null;
      if (donationData.messageText && donationData.messageText.trim()) {
        const messagePayload = {
          campaignId: donationData.campaignId,
          donorUserId: userId, // Can be null for anonymous donations
          messageText: donationData.messageText.trim(),
          status: "pendingModeration", // Will be moderated later
          isAnonymous: isAnonymousEffective,
        };

        try {
          const message = await messageService.createMessage(
            messagePayload,
            client
          );
          messageId = message.messageId;

          logger.info("Donation message created successfully", {
            messageId: message.messageId,
            donationId: donation.donationId,
            campaignId: donationData.campaignId,
            isAnonymous: donationData.isAnonymous,
          });

          // Link message to donation record
          await donationRepository.updateDonationMessageId(
            donation.donationId,
            message.messageId,
            client
          );

          logger.info("Donation linked to message", {
            donationId: donation.donationId,
            messageId: message.messageId,
          });
        } catch (messageError) {
          logger.error("Failed to create donation message", {
            error: messageError.message,
            donationId: donation.donationId,
            campaignId: donationData.campaignId,
          });
          // Don't fail the entire donation if message creation fails
          // Just log the error and continue
        }
      }

      // 5. Defer campaign statistics updates and notifications until payment success

      return {
        donation,
        transaction,
        messageId,
        success: true,
      };
    });

    logger.info("Donation creation completed successfully", {
      donationId: result.donation.donationId,
      transactionId: result.transaction.transactionId,
      campaignId: donationData.campaignId,
      amount: donationData.amount,
    });

    // Real payment initiation (post-commit): fire-and-monitor
    (async () => {
      try {
        console.log("=== PAYMENT INITIATION START ===");
        const referenceNo = result.transaction.gatewayTransactionId;
        console.log("Reference No:", referenceNo);
        console.log("Original Phone Number:", donationData.phoneNumber);

        // Strip +260 prefix from phone number for ZynlePay
        const cleanPhoneNumber =
          donationData.phoneNumber?.replace(/^\+260/, "") ||
          donationData.phoneNumber;
        console.log("Cleaned Phone Number:", cleanPhoneNumber);
        console.log("Amount:", donationData.amount);
        console.log("Payment Method:", donationData.paymentMethod);

        const providerRes = await zynlepayProvider.initiateDeposit({
          phoneNumber: cleanPhoneNumber,
          amount: donationData.amount,
          referenceNo,
        });

        console.log("=== PROVIDER RESPONSE ===");
        console.log("Provider Response:", JSON.stringify(providerRes, null, 2));

        const responseCode = providerRes.responseCode;
        console.log("Response Code:", responseCode);

        if (responseCode === "100") {
          console.log("=== IMMEDIATE SUCCESS PATH ===");
          // Immediate success (rare) → mark txn succeeded and donation completed
          await transactionService.processPaymentSuccess(
            referenceNo,
            providerRes.raw
          );
          await donationRepository.updateDonationStatus(
            result.donation.donationId,
            "completed"
          );
          // Update campaign stats and send notifications only now
          await donationRepository.recalculateCampaignStatistics(
            result.donation.campaignId
          );
          try {
            await sendCampaignOrganizerNotifications(
              result.donation.campaignId,
              result.donation.donationId,
              donationData.amount,
              donationData.currency || "USD",
              donationData.messageText,
              isAnonymousEffective,
              donationData.phoneNumber
            );
            if (userId && !isAnonymousEffective) {
              await sendDonorNotifications(
                userId,
                result.donation.donationId,
                result.donation.campaignId,
                donationData.amount,
                donationData.currency || "USD",
                donationData.messageText
              );
            } else if (isAnonymousEffective) {
              await sendAnonymousDonorReceipt(
                result.donation.donationId,
                result.donation.campaignId,
                donationData.amount,
                donationData.currency || "USD",
                donationData.messageText
              );
            }
          } catch (notifyErr) {
            logger.warn("Post-success notifications failed", {
              error: notifyErr.message,
              donationId: result.donation.donationId,
            });
          }
          logger.info("Payment completed immediately by provider", {
            donationId: result.donation.donationId,
            transactionId: result.transaction.transactionId,
          });
        } else if (responseCode === "120" || responseCode === "990") {
          console.log("=== PROCESSING PATH ===");
          // Initiated / pending → mark processing with gateway request id & payload
          await transactionService.markProcessingWithGatewayData(
            result.transaction.transactionId,
            {
              gatewayRequestId: providerRes.gatewayRequestId,
              gatewayResponse: providerRes.raw,
              status: "processing",
            }
          );
          logger.info("Payment initiated; awaiting webhook/status", {
            donationId: result.donation.donationId,
            transactionId: result.transaction.transactionId,
            gatewayRequestId: providerRes.gatewayRequestId,
          });
        } else {
          console.log("=== FAILURE PATH ===");
          console.log("Response Code:", responseCode);
          console.log("Provider Message:", providerRes.message);
          // Treat other codes as failure (including 2000 - no active simulator)
          await transactionService.processPaymentFailure(referenceNo, {
            code: responseCode,
            message: providerRes.message,
          });
          await donationRepository.updateDonationStatus(
            result.donation.donationId,
            "failed"
          );
          // If a message was created for this donation, delete it
          try {
            if (result.messageId) {
              await messageService.deleteMessage(result.messageId);
              await donationRepository.updateDonationMessageId(
                result.donation.donationId,
                null
              );
            }
          } catch (msgDeleteErr) {
            logger.warn(
              "Failed to delete donation message after payment failure",
              {
                error: msgDeleteErr?.message,
                donationId: result.donation.donationId,
                messageId: result.messageId,
              }
            );
          }
          logger.warn("Payment initiation failed", {
            donationId: result.donation.donationId,
            transactionId: result.transaction.transactionId,
            responseCode,
            message: providerRes.message,
          });
        }
      } catch (error) {
        console.log("=== PROVIDER CALL ERROR ===");
        console.log("Error:", error.message);
        console.log("Error Stack:", error.stack);
        console.log("Error Details:", JSON.stringify(error, null, 2));
        // Provider call itself failed → mark failed and log
        try {
          await transactionService.processPaymentFailure(
            result.transaction.gatewayTransactionId,
            { error: error.message }
          );
          await donationRepository.updateDonationStatus(
            result.donation.donationId,
            "failed"
          );
          // If a message was created for this donation, delete it
          try {
            if (result.messageId) {
              await messageService.deleteMessage(result.messageId);
              await donationRepository.updateDonationMessageId(
                result.donation.donationId,
                null
              );
            }
          } catch (msgDeleteErr) {
            logger.warn(
              "Failed to delete donation message after provider error",
              {
                error: msgDeleteErr?.message,
                donationId: result.donation.donationId,
                messageId: result.messageId,
              }
            );
          }
        } catch (inner) {
          logger.error(
            "Failed to mark payment as failed after provider error",
            {
              error: inner.message,
            }
          );
        }

        logger.error("Provider initiation error", {
          error: error.message,
          donationId: result.donation.donationId,
          transactionId: result.transaction.transactionId,
        });
      }
    })();

    return result;
  } catch (error) {
    logger.error("Error creating donation:", error);

    // Provide specific error messages based on error type
    if (error.code === "23505") {
      // Unique constraint violation
      throw new AppError("Donation with this information already exists", 409);
    } else if (error.code === "23503") {
      // Foreign key constraint violation
      throw new AppError("Invalid campaign or user reference", 400);
    } else if (error instanceof AppError) {
      throw error;
    } else {
      throw new AppError("Failed to create donation", 500);
    }
  }
};

export const simulatePaymentProcessing = async (donation, txn) => {
  try {
    // Artificial delay to mimic gateway processing time
    const processingDelayMs = 1500;
    await new Promise((resolve) => setTimeout(resolve, processingDelayMs));

    const mockGatewayResponse = {
      provider: txn.gatewayUsed || "MockGateway",
      gatewayTransactionId: txn.gatewayTransactionId,
      status: "succeeded",
      processedAt: new Date().toISOString(),
      meta: { simulation: true },
    };

    // 1) Mark transaction as succeeded
    await transactionService.processPaymentSuccess(
      txn.gatewayTransactionId,
      mockGatewayResponse
    );

    // 2) Mark donation as completed
    await donationRepository.updateDonationStatus(
      donation.donationId,
      "completed"
    );

    // 2b) Outreach: mark donation in recipients and record donation emailEvent
    try {
      if (donation.linkTokenId) {
        // Record emailEvent of type 'donation'
        await recordEmailEvent({
          linkTokenId: donation.linkTokenId,
          contactId: donation.contactId || null,
          type: "donation",
          userAgent: null,
          ipAddress: null,
        });
        // Update recipients aggregate fields
        const sql = `
          UPDATE "outreachCampaignRecipients" r
          SET "donated" = TRUE,
              "donatedAmount" = COALESCE(r."donatedAmount", 0) + $3,
              "updatedAt" = NOW()
          FROM "linkTokens" lt
          WHERE lt."linkTokenId" = $1
            AND r."contactId" = COALESCE($2, r."contactId")
            AND r."outreachCampaignId" = lt."outreachCampaignId";
        `;
        await query(sql, [
          donation.linkTokenId,
          donation.contactId || null,
          donation.amount,
        ]);
      }
    } catch (e) {
      logger.warn("Failed to update outreach donation attribution", {
        error: e.message,
        linkTokenId: donation.linkTokenId,
        contactId: donation.contactId,
      });
    }

    // Log successful donation in audit logs
    try {
      await logServiceEvent(
        donation.donorUserId || null,
        DONATION_ACTIONS.DONATION_MADE,
        ENTITY_TYPES.DONATION,
        donation.donationId,
        {
          campaignId: donation.campaignId,
          amount: donation.amount,
          currency: donation.currency || "USD",
          status: "successful",
          isAnonymous: donation.isAnonymous,
          paymentMethod: txn.gatewayUsed,
          phoneNumber: txn.phoneNumber,
          transactionId: txn.transactionId,
          gatewayTransactionId: txn.gatewayTransactionId,
          gatewayUsed: txn.gatewayUsed,
          simulation: true,
          completedAt: new Date().toISOString(),
        }
      );
    } catch (auditError) {
      logger.warn("Failed to log successful donation audit", {
        error: auditError.message,
      });
    }

    // 3) Recalculate campaign statistics based on completed donations to be concurrency-safe
    const stats = await donationRepository.recalculateCampaignStatistics(
      donation.campaignId
    );

    // Optional progress percentage calculation (derived, not persisted)
    if (stats && stats.goalAmount && Number(stats.goalAmount) > 0) {
      const progress =
        (Number(stats.currentRaisedAmount) / Number(stats.goalAmount)) * 100;
      logger.info("Campaign progress recalculated", {
        campaignId: donation.campaignId,
        currentRaisedAmount: stats.currentRaisedAmount,
        goalAmount: stats.goalAmount,
        donationCount: stats.completedCount,
        progressPercentage: Math.min(
          100,
          Math.max(0, Number(progress.toFixed(2)))
        ),
      });
    }

    logger.info("Mock payment simulation completed successfully", {
      donationId: donation.donationId,
      transactionId: txn.transactionId,
      gatewayTransactionId: txn.gatewayTransactionId,
    });
  } catch (error) {
    // Mark donation as failed if payment processing fails
    try {
      await donationRepository.updateDonationStatus(
        donation.donationId,
        "failed"
      );
    } catch (updateError) {
      logger.error("Failed to update donation status to failed", {
        donationId: donation.donationId,
        error: updateError.message,
      });
    }

    // Log failed donation in audit logs
    try {
      await logServiceEvent(
        donation.donorUserId || null,
        DONATION_ACTIONS.DONATION_MADE,
        ENTITY_TYPES.DONATION,
        donation.donationId,
        {
          campaignId: donation.campaignId,
          amount: donation.amount,
          currency: donation.currency || "USD",
          status: "failed",
          isAnonymous: donation.isAnonymous,
          paymentMethod: txn.gatewayUsed,
          phoneNumber: txn.phoneNumber,
          transactionId: txn.transactionId,
          gatewayTransactionId: txn.gatewayTransactionId,
          gatewayUsed: txn.gatewayUsed,
          simulation: true,
          error: error.message,
          failedAt: new Date().toISOString(),
        }
      );
    } catch (auditError) {
      logger.warn("Failed to log failed donation audit", {
        error: auditError.message,
      });
    }

    logger.error("Mock payment simulation failed", {
      donationId: donation.donationId,
      transactionId: txn.transactionId,
      gatewayTransactionId: txn.gatewayTransactionId,
      error: error.message,
    });

    // Re-throw the error so the calling function can handle it
    throw error;
  }
};

export const getDonationById = async (donationId) => {
  const donation = await donationRepository.getDonationById(donationId);

  if (!donation) {
    throw new AppError("Donation not found", 404);
  }

  return donation;
};

export const getDonationsByCampaign = async (
  campaignId,
  limit = 50,
  offset = 0
) => {
  const donations = await donationRepository.getDonationsByCampaign(
    campaignId,
    limit,
    offset
  );

  // Process donations to include donor details for non-anonymous donations
  const processedDonations = donations.map((donation) => {
    const processedDonation = { ...donation };

    // Only include donor details if the donation is not anonymous
    if (!donation.isAnonymous && donation.donorUserId) {
      processedDonation.donorDetails = null;

      if (donation.userType === "individualUser") {
        // For individual users, include firstName and lastName
        if (donation.firstName && donation.lastName) {
          processedDonation.donorDetails = {
            donorId: donation.donorUserId,
            donorType: "individual",
            displayName: `${donation.firstName} ${donation.lastName}`,
            firstName: donation.firstName,
            lastName: donation.lastName,
          };
        }
      } else if (donation.userType === "organizationUser") {
        // For organization users, include organizationShortName
        if (donation.organizationShortName) {
          processedDonation.donorDetails = {
            donorId: donation.donorUserId,
            donorType: "organization",
            displayName: donation.organizationShortName,
            organizationShortName: donation.organizationShortName,
          };
        }
      }
    }

    // Remove the raw profile fields from the response
    delete processedDonation.userType;
    delete processedDonation.firstName;
    delete processedDonation.lastName;
    delete processedDonation.organizationShortName;

    return processedDonation;
  });

  return processedDonations;
};

export const updateDonationStatus = async (donationId, status, userId) => {
  // Validate status transition
  const validTransitions = {
    pending: ["completed", "failed"],
    completed: ["refunded"],
    failed: [],
    refunded: [],
  };

  const currentDonation = await donationRepository.getDonationById(donationId);
  if (!currentDonation) {
    throw new AppError("Donation not found", 404);
  }

  const allowedStatuses = validTransitions[currentDonation.status] || [];
  if (!allowedStatuses.includes(status)) {
    throw new AppError(
      `Invalid status transition from ${currentDonation.status} to ${status}`,
      400
    );
  }

  const updatedDonation = await donationRepository.updateDonationStatus(
    donationId,
    status
  );

  logger.info(`Donation status updated`, {
    donationId,
    oldStatus: currentDonation.status,
    newStatus: status,
    updatedBy: userId,
  });

  return updatedDonation;
};

export const updateReceiptSent = async (donationId, receiptSent, userId) => {
  const donation = await donationRepository.getDonationById(donationId);
  if (!donation) {
    throw new AppError("Donation not found", 404);
  }

  const updatedDonation = await donationRepository.updateReceiptSent(
    donationId,
    receiptSent
  );

  logger.info(`Donation receipt status updated`, {
    donationId,
    receiptSent,
    updatedBy: userId,
  });

  return updatedDonation;
};

export const getDonationStats = async (campaignId) => {
  const stats = await donationRepository.getDonationStats(campaignId);

  return {
    totalDonations: parseInt(stats.totalDonations) || 0,
    completedDonations: parseInt(stats.completedDonations) || 0,
    totalAmount: parseFloat(stats.totalAmount) || 0.0,
    anonymousDonations: parseInt(stats.anonymousDonations) || 0,
  };
};

export const getDonationsByUser = async (userId, limit = 50, offset = 0) => {
  const donations = await donationRepository.getDonationsByUser(
    userId,
    limit,
    offset
  );

  // Process donations to include donor details for non-anonymous donations
  const processedDonations = donations.map((donation) => {
    const processedDonation = { ...donation };

    // Only include donor details if the donation is not anonymous
    if (!donation.isAnonymous && donation.donorUserId) {
      processedDonation.donorDetails = null;

      if (donation.userType === "individualUser") {
        // For individual users, include firstName and lastName
        if (donation.firstName && donation.lastName) {
          processedDonation.donorDetails = {
            donorId: donation.donorUserId,
            donorType: "individual",
            displayName: `${donation.firstName} ${donation.lastName}`,
            firstName: donation.firstName,
            lastName: donation.lastName,
          };
        }
      } else if (donation.userType === "organizationUser") {
        // For organization users, include organizationShortName
        if (donation.organizationShortName) {
          processedDonation.donorDetails = {
            donorId: donation.donorUserId,
            donorType: "organization",
            displayName: donation.organizationShortName,
            organizationShortName: donation.organizationShortName,
          };
        }
      }
    }

    // Remove the raw profile fields from the response
    delete processedDonation.userType;
    delete processedDonation.firstName;
    delete processedDonation.lastName;
    delete processedDonation.organizationShortName;

    return processedDonation;
  });

  return processedDonations;
};

export const getDonationsByOrganizer = async (
  organizerId,
  limit = 50,
  offset = 0
) => {
  const donations = await donationRepository.getDonationsByOrganizer(
    organizerId,
    limit,
    offset
  );

  // Process donations to include donor details for non-anonymous donations
  const processedDonations = donations.map((donation) => {
    const processedDonation = { ...donation };

    // Only include donor details if the donation is not anonymous
    if (!donation.isAnonymous && donation.donorUserId) {
      processedDonation.donorDetails = null;

      if (donation.userType === "individualUser") {
        // For individual users, include firstName and lastName
        if (donation.firstName && donation.lastName) {
          processedDonation.donorDetails = {
            donorId: donation.donorUserId,
            donorType: "individual",
            displayName: `${donation.firstName} ${donation.lastName}`,
            firstName: donation.firstName,
            lastName: donation.lastName,
          };
        }
      } else if (donation.userType === "organizationUser") {
        // For organization users, include organizationShortName
        if (donation.organizationShortName) {
          processedDonation.donorDetails = {
            donorId: donation.donorUserId,
            donorType: "organization",
            displayName: donation.organizationShortName,
            organizationShortName: donation.organizationShortName,
          };
        }
      }
    }

    // Remove the raw profile fields from the response
    delete processedDonation.userType;
    delete processedDonation.firstName;
    delete processedDonation.lastName;
    delete processedDonation.organizationShortName;

    return processedDonation;
  });

  return processedDonations;
};

export const getAllDonations = async (limit = 50, offset = 0) => {
  const donations = await donationRepository.getAllDonations(limit, offset);

  // Process donations to include donor details for non-anonymous donations
  const processedDonations = donations.map((donation) => {
    const processedDonation = { ...donation };

    // Only include donor details if the donation is not anonymous
    if (!donation.isAnonymous && donation.donorUserId) {
      processedDonation.donorDetails = null;

      if (donation.userType === "individualUser") {
        // For individual users, include firstName and lastName
        if (donation.firstName && donation.lastName) {
          processedDonation.donorDetails = {
            donorId: donation.donorUserId,
            donorType: "individual",
            displayName: `${donation.firstName} ${donation.lastName}`,
            firstName: donation.firstName,
            lastName: donation.lastName,
          };
        }
      } else if (donation.userType === "organizationUser") {
        // For organization users, include organizationShortName
        if (donation.organizationShortName) {
          processedDonation.donorDetails = {
            donorId: donation.donorUserId,
            donorType: "organization",
            displayName: donation.organizationShortName,
            organizationShortName: donation.organizationShortName,
          };
        }
      }
    }

    // Remove the raw profile fields from the response
    delete processedDonation.userType;
    delete processedDonation.firstName;
    delete processedDonation.lastName;
    delete processedDonation.organizationShortName;

    return processedDonation;
  });

  return processedDonations;
};

export const updateCampaignStatistics = async (campaignId, amount) => {
  try {
    const updatedStats = await donationRepository.updateCampaignStatistics(
      campaignId,
      amount
    );

    logger.info(`Campaign statistics updated`, {
      campaignId,
      amount,
      newTotal: updatedStats.currentRaisedAmount,
    });

    return updatedStats;
  } catch (error) {
    logger.error("Error updating campaign statistics:", error);
    throw new AppError("Failed to update campaign statistics", 500);
  }
};

export const sendCampaignOrganizerNotifications = async (
  campaignId,
  donationId,
  amount,
  currency,
  messageText,
  isAnonymous,
  phoneNumber
) => {
  try {
    const campaign = await getCampaignById(campaignId);
    if (!campaign || !campaign.organizerId) {
      logger.warn("Campaign or organizer not found for notification", {
        campaignId,
      });
      return;
    }

    const organizerId = campaign.organizerId;

    // Validate organizerId is a valid UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!organizerId || !uuidRegex.test(organizerId)) {
      logger.warn("Invalid organizerId for notification", {
        campaignId,
        organizerId,
        organizerIdType: typeof organizerId,
      });
      return;
    }

    const campaignName = campaign.name;
    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);

    // Prepare notification data
    const notificationData = {
      campaignId,
      donationId,
      amount: formattedAmount,
      currency: currency || "USD",
      campaignName,
      isAnonymous,
      hasMessage: !!messageText,
      messagePreview: messageText
        ? messageText.substring(0, 100) +
          (messageText.length > 100 ? "..." : "")
        : null,
      phoneNumber: isAnonymous ? null : phoneNumber,
    };

    // Send in-app notification only
    try {
      const notificationResult = await notificationService.createAndDispatch({
        userId: organizerId,
        type: "inApp",
        category: "donation",
        priority: "medium",
        title: `New donation received for ${campaignName}`,
        message: `${formattedAmount} donation received${
          messageText ? " with a message" : ""
        }`,
        data: notificationData,
        relatedEntityType: "donation",
        relatedEntityId: donationId,
        templateId: "donation.received.v1",
      });

      if (notificationResult.deliveryStatus === "delivered") {
        logger.info("In-app notification sent to campaign organizer", {
          campaignId,
          organizerId,
          donationId,
          notificationId: notificationResult.notificationId,
        });
      } else {
        logger.warn("In-app notification created but delivery failed", {
          campaignId,
          organizerId,
          donationId,
          notificationId: notificationResult.notificationId,
          deliveryStatus: notificationResult.deliveryStatus,
          error: notificationResult.error,
        });
      }
    } catch (inAppError) {
      console.error("inAppError", inAppError);
    }
  } catch (error) {
    logger.error("Failed to send campaign organizer notifications", {
      error: error.message,
      campaignId,
      donationId,
    });
  }
};

export const sendDonorNotifications = async (
  userId,
  donationId,
  campaignId,
  amount,
  currency,
  messageText
) => {
  try {
    const user = await getUserById(userId);
    if (!user) {
      logger.warn("User not found for donor notification", { userId });
      return;
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      logger.warn("Campaign not found for donor notification", {
        campaignId,
      });
      return;
    }

    const campaignName = campaign.name;
    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);

    // Prepare notification data
    const notificationData = {
      campaignId,
      donationId,
      amount: formattedAmount,
      currency: currency || "USD",
      campaignName,
      hasMessage: !!messageText,
      messagePreview: messageText
        ? messageText.substring(0, 100) +
          (messageText.length > 100 ? "..." : "")
        : null,
    };

    // Send in-app notification
    try {
      await notificationService.createAndDispatch({
        userId: userId,
        type: "inApp",
        category: "donation",
        priority: "medium",
        title: `Your donation for ${campaignName} has been received!`,
        message: `${formattedAmount} donation received${
          messageText ? " with a message" : ""
        }`,
        data: notificationData,
        relatedEntityType: "donation",
        relatedEntityId: donationId,
        templateId: "donation.received.v1",
      });

      logger.info("In-app notification sent to donor", {
        userId,
        donationId,
        campaignId,
      });
    } catch (inAppError) {
      logger.warn("Failed to send in-app notification to donor", {
        error: inAppError.message,
        userId,
        donationId,
        campaignId,
      });
    }

    // Send email notification
    try {
      const emailTitle = `Your donation for ${campaignName} has been received!`;
      const emailMessage = `
        <h2>Your Donation Received!</h2>
        <p>Your donation for campaign <strong>${campaignName}</strong> has been received.</p>
        <p><strong>Amount:</strong> ${formattedAmount}</p>
        <p><strong>Donation ID:</strong> ${donationId}</p>
        ${
          messageText ? `<p><strong>Message:</strong> "${messageText}"</p>` : ""
        }
        <p>Thank you for your support!</p>
      `;

      await notificationService.createAndDispatch({
        userId: userId,
        type: "email",
        category: "donation",
        priority: "medium",
        title: emailTitle,
        message: emailMessage,
        data: notificationData,
        relatedEntityType: "donation",
        relatedEntityId: donationId,
        templateId: "donation.received.email.v1",
      });

      logger.info("Email notification sent to donor", {
        userId,
        donationId,
        campaignId,
      });
    } catch (emailError) {
      logger.warn("Failed to send email notification to donor", {
        error: emailError.message,
        userId,
        donationId,
        campaignId,
      });
    }
  } catch (error) {
    logger.error("Failed to send donor notifications", {
      error: error.message,
      userId,
      donationId,
      campaignId,
    });
  }
};

export const sendAnonymousDonorReceipt = async (
  donationId,
  campaignId,
  amount,
  currency,
  messageText
) => {
  try {
    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      logger.warn("Campaign not found for anonymous donor receipt", {
        campaignId,
      });
      return;
    }

    const campaignName = campaign.name;
    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);

    const notificationData = {
      campaignId,
      donationId,
      amount: formattedAmount,
      currency: currency || "USD",
      campaignName,
      hasMessage: !!messageText,
      messagePreview: messageText
        ? messageText.substring(0, 100) +
          (messageText.length > 100 ? "..." : "")
        : null,
    };

    // Send in-app notification
    try {
      await notificationService.createAndDispatch({
        userId: null, // Anonymous user
        type: "inApp",
        category: "donation",
        priority: "medium",
        title: `Your anonymous donation for ${campaignName} has been received!`,
        message: `${formattedAmount} anonymous donation received${
          messageText ? " with a message" : ""
        }`,
        data: notificationData,
        relatedEntityType: "donation",
        relatedEntityId: donationId,
        templateId: "donation.received.v1",
      });

      logger.info("In-app anonymous donor receipt sent", {
        donationId,
        campaignId,
      });
    } catch (inAppError) {
      logger.warn("Failed to send in-app anonymous donor receipt", {
        error: inAppError.message,
        donationId,
        campaignId,
      });
    }

    // Send email notification
    try {
      const emailTitle = `Your anonymous donation for ${campaignName} has been received!`;
      const emailMessage = `
        <h2>Your Anonymous Donation Received!</h2>
        <p>Your anonymous donation for campaign <strong>${campaignName}</strong> has been received.</p>
        <p><strong>Amount:</strong> ${formattedAmount}</p>
        <p><strong>Donation ID:</strong> ${donationId}</p>
        ${
          messageText ? `<p><strong>Message:</strong> "${messageText}"</p>` : ""
        }
        <p>Thank you for your support!</p>
      `;

      await notificationService.createAndDispatch({
        userId: null, // Anonymous user
        type: "email",
        category: "donation",
        priority: "medium",
        title: emailTitle,
        message: emailMessage,
        data: notificationData,
        relatedEntityType: "donation",
        relatedEntityId: donationId,
        templateId: "donation.received.email.v1",
      });

      logger.info("Email anonymous donor receipt sent", {
        donationId,
        campaignId,
      });
    } catch (emailError) {
      logger.warn("Failed to send email anonymous donor receipt", {
        error: emailError.message,
        donationId,
        campaignId,
      });
    }
  } catch (error) {
    logger.error("Failed to send anonymous donor receipt", {
      error: error.message,
      donationId,
      campaignId,
    });
  }
};
