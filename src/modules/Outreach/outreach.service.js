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
  deleteLinkToken,
} from "./linkTokens/linkToken.repository.js";
import {
  recordEmailEvent,
  getEmailEventStatsByCampaign,
} from "./emailEvents/emailEvent.repository.js";
import { sendOutreachEmail } from "../../utils/email.utils.js";
import {
  createInvitationTemplate,
  createUpdateTemplate,
  createThankYouTemplate,
  generateTrackingLink,
} from "../../utils/emailTemplates.js";
import { getContactById } from "./contacts/contact.repository.js";
import { getSegmentById } from "./segments/segment.repository.js";
import { findCampaignById } from "../campaign/campaigns/campaign.repository.js";
import { getUserById } from "../users/user.service.js";
import {
  getDonationAttributionStats,
  getDonationsByContact,
} from "../donor/donation/donation.repository.js";
import { getSocialMediaStats } from "./socialMedia/socialMedia.service.js";
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

    // Verify segment exists if provided
    if (segmentId) {
      const segment = await getSegmentById(segmentId, organizerId);
      if (!segment) {
        throw new NotFoundError("Segment not found");
      }
    }

    // Create link token
    const linkToken = await createLinkToken(linkTokenData, organizerId);

    // Generate tracking URL
    const trackingUrl = generateTrackingLink(
      `${process.env.FRONTEND_URL}/campaigns/${campaignId}`,
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

    // Get recipients based on contact or segment
    if (contactId) {
      const contact = await getContactById(contactId, organizerId);
      if (!contact) {
        throw new NotFoundError("Contact not found");
      }
      recipients = [contact];
    } else if (segmentId) {
      // Get all contacts in segment
      const segment = await getSegmentById(segmentId, organizerId);
      if (!segment) {
        throw new NotFoundError("Segment not found");
      }
      // Note: This would need a repository method to get contacts by segment
      // For now, we'll handle individual contacts
      throw new ValidationError("Segment email sending not yet implemented");
    } else {
      throw new ValidationError(
        "Either contact ID or segment ID must be provided"
      );
    }

    const results = [];

    // Send emails to each recipient
    for (const recipient of recipients) {
      try {
        // Create link token for this recipient
        const linkTokenData = {
          campaignId,
          contactId: recipient.contactId,
          type,
          personalizedMessage,
          prefillAmount,
          utmSource: utmParams?.utmSource,
          utmMedium: utmParams?.utmMedium,
          utmCampaign: utmParams?.utmCampaign,
          utmContent: utmParams?.utmContent,
        };

        const linkToken = await createLinkToken(linkTokenData, organizerId);

        // Generate tracking URL
        const trackingUrl = generateTrackingLink(
          `${process.env.FRONTEND_URL}/campaigns/${campaignId}`,
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
          campaignTitle: campaign.title,
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
            } invites you to support: ${campaign.title}`;
            break;
          case "update":
            emailHtml = createUpdateTemplate(templateData);
            subject = `Update from ${organizer.name || organizer.email}: ${
              campaign.title
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

    // Get email event statistics
    const emailStats = await getEmailEventStatsByCampaign(campaignId);

    // Get donation attribution statistics
    const donationStats = await getDonationAttributionStats(
      campaignId,
      organizerId
    );

    // Get social media statistics
    const socialMediaStats = await getSocialMediaStats(campaignId, organizerId);

    // Calculate analytics
    const analytics = {
      campaignId,
      totalLinkTokens: linkTokens.length,
      totalClicks: linkTokens.reduce(
        (sum, token) => sum + token.clicksCount,
        0
      ),
      totalOpens: emailStats.opens || 0,
      totalSends: emailStats.sends || 0,
      totalDonations: donationStats.totalDonations || 0,
      totalDonationAmount: donationStats.totalAmount || 0,
      totalSocialShares: socialMediaStats.totalSocialShares || 0,
      totalSocialClicks: socialMediaStats.totalSocialClicks || 0,
      openRate:
        emailStats.sends > 0
          ? (((emailStats.opens || 0) / emailStats.sends) * 100).toFixed(2)
          : 0,
      clickRate:
        emailStats.sends > 0
          ? (
              (linkTokens.reduce((sum, token) => sum + token.clicksCount, 0) /
                emailStats.sends) *
              100
            ).toFixed(2)
          : 0,
      conversionRate:
        emailStats.sends > 0
          ? (
              ((donationStats.totalDonations || 0) / emailStats.sends) *
              100
            ).toFixed(2)
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
      donationAttribution: donationStats,
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
