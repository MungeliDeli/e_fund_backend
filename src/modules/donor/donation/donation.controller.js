import donationService from "./donation.service.js";
import { ResponseFactory } from "../../../utils/response.utils.js";

class DonationController {
  async createDonation(req, res) {
    const donationData = req.body;
    const userId = req.user?.userId || null; // Can be null for anonymous donations

    const result = await donationService.createDonation(donationData, userId);

    return ResponseFactory.created(res, "Donation created successfully", {
      donation: result.donation,
      transaction: result.transaction,
      messageId: result.messageId,
      success: result.success,
    });
  }

  async getDonationById(req, res) {
    const { donationId } = req.params;

    const donation = await donationService.getDonationById(donationId);

    return ResponseFactory.ok(res, "Donation retrieved successfully", donation);
  }

  async getDonationsByCampaign(req, res) {
    const { campaignId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const donations = await donationService.getDonationsByCampaign(
      campaignId,
      parseInt(limit),
      parseInt(offset)
    );

    return ResponseFactory.ok(
      res,
      "Donations retrieved successfully",
      donations
    );
  }

  async updateDonationStatus(req, res) {
    const { donationId } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    const updatedDonation = await donationService.updateDonationStatus(
      donationId,
      status,
      userId
    );

    return ResponseFactory.ok(
      res,
      "Donation status updated successfully",
      updatedDonation
    );
  }

  async updateReceiptSent(req, res) {
    const { donationId } = req.params;
    const { receiptSent } = req.body;
    const userId = req.user.userId;

    const updatedDonation = await donationService.updateReceiptSent(
      donationId,
      receiptSent,
      userId
    );

    return ResponseFactory.ok(
      res,
      "Receipt status updated successfully",
      updatedDonation
    );
  }

  async getDonationStats(req, res) {
    const { campaignId } = req.params;

    const stats = await donationService.getDonationStats(campaignId);

    return ResponseFactory.ok(
      res,
      "Donation statistics retrieved successfully",
      stats
    );
  }

  async getDonationsByUser(req, res) {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const donations = await donationService.getDonationsByUser(
      userId,
      parseInt(limit),
      parseInt(offset)
    );

    return ResponseFactory.ok(
      res,
      "User donations retrieved successfully",
      donations
    );
  }

  async updateCampaignStatistics(req, res) {
    const { campaignId } = req.params;
    const { amount } = req.body;
    const userId = req.user.userId;

    const updatedStats = await donationService.updateCampaignStatistics(
      campaignId,
      amount
    );

    return ResponseFactory.ok(
      res,
      "Campaign statistics updated successfully",
      updatedStats
    );
  }
}

export default new DonationController();
