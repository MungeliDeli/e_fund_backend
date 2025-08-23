import donationRepository from "./donation.repository.js";
import transactionService from "../../payment/transactions/transaction.service.js";
import messageService from "../messages/message.service.js";
import { logServiceEvent } from "../../audit/audit.utils.js";
import { DONATION_ACTIONS, ENTITY_TYPES } from "../../audit/audit.constants.js";
import { getCampaignById } from "../../campaign/campaigns/campaign.service.js";
import { getUserById } from "../../users/user.service.js";
import notificationService from "../../notifications/notification.service.js";
import { AppError } from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";
import { transaction } from "../../../db/index.js";

class DonationService {
  async createDonation(donationData, userId = null) {
    try {
      // Enhanced data validation
      await this.validateDonationData(donationData);

      // Campaign state validation
      await this.validateCampaignState(donationData.campaignId);

      // Use database transaction to ensure data consistency
      const result = await transaction(async (client) => {
        // 1. Create donation record
        const donationPayload = {
          campaignId: donationData.campaignId,
          userId: userId, // Can be null for anonymous donations
          amount: donationData.amount,
          currency: donationData.currency || "USD",
          status: "pending",
          isAnonymous: donationData.isAnonymous || false,
          phoneNumber: donationData.phoneNumber,
          paymentMethod: donationData.paymentMethod,
        };

        const donation = await donationRepository.createDonation(
          donationPayload,
          client
        );

        // Log donation creation in audit logs
        try {
          await logServiceEvent(
            userId || null,
            DONATION_ACTIONS.DONATION_MADE,
            ENTITY_TYPES.DONATION,
            donation.donationId,
            {
              campaignId: donationData.campaignId,
              amount: donationData.amount,
              currency: donationData.currency || "USD",
              isAnonymous: donationData.isAnonymous || false,
              paymentMethod: donationData.paymentMethod,
              phoneNumber: donationData.phoneNumber,
              messageText: donationData.messageText
                ? "Message provided"
                : "No message",
            }
          );
        } catch (auditError) {
          logger.warn("Failed to log donation creation audit", {
            error: auditError.message,
          });
        }

        logger.info("Donation record created", {
          donationId: donation.donationId,
          campaignId: donationData.campaignId,
          amount: donationData.amount,
          isAnonymous: donationData.isAnonymous,
        });

        // 2. Create transaction record
        const transactionPayload = {
          donationId: donation.donationId,
          campaignId: donationData.campaignId,
          amount: donationData.amount,
          currency: donationData.currency || "USD",
          gatewayUsed: donationData.paymentMethod,
          status: "pending",
          gatewayTransactionId: `MOCK_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          metadata: {
            phoneNumber: donationData.phoneNumber,
            paymentMethod: donationData.paymentMethod,
            isAnonymous: donationData.isAnonymous,
          },
        };

        const transaction = await transactionService.createTransaction(
          transactionPayload
        );

        // Log transaction creation in audit logs
        try {
          await logCustomEvent(
            { user: { userId: userId || "anonymous" } },
            DONATION_ACTIONS.DONATION_MADE,
            ENTITY_TYPES.TRANSACTION,
            transaction.transactionId,
            {
              donationId: donation.donationId,
              campaignId: donationData.campaignId,
              amount: donationData.amount,
              gatewayUsed: donationData.paymentMethod,
              gatewayTransactionId: transaction.gatewayTransactionId,
            }
          );
        } catch (auditError) {
          logger.warn("Failed to log transaction creation audit", {
            error: auditError.message,
          });
        }

        logger.info("Transaction record created", {
          transactionId: transaction.transactionId,
          donationId: donation.donationId,
          gatewayTransactionId: transaction.gatewayTransactionId,
        });

        // 3. Update donation with transaction ID
        await donationRepository.updateDonationTransactionId(
          donation.donationId,
          transaction.transactionId,
          client
        );

        // 4. Create donation message if provided
        let messageId = null;
        if (donationData.messageText && donationData.messageText.trim()) {
          const messagePayload = {
            campaignId: donationData.campaignId,
            donationId: donation.donationId,
            messageText: donationData.messageText.trim(),
            status: "pending", // Will be moderated later
            isAnonymous: donationData.isAnonymous || false,
          };

          // Note: We'll need to add createMessage method to messageService
          // For now, we'll log the message data
          logger.info("Message data prepared for donation", {
            donationId: donation.donationId,
            messageText: donationData.messageText,
            isAnonymous: donationData.isAnonymous,
          });

          // Log message creation in audit logs
          try {
            await logServiceEvent(
              userId || null,
              DONATION_ACTIONS.DONATION_MADE,
              ENTITY_TYPES.DONATION,
              donation.donationId,
              {
                campaignId: donationData.campaignId,
                donationId: donation.donationId,
                messageText: "Message provided",
                isAnonymous: donationData.isAnonymous || false,
                messageLength: donationData.messageText.length,
              }
            );
          } catch (auditError) {
            logger.warn("Failed to log message creation audit", {
              error: auditError.message,
            });
          }

          // TODO: Implement message creation when messageService.createMessage is available
          // const message = await messageService.createMessage(messagePayload);
          // const messageId = message.messageId;
        }

        // 5. Update campaign statistics
        await donationRepository.updateCampaignStatistics(
          donationData.campaignId,
          donationData.amount,
          client
        );

        logger.info("Campaign statistics updated", {
          campaignId: donationData.campaignId,
          amount: donationData.amount,
        });

        // 6. Send notifications to campaign organizer
        try {
          await this.sendCampaignOrganizerNotifications(
            donationData.campaignId,
            donation.donationId,
            donationData.amount,
            donationData.currency || "USD",
            donationData.messageText,
            donationData.isAnonymous || false,
            donationData.phoneNumber
          );
        } catch (notificationError) {
          logger.warn("Failed to send campaign organizer notifications", {
            error: notificationError.message,
            campaignId: donationData.campaignId,
            donationId: donation.donationId,
          });
        }

        // 7. Send notifications to donor (if registered user)
        if (userId && !donationData.isAnonymous) {
          try {
            await this.sendDonorNotifications(
              userId,
              donation.donationId,
              donationData.campaignId,
              donationData.amount,
              donationData.currency || "USD",
              donationData.messageText
            );
          } catch (donorNotificationError) {
            logger.warn("Failed to send donor notifications", {
              error: donorNotificationError.message,
              userId,
              donationId: donation.donationId,
            });
          }
        } else if (donationData.isAnonymous) {
          // Handle anonymous donor differently - generate receipt but don't send notifications
          try {
            await this.sendAnonymousDonorReceipt(
              donation.donationId,
              donationData.campaignId,
              donationData.amount,
              donationData.currency || "USD",
              donationData.messageText
            );
          } catch (anonymousReceiptError) {
            logger.warn("Failed to generate anonymous donor receipt", {
              error: anonymousReceiptError.message,
              donationId: donation.donationId,
              campaignId: donationData.campaignId,
            });
          }

          // Log anonymous donation activity
          logger.info("Anonymous donation received - receipt generated", {
            donationId: donation.donationId,
            campaignId: donationData.campaignId,
            amount: donationData.amount,
            phoneNumber: donationData.phoneNumber,
            hasMessage: !!donationData.messageText,
          });
        }

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

      // Simulate payment processing asynchronously (mock gateway)
      this.simulatePaymentProcessing(result.donation, result.transaction).catch(
        (error) => {
          logger.error("Payment simulation failed", {
            donationId: result.donation.donationId,
            transactionId: result.transaction.transactionId,
            error,
          });
        }
      );

      return result;
    } catch (error) {
      logger.error("Error creating donation:", error);

      // Provide specific error messages based on error type
      if (error.code === "23505") {
        // Unique constraint violation
        throw new AppError(
          "Donation with this information already exists",
          409
        );
      } else if (error.code === "23503") {
        // Foreign key constraint violation
        throw new AppError("Invalid campaign or user reference", 400);
      } else if (error instanceof AppError) {
        throw error;
      } else {
        throw new AppError("Failed to create donation", 500);
      }
    }
  }

  async simulatePaymentProcessing(donation, txn) {
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

    // Log transaction success in audit logs
    try {
      await logServiceEvent(
        donation.donorUserId || null,
        DONATION_ACTIONS.DONATION_MADE,
        ENTITY_TYPES.TRANSACTION,
        txn.transactionId,
        {
          donationId: donation.donationId,
          campaignId: donation.campaignId,
          status: "succeeded",
          gatewayResponse: mockGatewayResponse,
          simulation: true,
        }
      );
    } catch (auditError) {
      logger.warn("Failed to log transaction success audit", {
        error: auditError.message,
      });
    }

    // 2) Mark donation as completed
    await donationRepository.updateDonationStatus(
      donation.donationId,
      "completed"
    );

    // Log donation completion in audit logs
    try {
      await logServiceEvent(
        donation.donorUserId || null,
        DONATION_ACTIONS.DONATION_MADE,
        ENTITY_TYPES.DONATION,
        donation.donationId,
        {
          campaignId: donation.campaignId,
          status: "completed",
          transactionId: txn.transactionId,
          simulation: true,
        }
      );
    } catch (auditError) {
      logger.warn("Failed to log donation completion audit", {
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

    logger.info("Mock payment simulation completed", {
      donationId: donation.donationId,
      transactionId: txn.transactionId,
      gatewayTransactionId: txn.gatewayTransactionId,
    });
  }

  async getDonationById(donationId) {
    const donation = await donationRepository.getDonationById(donationId);

    if (!donation) {
      throw new AppError("Donation not found", 404);
    }

    return donation;
  }

  async getDonationsByCampaign(campaignId, limit = 50, offset = 0) {
    const donations = await donationRepository.getDonationsByCampaign(
      campaignId,
      limit,
      offset
    );

    return donations;
  }

  async updateDonationStatus(donationId, status, userId) {
    // Validate status transition
    const validTransitions = {
      pending: ["completed", "failed"],
      completed: ["refunded"],
      failed: [],
      refunded: [],
    };

    const currentDonation = await donationRepository.getDonationById(
      donationId
    );
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
  }

  async updateReceiptSent(donationId, receiptSent, userId) {
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
  }

  async getDonationStats(campaignId) {
    const stats = await donationRepository.getDonationStats(campaignId);

    return {
      totalDonations: parseInt(stats.totalDonations) || 0,
      completedDonations: parseInt(stats.completedDonations) || 0,
      totalAmount: parseFloat(stats.totalAmount) || 0.0,
      anonymousDonations: parseInt(stats.anonymousDonations) || 0,
    };
  }

  async getDonationsByUser(userId, limit = 50, offset = 0) {
    const donations = await donationRepository.getDonationsByUser(
      userId,
      limit,
      offset
    );

    return donations;
  }

  async updateCampaignStatistics(campaignId, amount) {
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
  }

  async sendCampaignOrganizerNotifications(
    campaignId,
    donationId,
    amount,
    currency,
    messageText,
    isAnonymous,
    phoneNumber
  ) {
    try {
      const campaign = await getCampaignById(campaignId);
      if (!campaign || !campaign.organizerId) {
        logger.warn("Campaign or organizer not found for notification", {
          campaignId,
        });
        return;
      }

      const organizerId = campaign.organizerId;
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

      // Send in-app notification
      try {
        await notificationService.createAndDispatch({
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

        logger.info("In-app notification sent to campaign organizer", {
          campaignId,
          organizerId,
          donationId,
        });
      } catch (inAppError) {
        logger.warn("Failed to send in-app notification", {
          error: inAppError.message,
          campaignId,
          organizerId,
          donationId,
        });
      }

      // Send email notification
      try {
        const emailTitle = `New donation received for ${campaignName}`;
        const emailMessage = `
          <h2>New Donation Received!</h2>
          <p>Your campaign <strong>${campaignName}</strong> has received a new donation.</p>
          <p><strong>Amount:</strong> ${formattedAmount}</p>
          <p><strong>Donation ID:</strong> ${donationId}</p>
          ${
            messageText
              ? `<p><strong>Message:</strong> "${messageText}"</p>`
              : ""
          }
          ${
            !isAnonymous && phoneNumber
              ? `<p><strong>Contact:</strong> ${phoneNumber}</p>`
              : ""
          }
          <p>Thank you for your fundraising efforts!</p>
        `;

        await notificationService.createAndDispatch({
          userId: organizerId,
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

        logger.info("Email notification sent to campaign organizer", {
          campaignId,
          organizerId,
          donationId,
        });
      } catch (emailError) {
        logger.warn("Failed to send email notification", {
          error: emailError.message,
          campaignId,
          organizerId,
          donationId,
        });
      }
    } catch (error) {
      logger.error("Failed to send campaign organizer notifications", {
        error: error.message,
        campaignId,
        donationId,
      });
    }
  }

  async sendDonorNotifications(
    userId,
    donationId,
    campaignId,
    amount,
    currency,
    messageText
  ) {
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
            messageText
              ? `<p><strong>Message:</strong> "${messageText}"</p>`
              : ""
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
  }

  async sendAnonymousDonorReceipt(
    donationId,
    campaignId,
    amount,
    currency,
    messageText
  ) {
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
            messageText
              ? `<p><strong>Message:</strong> "${messageText}"</p>`
              : ""
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
  }

  /**
   * Comprehensive data validation for donation data
   * @param {Object} donationData - Donation data to validate
   * @throws {AppError} If validation fails
   */
  async validateDonationData(donationData) {
    // Validate required fields
    if (!donationData.campaignId) {
      throw new AppError("Campaign ID is required", 400);
    }
    if (!donationData.amount) {
      throw new AppError("Donation amount is required", 400);
    }
    if (!donationData.phoneNumber) {
      throw new AppError("Phone number is required", 400);
    }
    if (!donationData.paymentMethod) {
      throw new AppError("Payment method is required", 400);
    }

    // Validate amount
    if (typeof donationData.amount !== "number" || isNaN(donationData.amount)) {
      throw new AppError("Amount must be a valid number", 400);
    }
    if (donationData.amount <= 0) {
      throw new AppError("Amount must be greater than 0", 400);
    }
    if (donationData.amount < 0.01) {
      throw new AppError("Amount must be at least $0.01", 400);
    }
    if (donationData.amount > 999999.99) {
      throw new AppError("Amount cannot exceed $999,999.99", 400);
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(donationData.phoneNumber)) {
      throw new AppError(
        "Phone number must be in valid international format (e.g., +1234567890)",
        400
      );
    }

    // Validate message content if provided
    if (
      donationData.messageText !== undefined &&
      donationData.messageText !== null
    ) {
      if (typeof donationData.messageText !== "string") {
        throw new AppError("Message must be a string", 400);
      }

      const trimmedMessage = donationData.messageText.trim();
      if (trimmedMessage.length > 1000) {
        throw new AppError("Message cannot exceed 1000 characters", 400);
      }

      // Check for potentially harmful content
      const harmfulPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /data:text\/html/gi,
      ];

      for (const pattern of harmfulPatterns) {
        if (pattern.test(trimmedMessage)) {
          throw new AppError(
            "Message contains potentially harmful content",
            400
          );
        }
      }
    }

    // Validate currency format
    if (donationData.currency) {
      const currencyRegex = /^[A-Z]{3}$/;
      if (!currencyRegex.test(donationData.currency)) {
        throw new AppError(
          "Currency must be a valid 3-letter currency code (e.g., USD, EUR)",
          400
        );
      }
    }

    // Validate boolean fields
    if (
      donationData.isAnonymous !== undefined &&
      typeof donationData.isAnonymous !== "boolean"
    ) {
      throw new AppError("isAnonymous must be a boolean value", 400);
    }

    logger.info("Donation data validation passed", {
      campaignId: donationData.campaignId,
      amount: donationData.amount,
      hasMessage: !!donationData.messageText,
      isAnonymous: donationData.isAnonymous || false,
    });
  }

  /**
   * Validate campaign state before allowing donations
   * @param {string} campaignId - Campaign ID to validate
   * @throws {AppError} If campaign is not in valid state for donations
   */
  async validateCampaignState(campaignId) {
    try {
      const campaign = await getCampaignById(campaignId);

      if (!campaign) {
        throw new AppError("Campaign not found", 404);
      }

      // Check if campaign is active
      if (campaign.status !== "active") {
        const validStatuses = ["active"];
        throw new AppError(
          `Campaign is not accepting donations. Current status: ${
            campaign.status
          }. Only campaigns with status: ${validStatuses.join(
            ", "
          )} can receive donations.`,
          422
        );
      }

      // Check if campaign has ended
      if (campaign.endDate && new Date(campaign.endDate) < new Date()) {
        throw new AppError(
          "Campaign has ended and is no longer accepting donations",
          422
        );
      }

      // Check if campaign has started
      if (campaign.startDate && new Date(campaign.startDate) > new Date()) {
        throw new AppError(
          "Campaign has not started yet and is not accepting donations",
          422
        );
      }

      // Check if campaign is suspended (additional safety check)
      if (campaign.status === "cancelled" || campaign.status === "rejected") {
        throw new AppError(
          `Campaign is ${campaign.status} and cannot receive donations`,
          422
        );
      }

      logger.info("Campaign state validation passed", {
        campaignId,
        status: campaign.status,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error("Failed to validate campaign state", {
        error: error.message,
        campaignId,
      });
      throw new AppError("Failed to validate campaign state", 500);
    }
  }
}

export default new DonationService();
