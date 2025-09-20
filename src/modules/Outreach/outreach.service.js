/**
 * Outreach Service Layer
 *
 * Orchestrates business logic for outreach functionality including
 * link token management, email sending, and tracking coordination.
 *
 * Key Features:
 * - Link token creation and management
 * - Email sending with templates
 * - Tracking coordination
 * - Business logic validation
 * - Error handling and logging
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import {
  createLinkToken,
  getLinkTokenById,
  getLinkTokensByCampaign,
  getLinkTokensByOutreachCampaign,
  deleteLinkToken,
  deleteLinkTokenUnsafe,
} from "./linkTokens/linkToken.repository.js";
import { getOutreachCampaignById } from "./outreachCampaign/outreachCampaign.repository.js";
import {
  recordEmailEvent,
  getEmailEventStatsByCampaign,
  getEmailEventsByLinkTokenAndContact,
} from "./emailEvents/emailEvent.repository.js";
import { refreshStatsForOutreachCampaign } from "./outreachCampaign/outreachCampaignStatsRefresh.service.js";
import { sendOutreachEmail } from "../../utils/email.utils.js";
import { markRecipientSendResultByCampaignContact } from "./outreachCampaign/outreachCampaignRecipients.repository.js";
import {
  createInvitationTemplate,
  createUpdateTemplate,
  createThankYouTemplate,
  generateTrackingLink,
} from "../../utils/emailTemplates.js";
import {
  getContactById,
  getContactsBySegment,
  getAllContactsByOrganizer,
} from "./contacts/contact.repository.js";
import { getSegmentById } from "./segments/segment.repository.js";
import { findCampaignById } from "../campaign/campaigns/campaign.repository.js";
import { getCampaignsByOrganizer } from "../campaign/campaigns/campaign.service.js";
import { getUserById } from "../users/individualUser/user.service.js";
import {
  getDonationAttributionStats,
  getDonationsByContact,
} from "../donor/donation/donation.repository.js";
import { getSocialMediaStats } from "./socialMedia/socialMedia.service.js";
import {
  getOutreachCampaignsCountByCampaign,
  getRecipientDonationAggregatesByCampaign,
} from "./outreachAnalytics.repository.js";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../../utils/appError.js";
import logger from "../../utils/logger.js";

/**
 * Create a link token for outreach
 * @param {Object} linkTokenData - Link token data
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Object>} Created link token with tracking URL
 */
export const createOutreachLinkToken = async (linkTokenData, organizerId) => {
  try {
    // Validate required fields
    const { campaignId, type } = linkTokenData;
    if (!campaignId || !type) {
      throw new ValidationError("Campaign ID and type are required");
    }

    // Validate type
    const validTypes = ["invite", "update", "thanks", "share"];
    if (!validTypes.includes(type)) {
      throw new ValidationError("Invalid link token type");
    }

    // Verify campaign exists and belongs to organizer
    const campaign = await findCampaignById(campaignId);
    if (!campaign || campaign.organizerId !== organizerId) {
      throw new NotFoundError("Campaign not found");
    }

    // Validate contact or segment exists (one must be provided)
    const { contactId, segmentId } = linkTokenData;
    if (!contactId && !segmentId) {
      throw new ValidationError(
        "Either contact ID or segment ID must be provided"
      );
    }

    if (contactId && segmentId) {
      throw new ValidationError(
        "Cannot provide both contact ID and segment ID"
      );
    }

    // Verify contact exists if provided
    if (contactId) {
      const contact = await getContactById(contactId, organizerId);
      if (!contact) {
        throw new NotFoundError("Contact not found");
      }
    }

    // Verify segment exists if provided (skip validation for "all")
    if (segmentId && segmentId !== "all") {
      const segment = await getSegmentById(segmentId, organizerId);
      if (!segment) {
        throw new NotFoundError("Segment not found");
      }
    }

    // Create link token
    const linkToken = await createLinkToken(linkTokenData, organizerId);

    // Generate tracking URL
    const trackingUrl = generateTrackingLink(
      `${process.env.FRONTEND_URL}/campaign/${campaign.shareLink}-${(
        campaign.name || ""
      )
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 80)}`,
      linkToken.linkTokenId,
      {
        utm_source: linkToken.utmSource,
        utm_medium: linkToken.utmMedium,
        utm_campaign: linkToken.utmCampaign,
        utm_content: linkToken.utmContent,
      }
    );

    logger.info("Outreach link token created successfully", {
      linkTokenId: linkToken.linkTokenId,
      campaignId,
      type,
      organizerId,
    });

    return {
      ...linkToken,
      trackingUrl,
    };
  } catch (error) {
    logger.error("Failed to create outreach link token", {
      error: error.message,
      linkTokenData,
      organizerId,
    });

    if (
      error instanceof NotFoundError ||
      error instanceof ValidationError ||
      error instanceof ConflictError
    ) {
      throw error;
    }

    throw new Error("Failed to create outreach link token");
  }
};

/**
 * Send outreach email to contact or segment
 * @param {Object} emailData - Email data
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Object>} Email sending result
 */
export const sendOutreachEmailService = async (emailData, organizerId) => {
  try {
    const {
      campaignId,
      type,
      contactId,
      segmentId,
      personalizedMessage,
      prefillAmount,
      utmParams,
    } = emailData;

    // Validate required fields
    if (!campaignId || !type) {
      throw new ValidationError("Campaign ID and type are required");
    }

    // Validate type
    const validTypes = ["invite", "update", "thanks"];
    if (!validTypes.includes(type)) {
      throw new ValidationError("Invalid email type");
    }

    // Verify campaign exists and belongs to organizer
    const campaign = await findCampaignById(campaignId);
    if (!campaign || campaign.organizerId !== organizerId) {
      throw new NotFoundError("Campaign not found");
    }

    // Get organizer details
    const organizer = await getUserById(organizerId);
    if (!organizer) {
      throw new NotFoundError("Organizer not found");
    }

    let recipients = [];

    // Get recipients based on contact, segment, or all contacts
    if (contactId) {
      // Single contact
      const contact = await getContactById(contactId, organizerId);
      if (!contact) {
        throw new NotFoundError("Contact not found");
      }
      recipients = [contact];
    } else if (segmentId) {
      if (segmentId === "all") {
        // All contacts for organizer
        recipients = await getAllContactsByOrganizer(organizerId);
        if (recipients.length === 0) {
          throw new NotFoundError("No contacts found for organizer");
        }
      } else {
        // Specific segment
        const segment = await getSegmentById(segmentId, organizerId);
        if (!segment) {
          throw new NotFoundError("Segment not found");
        }
        recipients = await getContactsBySegment(segmentId, organizerId);
        if (recipients.length === 0) {
          throw new NotFoundError("No contacts found in segment");
        }
      }
    } else {
      throw new ValidationError(
        "Either contact ID or segment ID must be provided"
      );
    }

    const results = [];

    // Send emails to each recipient
    for (const recipient of recipients) {
      let linkToken;
      try {
        // Create link token for this recipient
        // Create per-contact token; to satisfy DB constraint, provide ONLY contactId
        // and leave segmentId null (we expanded the segment to individual contacts)
        const linkTokenData = {
          campaignId,
          contactId: recipient.contactId,
          segmentId: null,
          type,
          personalizedMessage,
          prefillAmount,
          utmSource: utmParams?.utmSource,
          utmMedium: utmParams?.utmMedium,
          utmCampaign: utmParams?.utmCampaign,
          utmContent: utmParams?.utmContent,
        };

        linkToken = await createLinkToken(linkTokenData, organizerId);

        // Generate tracking URL
        const trackingUrl = generateTrackingLink(
          `${process.env.FRONTEND_URL}/campaign/${campaign.shareLink}-${(
            campaign.name || ""
          )
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .slice(0, 80)}`,
          linkToken.linkTokenId,
          {
            utm_source: linkToken.utmSource,
            utm_medium: linkToken.utmMedium,
            utm_campaign: linkToken.utmCampaign,
            utm_content: linkToken.utmContent,
          }
        );

        // Create email template based on type
        let emailHtml;
        let subject;

        const templateData = {
          organizerName: organizer.name || organizer.email,
          campaignTitle: campaign.name,
          campaignDescription: campaign.description,
          trackedLink: trackingUrl,
          personalizedMessage,
          prefillAmount,
          linkTokenId: linkToken.linkTokenId,
        };

        switch (type) {
          case "invite":
            emailHtml = createInvitationTemplate(templateData);
            subject = `${
              organizer.name || organizer.email
            } invites you to support: ${campaign.name}`;
            break;
          case "update":
            emailHtml = createUpdateTemplate(templateData);
            subject = `Update from ${organizer.name || organizer.email}: ${
              campaign.name
            }`;
            break;
          case "thanks":
            emailHtml = createThankYouTemplate(templateData);
            subject = `Thank you from ${organizer.name || organizer.email}`;
            break;
          default:
            throw new ValidationError("Invalid email type");
        }

        // Send email
        const emailResult = await sendOutreachEmail(
          recipient.email,
          subject,
          emailHtml,
          {
            linkTokenId: linkToken.linkTokenId,
            contactId: recipient.contactId,
          }
        );

        // Record email sent event
        await recordEmailEvent({
          linkTokenId: linkToken.linkTokenId,
          contactId: recipient.contactId,
          type: "sent",
        });

        results.push({
          contactId: recipient.contactId,
          email: recipient.email,
          linkTokenId: linkToken.linkTokenId,
          success: true,
          messageId: emailResult.messageId,
        });

        logger.info("Outreach email sent successfully", {
          contactId: recipient.contactId,
          email: recipient.email,
          linkTokenId: linkToken.linkTokenId,
          type,
          campaignId,
        });
      } catch (error) {
        logger.error("Failed to send outreach email to contact", {
          error: error.message,
          contactId: recipient.contactId,
          email: recipient.email,
          type,
        });

        results.push({
          contactId: recipient.contactId,
          email: recipient.email,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      campaignId,
      type,
      totalRecipients: recipients.length,
      successfulSends: results.filter((r) => r.success).length,
      failedSends: results.filter((r) => !r.success).length,
      results,
    };
  } catch (error) {
    logger.error("Failed to send outreach emails", {
      error: error.message,
      emailData,
      organizerId,
    });

    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }

    throw new Error("Failed to send outreach emails");
  }
};

/**
 * Get outreach analytics for a campaign
 * @param {string} campaignId - Campaign ID
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Object>} Analytics data
 */
export const getOutreachAnalytics = async (campaignId, organizerId) => {
  try {
    // Verify campaign exists and belongs to organizer

    const campaign = await findCampaignById(campaignId);

    if (!campaign || campaign.organizerId !== organizerId) {
      throw new NotFoundError("Campaign not found");
    }

    // Get link tokens for campaign
    const linkTokens = await getLinkTokensByCampaign(campaignId, organizerId);

    // Get email event statistics (sent/open/click from emailEvents table)
    const emailStats = await getEmailEventStatsByCampaign(campaignId);
    const totalSends = emailStats?.sent?.count || 0;
    const totalOpens = emailStats?.open?.count || 0;
    const totalClicks = emailStats?.click?.count || 0;

    // Aggregated outreach campaigns count
    const outreachCampaigns = await getOutreachCampaignsCountByCampaign(
      campaignId
    );

    // Donations/revenue aggregated from recipients across all outreach campaigns
    const recipientAgg = await getRecipientDonationAggregatesByCampaign(
      campaignId
    );

    // Get social media statistics
    const socialMediaStats = await getSocialMediaStats(campaignId, organizerId);

    // Calculate analytics
    const analytics = {
      campaignId,
      totalLinkTokens: linkTokens.length,
      totalLinkTokens: linkTokens.length,
      outreachCampaigns,
      totalClicks,
      totalOpens,
      totalSends,
      totalDonations: recipientAgg.donations || 0,
      totalDonationAmount: recipientAgg.totalAmount || 0,
      totalSocialShares: socialMediaStats.totalSocialShares || 0,
      totalSocialClicks: socialMediaStats.totalSocialClicks || 0,
      openRate: emailStats?.openRate || 0,
      clickRate: emailStats?.clickRate || 0,
      conversionRate:
        emailStats.sends > 0
          ? (((recipientAgg.donations || 0) / emailStats.sends) * 100).toFixed(
              2
            )
          : 0,
      socialMediaEngagement:
        socialMediaStats.totalSocialShares > 0
          ? (
              (socialMediaStats.totalSocialClicks /
                socialMediaStats.totalSocialShares) *
              100
            ).toFixed(2)
          : 0,
      byType: {},
      byContact: {},
      emailEvents: emailStats,
      donationAttribution: {
        totalDonations: recipientAgg.donations || 0,
        totalAmount: recipientAgg.totalAmount || 0,
      },
      socialMediaStats: socialMediaStats,
    };

    // Group by type
    linkTokens.forEach((token) => {
      if (!analytics.byType[token.type]) {
        analytics.byType[token.type] = {
          count: 0,
          clicks: 0,
          opens: 0,
          sends: 0,
        };
      }
      analytics.byType[token.type].count++;
      analytics.byType[token.type].clicks += token.clicksCount;
    });

    // Group by contact
    linkTokens.forEach((token) => {
      if (token.contactId) {
        if (!analytics.byContact[token.contactId]) {
          analytics.byContact[token.contactId] = {
            contactName: token.contactName,
            contactEmail: token.contactEmail,
            clicks: 0,
            opens: 0,
            sends: 0,
          };
        }
        analytics.byContact[token.contactId].clicks += token.clicksCount;
      }
    });

    logger.info("Outreach analytics retrieved successfully", {
      campaignId,
      organizerId,
      totalLinkTokens: analytics.totalLinkTokens,
    });

    return analytics;
  } catch (error) {
    logger.error("Failed to get outreach analytics", {
      error: error.message,
      campaignId,
      organizerId,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new Error("Failed to get outreach analytics");
  }
};

/**
 * Get contact-level analytics for outreach
 * @param {string} contactId - Contact ID
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Object>} Contact analytics data
 */
export const getContactAnalytics = async (contactId, organizerId) => {
  try {
    // Verify contact exists and belongs to organizer
    const contact = await getContactById(contactId, organizerId);
    if (!contact) {
      throw new NotFoundError("Contact not found");
    }

    // Get donations by contact
    const donations = await getDonationsByContact(contactId, organizerId);

    // Calculate contact analytics
    const analytics = {
      contactId,
      contactName: contact.name,
      contactEmail: contact.email,
      totalDonations: donations.length,
      totalDonationAmount: donations.reduce(
        (sum, donation) => sum + parseFloat(donation.amount),
        0
      ),
      averageDonationAmount:
        donations.length > 0
          ? (
              donations.reduce(
                (sum, donation) => sum + parseFloat(donation.amount),
                0
              ) / donations.length
            ).toFixed(2)
          : 0,
      lastDonationDate: donations.length > 0 ? donations[0].createdAt : null,
      donations: donations,
    };

    logger.info("Contact analytics retrieved successfully", {
      contactId,
      organizerId,
      totalDonations: analytics.totalDonations,
    });

    return analytics;
  } catch (error) {
    logger.error("Failed to get contact analytics", {
      error: error.message,
      contactId,
      organizerId,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new Error("Failed to get contact analytics");
  }
};

/**
 * Get link tokens for a campaign with optional filtering
 * @param {string} campaignId - Campaign ID
 * @param {string} organizerId - Organizer ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of link tokens
 */
export const getOutreachLinkTokens = async (
  campaignId,
  organizerId,
  filters = {}
) => {
  try {
    // Verify campaign exists and belongs to organizer
    const campaign = await findCampaignById(campaignId);
    if (!campaign || campaign.organizerId !== organizerId) {
      throw new NotFoundError("Campaign not found");
    }

    // Get link tokens for campaign
    const linkTokens = await getLinkTokensByCampaign(campaignId, organizerId);

    // Apply filters if provided
    let filteredTokens = linkTokens;

    if (filters.type) {
      filteredTokens = filteredTokens.filter(
        (token) => token.type === filters.type
      );
    }

    if (filters.contactId) {
      filteredTokens = filteredTokens.filter(
        (token) => token.contactId === filters.contactId
      );
    }

    if (filters.segmentId) {
      filteredTokens = filteredTokens.filter(
        (token) => token.segmentId === filters.segmentId
      );
    }

    if (filters.hasClicks) {
      filteredTokens = filteredTokens.filter((token) => token.clicksCount > 0);
    }

    logger.info("Outreach link tokens retrieved successfully", {
      campaignId,
      organizerId,
      totalTokens: linkTokens.length,
      filteredTokens: filteredTokens.length,
      filters,
    });

    return filteredTokens;
  } catch (error) {
    logger.error("Failed to get outreach link tokens", {
      error: error.message,
      campaignId,
      organizerId,
      filters,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new Error("Failed to get outreach link tokens");
  }
};

/**
 * Get organizer-level outreach analytics across all campaigns
 * @param {string} organizerId - Organizer ID
 * @param {Object} filters - Optional filters (dateRange, type)
 * @returns {Promise<Object>} Organizer analytics data
 */
export const getOrganizerAnalytics = async (organizerId, filters = {}) => {
  try {
    // Get all campaigns for the organizer
    const campaigns = await getCampaignsByOrganizer(organizerId, {
      limit: 1000,
    });

    if (!campaigns || campaigns.length === 0) {
      return {
        emailsSent: 0,
        opens: 0,
        clicks: 0,
        donations: 0,
        openRate: "0%",
        clickRate: "0%",
        revenue: 0,
        topSegments: [],
        topContacts: [],
        campaignBreakdown: [],
      };
    }

    // Get analytics for each campaign
    const campaignAnalytics = await Promise.all(
      campaigns.map(async (campaign) => {
        try {
          const analytics = await getOutreachAnalytics(
            campaign.campaignId,
            organizerId
          );
          // Normalize keys expected for organizer aggregation
          const normalized = {
            emailsSent: analytics.totalSends || analytics.emailsSent || 0,
            opens: analytics.totalOpens || analytics.opens || 0,
            clicks: analytics.totalClicks || analytics.clicks || 0,
            donations: analytics.totalDonations || analytics.donations || 0,
            revenue: analytics.totalDonationAmount || analytics.revenue || 0,
            outreachCampaigns: analytics.outreachCampaigns || 0,
            bySegment: analytics.bySegment || null,
            byContact: analytics.byContact || null,
          };

          return {
            campaignId: campaign.campaignId,
            campaignName: campaign.name,
            ...normalized,
          };
        } catch (error) {
          logger.warn("Failed to get analytics for campaign", {
            campaignId: campaign.campaignId,
            error: error.message,
          });
          return {
            campaignId: campaign.campaignId,
            campaignName: campaign.name,
            emailsSent: 0,
            opens: 0,
            clicks: 0,
            donations: 0,
            revenue: 0,
          };
        }
      })
    );

    // Aggregate data across all campaigns
    const aggregated = campaignAnalytics.reduce(
      (acc, campaign) => {
        acc.emailsSent += campaign.emailsSent || 0;
        acc.opens += campaign.opens || 0;
        acc.clicks += campaign.clicks || 0;
        acc.donations += campaign.donations || 0;
        acc.revenue += campaign.revenue || 0;
        acc.outreachCampaigns += campaign.outreachCampaigns || 0;
        return acc;
      },
      {
        emailsSent: 0,
        opens: 0,
        clicks: 0,
        donations: 0,
        revenue: 0,
        outreachCampaigns: 0,
      }
    );

    // Calculate rates
    const openRate =
      aggregated.emailsSent > 0
        ? ((aggregated.opens / aggregated.emailsSent) * 100).toFixed(1) + "%"
        : "0%";

    const clickRate =
      aggregated.emailsSent > 0
        ? ((aggregated.clicks / aggregated.emailsSent) * 100).toFixed(1) + "%"
        : "0%";

    // Get top segments across all campaigns
    const allSegments = {};
    campaignAnalytics.forEach((campaign) => {
      if (campaign.bySegment) {
        Object.entries(campaign.bySegment).forEach(([segmentId, data]) => {
          const segmentName = data.segmentName || data.name || "Segment";
          const clicks = data.clicks || data.totalClicks || 0;
          const opens = data.opens || data.totalOpens || 0;
          if (!allSegments[segmentId]) {
            allSegments[segmentId] = {
              segmentId,
              name: segmentName,
              clicks: 0,
              opens: 0,
            };
          }
          allSegments[segmentId].clicks += clicks;
          allSegments[segmentId].opens += opens;
        });
      }
    });

    const topSegments = Object.values(allSegments)
      .sort((a, b) => b.clicks + b.opens - (a.clicks + a.opens))
      .slice(0, 5);

    // Get top contacts across all campaigns
    const allContacts = {};
    campaignAnalytics.forEach((campaign) => {
      if (campaign.byContact) {
        Object.entries(campaign.byContact).forEach(([contactId, data]) => {
          const name = data.contactName || data.name || data.email || "Contact";
          const email = data.contactEmail || data.email || null;
          const clicks = data.clicks || data.totalClicks || 0;
          const opens = data.opens || data.totalOpens || 0;
          if (!allContacts[contactId]) {
            allContacts[contactId] = {
              contactId,
              name,
              email,
              clicks: 0,
              opens: 0,
            };
          }
          allContacts[contactId].clicks += clicks;
          allContacts[contactId].opens += opens;
        });
      }
    });

    const topContacts = Object.values(allContacts)
      .sort((a, b) => b.clicks + b.opens - (a.clicks + a.opens))
      .slice(0, 5);

    // Campaign breakdown
    const campaignBreakdown = campaignAnalytics
      .filter((campaign) => campaign.emailsSent > 0)
      .sort((a, b) => b.emailsSent - a.emailsSent)
      .slice(0, 10);

    const analytics = {
      emailsSent: aggregated.emailsSent,
      opens: aggregated.opens,
      clicks: aggregated.clicks,
      donations: aggregated.donations,
      openRate,
      clickRate,
      revenue: aggregated.revenue,
      outreachCampaigns: aggregated.outreachCampaigns,
      topSegments,
      topContacts,
      campaignBreakdown,
    };

    logger.info("Organizer analytics retrieved successfully", {
      organizerId,
      totalCampaigns: campaigns.length,
      totalEmailsSent: analytics.emailsSent,
      totalRevenue: analytics.revenue,
    });

    return analytics;
  } catch (error) {
    logger.error("Failed to get organizer analytics", {
      error: error.message,
      organizerId,
    });

    throw new Error("Failed to get organizer analytics");
  }
};

/**
 * Delete outreach link token
 * @param {string} linkTokenId - Link token ID
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteOutreachLinkToken = async (linkTokenId, organizerId) => {
  try {
    const result = await deleteLinkToken(linkTokenId, organizerId);

    logger.info("Outreach link token deleted successfully", {
      linkTokenId,
      organizerId,
    });

    return result;
  } catch (error) {
    logger.error("Failed to delete outreach link token", {
      error: error.message,
      linkTokenId,
      organizerId,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new Error("Failed to delete outreach link token");
  }
};

/**
 * Send outreach invitations for a specific outreach campaign
 * @param {Object} invitationData - Invitation data
 * @param {string} outreachCampaignId - Outreach campaign ID
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Object>} Invitation sending result
 */
export const sendOutreachInvitations = async (
  invitationData,
  outreachCampaignId,
  organizerId
) => {
  try {
    const { campaignId, recipients, message, prefillAmount, utmParams } =
      invitationData;

    // Verify outreach campaign exists and belongs to organizer
    const outreachCampaign = await getOutreachCampaignById(
      outreachCampaignId,
      organizerId
    );
    if (!outreachCampaign) {
      throw new NotFoundError("Outreach campaign not found");
    }

    // Verify campaign exists and belongs to organizer
    const campaign = await findCampaignById(campaignId);
    if (!campaign || campaign.organizerId !== organizerId) {
      throw new NotFoundError("Campaign not found");
    }

    // Get organizer details
    const organizer = await getUserById(organizerId);
    if (!organizer) {
      throw new NotFoundError("Organizer not found");
    }

    const results = [];

    // Send invitations to each recipient
    for (const recipient of recipients) {
      let linkToken;
      try {
        // Create link token for this recipient with outreachCampaignId
        const linkTokenData = {
          campaignId,
          contactId: recipient.contactId,
          segmentId: null,
          type: "invite",
          personalizedMessage: message,
          prefillAmount,
          utmSource: utmParams?.utmSource || "outreach",
          utmMedium: utmParams?.utmMedium || "email",
          utmCampaign: utmParams?.utmCampaign || outreachCampaign.name,
          utmContent: utmParams?.utmContent || "invite",
          outreachCampaignId,
        };

        linkToken = await createLinkToken(linkTokenData, organizerId);

        // Generate tracking URL
        const trackingUrl = generateTrackingLink(
          `${process.env.FRONTEND_URL}/campaign/${campaign.shareLink}-${(
            campaign.name || ""
          )
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .slice(0, 80)}`,
          linkToken.linkTokenId,
          {
            utm_source: linkToken.utmSource,
            utm_medium: linkToken.utmMedium,
            utm_campaign: linkToken.utmCampaign,
            utm_content: linkToken.utmContent,
          }
        );

        // Create invitation email template
        const templateData = {
          organizerName: organizer.name || organizer.email,
          campaignTitle: campaign.name,
          campaignDescription: campaign.description,
          trackedLink: trackingUrl,
          personalizedMessage: message,
          prefillAmount,
          linkTokenId: linkToken.linkTokenId,
        };

        const emailHtml = createInvitationTemplate(templateData);
        const subject = `${
          organizer.name || organizer.email
        } invites you to support: ${campaign.name}`;

        // Validate email before sending to avoid transporter EENVELOPE
        const toEmail = (recipient.email || "").trim();
        if (!/.+@.+\..+/.test(toEmail)) {
          throw new Error("Invalid or missing recipient email");
        }

        // Send email (positional args as defined in email.utils)
        await sendOutreachEmail(toEmail, subject, emailHtml, {
          linkTokenId: linkToken.linkTokenId,
          contactId: recipient.contactId,
        });

        // Mark recipient as sent
        await markRecipientSendResultByCampaignContact(
          outreachCampaignId,
          recipient.contactId,
          { status: "sent", failureReason: null }
        );

        // Record sent event
        await recordEmailEvent({
          linkTokenId: linkToken.linkTokenId,
          contactId: recipient.contactId,
          type: "sent",
          userAgent: null,
          ipAddress: null,
        });

        results.push({
          contactId: recipient.contactId,
          email: recipient.email,
          linkTokenId: linkToken.linkTokenId,
          status: "sent",
        });

        logger.info("Outreach invitation sent successfully", {
          outreachCampaignId,
          contactId: recipient.contactId,
          linkTokenId: linkToken.linkTokenId,
        });
      } catch (error) {
        logger.error("Failed to send invitation to contact", {
          outreachCampaignId,
          contactId: recipient.contactId,
          error: error.message,
        });

        results.push({
          contactId: recipient.contactId,
          email: recipient.email,
          status: "failed",
          error: error.message,
        });

        // Mark recipient as failed
        try {
          await markRecipientSendResultByCampaignContact(
            outreachCampaignId,
            recipient.contactId,
            { status: "failed", failureReason: error.message }
          );
        } catch (e) {
          logger.error("Failed to mark recipient as failed", { e: e.message });
        }

        // Compensate: delete link token if created but email failed
        try {
          if (linkToken?.linkTokenId) {
            await deleteLinkTokenUnsafe(linkToken.linkTokenId);
          }
        } catch (e) {}
      }
    }

    const result = {
      outreachCampaignId,
      campaignId,
      totalRecipients: recipients.length,
      successful: results.filter((r) => r.status === "sent").length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
    };

    // Refresh stats asynchronously (don't wait for it)
    refreshStatsForOutreachCampaign(outreachCampaignId).catch((error) => {
      logger.error("Failed to refresh stats after sending invitations", {
        error: error.message,
        outreachCampaignId,
      });
    });

    return result;
  } catch (error) {
    logger.error("Failed to send outreach invitations", {
      outreachCampaignId,
      error: error.message,
    });

    if (
      error instanceof NotFoundError ||
      error instanceof ValidationError ||
      error instanceof ConflictError
    ) {
      throw error;
    }

    throw new Error("Failed to send outreach invitations");
  }
};

/**
 * Send outreach updates to targeted recipients based on engagement
 * @param {Object} updateData - Update email data
 * @param {string} outreachCampaignId - Outreach campaign ID
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Object>} Update results
 */
export const sendOutreachUpdates = async (
  updateData,
  outreachCampaignId,
  organizerId
) => {
  try {
    const { message, utmParams, targetAudience } = updateData;

    // Verify outreach campaign exists and belongs to organizer
    const outreachCampaign = await getOutreachCampaignById(
      outreachCampaignId,
      organizerId
    );
    if (!outreachCampaign) {
      throw new NotFoundError("Outreach campaign not found");
    }

    // Verify campaign exists and belongs to organizer
    const campaign = await findCampaignById(outreachCampaign.campaignId);
    if (!campaign || campaign.organizerId !== organizerId) {
      throw new NotFoundError("Campaign not found");
    }

    // Get organizer details
    const organizer = await getUserById(organizerId);
    if (!organizer) {
      throw new NotFoundError("Organizer not found");
    }

    // Get target recipients based on engagement filters
    const recipients = await getTargetRecipientsForUpdates(
      outreachCampaignId,
      targetAudience
    );

    if (recipients.length === 0) {
      return {
        outreachCampaignId,
        campaignId: outreachCampaign.campaignId,
        totalRecipients: 0,
        successful: 0,
        failed: 0,
        results: [],
        message: "No recipients found for the selected target audience",
      };
    }

    const results = [];

    // Send updates to each recipient
    for (const recipient of recipients) {
      try {
        // Create link token for this recipient with outreachCampaignId
        const linkTokenData = {
          campaignId: outreachCampaign.campaignId,
          contactId: recipient.contactId,
          segmentId: null,
          type: "update",
          personalizedMessage: message,
          prefillAmount: null,
          utmSource: utmParams?.utmSource || "outreach",
          utmMedium: utmParams?.utmMedium || "email",
          utmCampaign: utmParams?.utmCampaign || outreachCampaign.name,
          utmContent: utmParams?.utmContent || "update",
          outreachCampaignId,
        };

        const linkToken = await createLinkToken(linkTokenData, organizerId);

        // Generate tracking URL
        const trackingUrl = generateTrackingLink(
          `${process.env.FRONTEND_URL}/campaign/${campaign.shareLink}-${(
            campaign.name || ""
          )
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .slice(0, 80)}`,
          linkToken.linkTokenId,
          {
            utm_source: linkToken.utmSource,
            utm_medium: linkToken.utmMedium,
            utm_campaign: linkToken.utmCampaign,
            utm_content: linkToken.utmContent,
          }
        );

        // Create update email template
        const templateData = {
          organizerName: organizer.name || organizer.email,
          campaignTitle: campaign.name,
          campaignDescription: campaign.description,
          trackedLink: trackingUrl,
          personalizedMessage: message,
          linkTokenId: linkToken.linkTokenId,
        };

        const emailHtml = createUpdateTemplate(templateData);
        const subject = `Update on ${campaign.name} - ${
          organizer.name || organizer.email
        }`;

        // Send email
        await sendOutreachEmail({
          to: recipient.email,
          subject,
          html: emailHtml,
          linkTokenId: linkToken.linkTokenId,
        });

        // Record sent event
        await recordEmailEvent({
          linkTokenId: linkToken.linkTokenId,
          contactId: recipient.contactId,
          type: "sent",
          userAgent: null,
          ipAddress: null,
        });

        results.push({
          contactId: recipient.contactId,
          email: recipient.email,
          linkTokenId: linkToken.linkTokenId,
          status: "sent",
        });

        logger.info("Outreach update sent successfully", {
          outreachCampaignId,
          contactId: recipient.contactId,
          linkTokenId: linkToken.linkTokenId,
        });
      } catch (error) {
        logger.error("Failed to send update to contact", {
          outreachCampaignId,
          contactId: recipient.contactId,
          error: error.message,
        });

        results.push({
          contactId: recipient.contactId,
          email: recipient.email,
          status: "failed",
          error: error.message,
        });
      }
    }

    const result = {
      outreachCampaignId,
      campaignId: outreachCampaign.campaignId,
      totalRecipients: recipients.length,
      successful: results.filter((r) => r.status === "sent").length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
    };

    // Refresh stats asynchronously (don't wait for it)
    refreshStatsForOutreachCampaign(outreachCampaignId).catch((error) => {
      logger.error("Failed to refresh stats after sending updates", {
        error: error.message,
        outreachCampaignId,
      });
    });

    return result;
  } catch (error) {
    logger.error("Failed to send outreach updates", {
      outreachCampaignId,
      error: error.message,
    });

    if (
      error instanceof NotFoundError ||
      error instanceof ValidationError ||
      error instanceof ConflictError
    ) {
      throw error;
    }

    throw new Error("Failed to send outreach updates");
  }
};

/**
 * Send thank-you emails to donors only
 * @param {Object} thankYouData - Thank-you email data
 * @param {string} outreachCampaignId - Outreach campaign ID
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Object>} Thank-you results
 */
export const sendOutreachThanks = async (
  thankYouData,
  outreachCampaignId,
  organizerId
) => {
  try {
    const { message, utmParams } = thankYouData;

    // Verify outreach campaign exists and belongs to organizer
    const outreachCampaign = await getOutreachCampaignById(
      outreachCampaignId,
      organizerId
    );
    if (!outreachCampaign) {
      throw new NotFoundError("Outreach campaign not found");
    }

    // Verify campaign exists and belongs to organizer
    const campaign = await findCampaignById(outreachCampaign.campaignId);
    if (!campaign || campaign.organizerId !== organizerId) {
      throw new NotFoundError("Campaign not found");
    }

    // Get organizer details
    const organizer = await getUserById(organizerId);
    if (!organizer) {
      throw new NotFoundError("Organizer not found");
    }

    // Get donors from this outreach campaign
    const donors = await getDonorsFromOutreachCampaign(outreachCampaignId);

    if (donors.length === 0) {
      return {
        outreachCampaignId,
        campaignId: outreachCampaign.campaignId,
        totalRecipients: 0,
        successful: 0,
        failed: 0,
        results: [],
        message: "No donors found for this outreach campaign",
      };
    }

    const results = [];

    // Send thank-you emails to each donor
    for (const donor of donors) {
      try {
        // Create link token for this donor with outreachCampaignId
        const linkTokenData = {
          campaignId: outreachCampaign.campaignId,
          contactId: donor.contactId,
          segmentId: null,
          type: "thanks",
          personalizedMessage: message,
          prefillAmount: null,
          utmSource: utmParams?.utmSource || "outreach",
          utmMedium: utmParams?.utmMedium || "email",
          utmCampaign: utmParams?.utmCampaign || outreachCampaign.name,
          utmContent: utmParams?.utmContent || "thanks",
          outreachCampaignId,
        };

        const linkToken = await createLinkToken(linkTokenData, organizerId);

        // Generate tracking URL
        const trackingUrl = generateTrackingLink(
          `${process.env.FRONTEND_URL}/campaign/${campaign.shareLink}-${(
            campaign.name || ""
          )
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .slice(0, 80)}`,
          linkToken.linkTokenId,
          {
            utm_source: linkToken.utmSource,
            utm_medium: linkToken.utmMedium,
            utm_campaign: linkToken.utmCampaign,
            utm_content: linkToken.utmContent,
          }
        );

        // Create thank-you email template
        const templateData = {
          organizerName: organizer.name || organizer.email,
          campaignTitle: campaign.name,
          donorName: donor.name || "Valued Supporter",
          donationAmount: donor.totalDonated,
          trackedLink: trackingUrl,
          personalizedMessage: message,
          linkTokenId: linkToken.linkTokenId,
        };

        const emailHtml = createThankYouTemplate(templateData);
        const subject = `Thank you for supporting ${campaign.name}!`;

        // Send email
        await sendOutreachEmail({
          to: donor.email,
          subject,
          html: emailHtml,
          linkTokenId: linkToken.linkTokenId,
        });

        // Record sent event
        await recordEmailEvent({
          linkTokenId: linkToken.linkTokenId,
          contactId: donor.contactId,
          type: "sent",
          userAgent: null,
          ipAddress: null,
        });

        results.push({
          contactId: donor.contactId,
          email: donor.email,
          linkTokenId: linkToken.linkTokenId,
          status: "sent",
        });

        logger.info("Outreach thank-you sent successfully", {
          outreachCampaignId,
          contactId: donor.contactId,
          linkTokenId: linkToken.linkTokenId,
        });
      } catch (error) {
        logger.error("Failed to send thank-you to donor", {
          outreachCampaignId,
          contactId: donor.contactId,
          error: error.message,
        });

        results.push({
          contactId: donor.contactId,
          email: donor.email,
          status: "failed",
          error: error.message,
        });
      }
    }

    const result = {
      outreachCampaignId,
      campaignId: outreachCampaign.campaignId,
      totalRecipients: donors.length,
      successful: results.filter((r) => r.status === "sent").length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
    };

    // Refresh stats asynchronously (don't wait for it)
    refreshStatsForOutreachCampaign(outreachCampaignId).catch((error) => {
      logger.error("Failed to refresh stats after sending thank-yous", {
        error: error.message,
        outreachCampaignId,
      });
    });

    return result;
  } catch (error) {
    logger.error("Failed to send outreach thank-yous", {
      outreachCampaignId,
      error: error.message,
    });

    if (
      error instanceof NotFoundError ||
      error instanceof ValidationError ||
      error instanceof ConflictError
    ) {
      throw error;
    }

    throw new Error("Failed to send outreach thank-yous");
  }
};

/**
 * Get target recipients for updates based on engagement filters
 * @param {string} outreachCampaignId - Outreach campaign ID
 * @param {string} targetAudience - Target audience filter
 * @returns {Promise<Array>} Target recipients
 */
const getTargetRecipientsForUpdates = async (
  outreachCampaignId,
  targetAudience
) => {
  try {
    // Get all link tokens for this outreach campaign
    const linkTokens = await getLinkTokensByOutreachCampaign(
      outreachCampaignId
    );

    if (linkTokens.length === 0) {
      return [];
    }

    const recipients = [];

    for (const linkToken of linkTokens) {
      // Get contact details
      const contact = await getContactById(linkToken.contactId);
      if (!contact) continue;

      // Get engagement data for this contact
      const engagement = await getContactEngagementData(
        linkToken.linkTokenId,
        linkToken.contactId
      );

      let shouldInclude = false;

      switch (targetAudience) {
        case "all":
          shouldInclude = true;
          break;
        case "opened-not-clicked":
          shouldInclude = engagement.hasOpened && !engagement.hasClicked;
          break;
        case "clicked-not-donated":
          shouldInclude = engagement.hasClicked && !engagement.hasDonated;
          break;
        case "donated":
          shouldInclude = engagement.hasDonated;
          break;
        default:
          shouldInclude = true;
      }

      if (shouldInclude) {
        recipients.push({
          contactId: contact.contactId,
          email: contact.email,
          name: contact.name,
          engagement,
        });
      }
    }

    return recipients;
  } catch (error) {
    logger.error("Failed to get target recipients for updates", {
      outreachCampaignId,
      targetAudience,
      error: error.message,
    });
    return [];
  }
};

/**
 * Get donors from outreach campaign
 * @param {string} outreachCampaignId - Outreach campaign ID
 * @returns {Promise<Array>} Donors with their details
 */
const getDonorsFromOutreachCampaign = async (outreachCampaignId) => {
  try {
    // Get all link tokens for this outreach campaign
    const linkTokens = await getLinkTokensByOutreachCampaign(
      outreachCampaignId
    );

    if (linkTokens.length === 0) {
      return [];
    }

    const donors = [];
    const processedContacts = new Set();

    for (const linkToken of linkTokens) {
      if (processedContacts.has(linkToken.contactId)) continue;

      // Get contact details
      const contact = await getContactById(linkToken.contactId);
      if (!contact) continue;

      // Get donation data for this contact
      const donations = await getDonationsByContact(
        linkToken.contactId,
        linkToken.campaignId
      );

      if (donations && donations.length > 0) {
        const totalDonated = donations.reduce(
          (sum, donation) => sum + (donation.amount || 0),
          0
        );

        donors.push({
          contactId: contact.contactId,
          email: contact.email,
          name: contact.name,
          totalDonated,
          donationCount: donations.length,
        });

        processedContacts.add(linkToken.contactId);
      }
    }

    return donors;
  } catch (error) {
    logger.error("Failed to get donors from outreach campaign", {
      outreachCampaignId,
      error: error.message,
    });
    return [];
  }
};

/**
 * Get contact engagement data for a specific link token
 * @param {string} linkTokenId - Link token ID
 * @param {string} contactId - Contact ID
 * @returns {Promise<Object>} Engagement data
 */
const getContactEngagementData = async (linkTokenId, contactId) => {
  try {
    // Get email events for this link token and contact
    const events = await getEmailEventsByLinkTokenAndContact(
      linkTokenId,
      contactId
    );

    const hasOpened = events.some((event) => event.type === "open");
    const hasClicked = events.some((event) => event.type === "click");

    // Check if this contact has donated (via donations table)
    const donations = await getDonationsByContact(contactId);
    const hasDonated = donations && donations.length > 0;

    return {
      hasOpened,
      hasClicked,
      hasDonated,
      events,
    };
  } catch (error) {
    logger.error("Failed to get contact engagement data", {
      linkTokenId,
      contactId,
      error: error.message,
    });
    return {
      hasOpened: false,
      hasClicked: false,
      hasDonated: false,
      events: [],
    };
  }
};
