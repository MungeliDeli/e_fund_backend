import donationRepository from "./donation.repository.js";
import transactionService from "../../payment/transactions/transaction.service.js";
import messageService from "../messages/message.service.js";
import { AppError } from "../../../utils/appError.js";
import { logger } from "../../../utils/logger.js";
import { transaction } from "../../../db/index.js";

class DonationService {
  async createDonation(donationData, userId = null) {
    try {
      // Validate required fields
      if (
        !donationData.campaignId ||
        !donationData.amount ||
        donationData.amount <= 0
      ) {
        throw new AppError(
          "Invalid donation data: campaignId and amount are required",
          400
        );
      }

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

          // TODO: Implement message creation when messageService.createMessage is available
          // const message = await messageService.createMessage(messagePayload);
          // const message = await messageService.createMessage(messagePayload);
          // messageId = message.messageId;
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
}

export default new DonationService();
