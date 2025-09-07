/**
 * Outreach Campaign Analytics Service
 *
 * Provides analytics and statistics for outreach campaigns including
 * email events, donation attribution, and performance metrics.
 *
 * Key Features:
 * - Outreach campaign statistics
 * - Email event analytics
 * - Donation attribution tracking
 * - Performance metrics calculation
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { getOutreachCampaignById } from "./outreachCampaign.repository.js";
import { getLinkTokensByOutreachCampaign } from "../linkTokens/linkToken.repository.js";
import {
  getEmailEventsByOutreachCampaign,
  getEmailEventStatsByCampaign,
} from "../emailEvents/emailEvent.repository.js";
import { getDonationsByLinkToken } from "../../donor/donation/donation.repository.js";
import logger from "../../../utils/logger.js";
import { NotFoundError, DatabaseError } from "../../../utils/appError.js";

/**
 * Get comprehensive analytics for an outreach campaign
 * @param {string} outreachCampaignId - Outreach campaign ID
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Object>} Analytics data
 */
export const getOutreachCampaignStats = async (
  outreachCampaignId,
  organizerId
) => {
  try {
    // Verify outreach campaign exists and belongs to organizer
    const outreachCampaign = await getOutreachCampaignById(
      outreachCampaignId,
      organizerId
    );
    if (!outreachCampaign) {
      throw new NotFoundError("Outreach campaign not found");
    }

    // Get all link tokens for this outreach campaign
    const linkTokens = await getLinkTokensByOutreachCampaign(
      outreachCampaignId,
      organizerId
    );

    if (linkTokens.length === 0) {
      return {
        outreachCampaignId,
        campaignId: outreachCampaign.campaignId,
        name: outreachCampaign.name,
        status: outreachCampaign.status,
        totals: {
          sends: 0,
          uniqueOpens: 0,
          uniqueClicks: 0,
          totalClicks: 0,
          donations: 0,
          totalAmount: 0,
        },
        rates: {
          openRate: 0,
          clickRate: 0,
          conversionRate: 0,
        },
        recipients: [],
      };
    }

    // Get email events for this outreach campaign
    const emailEvents = await getEmailEventsByOutreachCampaign(
      outreachCampaignId,
      organizerId
    );

    // Calculate unique opens and clicks
    const uniqueOpens = new Set();
    const uniqueClicks = new Set();
    let totalClicks = 0;

    emailEvents.forEach((event) => {
      if (event.type === "open") {
        uniqueOpens.add(event.contactId);
      } else if (event.type === "click") {
        uniqueClicks.add(event.contactId);
        totalClicks++;
      }
    });

    // Get donation data for all link tokens
    const donations = [];
    let totalDonationAmount = 0;

    for (const linkToken of linkTokens) {
      const linkTokenDonations = await getDonationsByLinkToken(
        linkToken.linkTokenId
      );
      donations.push(...linkTokenDonations);
      totalDonationAmount += linkTokenDonations.reduce(
        (sum, donation) => sum + parseFloat(donation.amount || 0),
        0
      );
    }

    // Calculate rates
    const sends = linkTokens.length;
    const openRate = sends > 0 ? (uniqueOpens.size / sends) * 100 : 0;
    const clickRate = sends > 0 ? (uniqueClicks.size / sends) * 100 : 0;
    const conversionRate = sends > 0 ? (donations.length / sends) * 100 : 0;

    // Build recipient details
    const recipients = linkTokens.map((linkToken) => {
      const recipientEvents = emailEvents.filter(
        (event) => event.linkTokenId === linkToken.linkTokenId
      );
      const recipientDonations = donations.filter(
        (donation) => donation.linkTokenId === linkToken.linkTokenId
      );

      const hasOpened = recipientEvents.some((event) => event.type === "open");
      const hasClicked = recipientEvents.some(
        (event) => event.type === "click"
      );
      const hasDonated = recipientDonations.length > 0;
      const donatedAmount = recipientDonations.reduce(
        (sum, donation) => sum + parseFloat(donation.amount || 0),
        0
      );

      const lastEvent =
        recipientEvents.length > 0
          ? recipientEvents.sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            )[0]
          : null;

      return {
        contactId: linkToken.contactId,
        email: linkToken.contact?.email || "Unknown",
        name: linkToken.contact?.name || "Unknown",
        sentAt: linkToken.createdAt,
        hasOpened,
        hasClicked,
        hasDonated,
        donatedAmount,
        totalClicks: recipientEvents.filter((event) => event.type === "click")
          .length,
        lastEvent: lastEvent
          ? {
              type: lastEvent.type,
              timestamp: lastEvent.createdAt,
            }
          : null,
      };
    });

    const stats = {
      outreachCampaignId,
      campaignId: outreachCampaign.campaignId,
      name: outreachCampaign.name,
      description: outreachCampaign.description,
      status: outreachCampaign.status,
      createdAt: outreachCampaign.createdAt,
      updatedAt: outreachCampaign.updatedAt,
      totals: {
        sends,
        uniqueOpens: uniqueOpens.size,
        uniqueClicks: uniqueClicks.size,
        totalClicks,
        donations: donations.length,
        totalAmount: totalDonationAmount,
      },
      rates: {
        openRate: Math.round(openRate * 100) / 100,
        clickRate: Math.round(clickRate * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
      },
      recipients,
    };

    logger.info("Outreach campaign analytics retrieved", {
      outreachCampaignId,
      sends,
      uniqueOpens: uniqueOpens.size,
      uniqueClicks: uniqueClicks.size,
      donations: donations.length,
    });

    return stats;
  } catch (error) {
    logger.error("Failed to get outreach campaign analytics", {
      outreachCampaignId,
      error: error.message,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new DatabaseError("Failed to get outreach campaign analytics", error);
  }
};

/**
 * Get email events for an outreach campaign with pagination
 * @param {string} outreachCampaignId - Outreach campaign ID
 * @param {string} organizerId - Organizer ID
 * @param {Object} options - Pagination and filter options
 * @returns {Promise<Object>} Paginated email events
 */
export const getOutreachCampaignEvents = async (
  outreachCampaignId,
  organizerId,
  options = {}
) => {
  try {
    const { page = 1, limit = 50, type } = options;
    const offset = (page - 1) * limit;

    // Verify outreach campaign exists and belongs to organizer
    const outreachCampaign = await getOutreachCampaignById(
      outreachCampaignId,
      organizerId
    );
    if (!outreachCampaign) {
      throw new NotFoundError("Outreach campaign not found");
    }

    // Get email events with pagination
    const emailEvents = await getEmailEventsByOutreachCampaign(
      outreachCampaignId,
      organizerId
    );

    // Filter by type if specified
    const filteredEvents = type
      ? emailEvents.filter((event) => event.type === type)
      : emailEvents;

    // Apply pagination
    const paginatedEvents = filteredEvents.slice(offset, offset + limit);
    const total = filteredEvents.length;
    const totalPages = Math.ceil(total / limit);

    return {
      events: paginatedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  } catch (error) {
    logger.error("Failed to get outreach campaign events", {
      outreachCampaignId,
      error: error.message,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new DatabaseError("Failed to get outreach campaign events", error);
  }
};
