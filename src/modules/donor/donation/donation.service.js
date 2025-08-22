import donationRepository from "./donation.repository.js";
import { AppError } from "../../../utils/appError.js";
import { logger } from "../../../utils/logger.js";

class DonationService {
  async createDonation(donationData, userId = null) {
    try {
      // Validate campaign exists and is active
      // This would typically be done through a campaign service

      // Prepare data for repository
      const donationPayload = {
        ...donationData,
        userId: userId, // Can be null for anonymous donations
      };

      // Create donation message if provided
      let messageId = null;
      if (donationData.messageText && donationData.messageText.trim()) {
        // This would typically be done through the message service
        // For now, we'll assume the message is created separately
        logger.info("Message text provided for donation", {
          campaignId: donationData.campaignId,
          hasMessage: true,
        });
      }

      // Note: Transaction creation will be handled by the payment service
      // This service will receive the transactionId from the payment flow

      logger.info("Donation data prepared", {
        campaignId: donationData.campaignId,
        amount: donationData.amount,
        isAnonymous: donationData.isAnonymous,
        hasMessage: !!donationData.messageText,
      });

      return {
        donationData: donationPayload,
        messageData: donationData.messageText
          ? { messageText: donationData.messageText }
          : null,
      };
    } catch (error) {
      logger.error("Error preparing donation data:", error);
      throw new AppError("Failed to prepare donation data", 500);
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
