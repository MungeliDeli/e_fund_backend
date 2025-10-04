/**
 * Analytics Service
 *
 * Contains business logic for campaign analytics including financial metrics,
 * donor insights, and performance statistics. Processes raw data from the
 * analytics repository and formats it for the controller layer.
 *
 * Key Features:
 * - Campaign financial summary calculations
 * - Donor analytics and insights
 * - Performance metrics and trends
 * - Data formatting and business rules
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import * as analyticsRepository from "./analytics.repository.js";
import { NotFoundError, ValidationError } from "../../utils/appError.js";
import logger from "../../utils/logger.js";

/**
 * Analytics Service
 * Contains business logic for analytics and data processing
 */
class AnalyticsService {
  /**
   * Get comprehensive campaign analytics summary
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>} Formatted analytics data
   */
  async getCampaignAnalyticsSummary(campaignId) {
    try {
      if (!campaignId) {
        throw new ValidationError("Campaign ID is required");
      }

      logger.info("Fetching campaign analytics summary", { campaignId });

      // Get comprehensive analytics data from repository
      const analyticsData =
        await analyticsRepository.getCampaignAnalyticsSummary(campaignId);

      if (!analyticsData) {
        throw new NotFoundError("Campaign analytics not found");
      }

      // Process and format the data
      const formattedData = this._formatAnalyticsData(analyticsData);

      logger.info("Campaign analytics summary retrieved successfully", {
        campaignId,
        totalRaised: formattedData.totalRaised,
        uniqueDonors: formattedData.uniqueDonors,
      });

      return formattedData;
    } catch (error) {
      logger.error("Failed to get campaign analytics summary", {
        campaignId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get campaign financial metrics
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>} Financial metrics
   */
  async getCampaignFinancialMetrics(campaignId) {
    try {
      if (!campaignId) {
        throw new ValidationError("Campaign ID is required");
      }

      logger.info("Fetching campaign financial metrics", { campaignId });

      const financialData =
        await analyticsRepository.getCampaignFinancialSummary(campaignId);

      if (!financialData) {
        throw new NotFoundError("Campaign financial data not found");
      }

      // Format financial data with proper currency handling
      const formattedData = {
        totalRaised: parseFloat(financialData.totalRaised || 0),
        averageDonation: parseFloat(financialData.averageDonation || 0),
        largestDonation: parseFloat(financialData.largestDonation || 0),
        totalDonations: parseInt(financialData.totalDonations || 0),
      };

      logger.info("Campaign financial metrics retrieved successfully", {
        campaignId,
        totalRaised: formattedData.totalRaised,
        totalDonations: formattedData.totalDonations,
      });

      return formattedData;
    } catch (error) {
      logger.error("Failed to get campaign financial metrics", {
        campaignId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get campaign donor insights
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>} Donor insights and breakdown
   */
  async getCampaignDonorInsights(campaignId) {
    try {
      if (!campaignId) {
        throw new ValidationError("Campaign ID is required");
      }

      logger.info("Fetching campaign donor insights", { campaignId });

      // Get donor breakdown data
      const breakdownData = await analyticsRepository.getCampaignDonorBreakdown(
        campaignId
      );
      const uniqueDonorsData =
        await analyticsRepository.getCampaignUniqueDonors(campaignId);

      if (!breakdownData || !uniqueDonorsData) {
        throw new NotFoundError("Campaign donor data not found");
      }

      // Calculate percentages and format data
      const totalDonations = parseInt(breakdownData.totalDonations || 0);
      const anonymousCount = parseInt(breakdownData.anonymousCount || 0);
      const namedCount = parseInt(breakdownData.namedCount || 0);
      const uniqueDonors = parseInt(uniqueDonorsData.uniqueDonors || 0);

      const formattedData = {
        totalDonations,
        uniqueDonors,
        anonymousDonations: {
          count: anonymousCount,
          percentage:
            totalDonations > 0
              ? Math.round((anonymousCount / totalDonations) * 100)
              : 0,
        },
        namedDonations: {
          count: namedCount,
          percentage:
            totalDonations > 0
              ? Math.round((namedCount / totalDonations) * 100)
              : 0,
        },
      };

      logger.info("Campaign donor insights retrieved successfully", {
        campaignId,
        totalDonations: formattedData.totalDonations,
        uniqueDonors: formattedData.uniqueDonors,
      });

      return formattedData;
    } catch (error) {
      logger.error("Failed to get campaign donor insights", {
        campaignId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get top donors for a campaign
   * @param {string} campaignId - Campaign ID
   * @param {number} limit - Maximum number of donors to return (default: 10)
   * @returns {Promise<Array>} Top donors list
   */
  async getCampaignTopDonors(campaignId, limit = 10) {
    try {
      if (!campaignId) {
        throw new ValidationError("Campaign ID is required");
      }

      if (limit !== undefined && (limit < 1 || limit > 50)) {
        throw new ValidationError("Limit must be between 1 and 50");
      }

      logger.info("Fetching campaign top donors", { campaignId, limit });

      const topDonors = await analyticsRepository.getCampaignTopDonors(
        campaignId,
        limit
      );

      if (!topDonors) {
        return [];
      }

      // Format donor data for display
      const formattedDonors = topDonors.map((donor, index) => {
        const baseDonor = {
          rank: index + 1,
          donorId: donor.donorUserId,
          isAnonymous: donor.isAnonymous,
          amount: parseFloat(donor.amount || 0),
          donationDate: donor.donationDate,
          message: donor.messageText || null,
          messageStatus: donor.messageStatus || null,
        };

        // Add donor details based on profile type (only if not anonymous)
        if (!donor.isAnonymous && donor.profileType) {
          if (donor.profileType === "individual") {
            baseDonor.donorDetails = {
              type: "individual",
              userId: donor.individualUserId,
              firstName: donor.individualFirstName,
              lastName: donor.individualLastName,
              displayName:
                `${donor.individualFirstName} ${donor.individualLastName}`.trim(),
            };
          } else if (donor.profileType === "organization") {
            baseDonor.donorDetails = {
              type: "organization",
              userId: donor.organizationUserId,
              organizationName: donor.organizationName,
              organizationShortName: donor.organizationShortName,
              displayName:
                donor.organizationShortName || donor.organizationName,
            };
          }
        }

        return baseDonor;
      });

      logger.info("Campaign top donors retrieved successfully", {
        campaignId,
        donorCount: formattedDonors.length,
      });

      return formattedDonors;
    } catch (error) {
      logger.error("Failed to get campaign top donors", {
        campaignId,
        limit,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get campaign progress percentage (for progress bar)
   * @param {string} campaignId - Campaign ID
   * @param {number} goalAmount - Campaign goal amount
   * @returns {Promise<Object>} Progress data with percentage and status
   */
  async getCampaignProgress(campaignId, goalAmount) {
    try {
      if (!campaignId) {
        throw new ValidationError("Campaign ID is required");
      }

      if (!goalAmount || goalAmount <= 0) {
        throw new ValidationError("Valid goal amount is required");
      }

      logger.info("Calculating campaign progress", { campaignId, goalAmount });

      const financialData =
        await analyticsRepository.getCampaignFinancialSummary(campaignId);

      if (!financialData) {
        throw new NotFoundError("Campaign financial data not found");
      }

      const totalRaised = parseFloat(financialData.totalRaised || 0);
      const percentage = Math.min((totalRaised / goalAmount) * 100, 100);

      // Determine progress status and color
      let status = "low";
      if (percentage >= 80) {
        status = "high";
      } else if (percentage >= 50) {
        status = "medium";
      }

      const progressData = {
        totalRaised,
        goalAmount,
        percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
        status,
        remaining: Math.max(goalAmount - totalRaised, 0),
      };

      logger.info("Campaign progress calculated successfully", {
        campaignId,
        percentage: progressData.percentage,
        status: progressData.status,
      });

      return progressData;
    } catch (error) {
      logger.error("Failed to calculate campaign progress", {
        campaignId,
        goalAmount,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Private method to format analytics data consistently
   * @param {Object} rawData - Raw data from repository
   * @returns {Object} Formatted analytics data
   * @private
   */
  _formatAnalyticsData(rawData) {
    return {
      totalRaised: parseFloat(rawData.totalRaised || 0),
      averageDonation: parseFloat(rawData.averageDonation || 0),
      largestDonation: parseFloat(rawData.largestDonation || 0),
      totalDonations: parseInt(rawData.totalDonations || 0),
      uniqueDonors: parseInt(rawData.uniqueDonors || 0),
      anonymousCount: parseInt(rawData.anonymousCount || 0),
      namedCount: parseInt(rawData.namedCount || 0),
    };
  }
}

export default new AnalyticsService();
