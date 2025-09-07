/**
 * Social Media Service Layer
 *
 * Handles social media sharing functionality including
 * link generation, UTM parameter management, and tracking.
 *
 * Key Features:
 * - Social media link generation for multiple platforms
 * - UTM parameter management
 * - Link tracking and analytics
 * - Campaign-specific sharing optimization
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { findCampaignById } from "../../campaign/campaigns/campaign.repository.js";
import {
  createLinkToken,
  getLinkTokensByCampaign,
} from "../linkTokens/linkToken.repository.js";
import { generateTrackingLink } from "../../../utils/emailTemplates.js";
import { NotFoundError, ValidationError } from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";

/**
 * Generate social media sharing links for a campaign
 * @param {string} campaignId - Campaign ID
 * @param {string} organizerId - Organizer ID
 * @param {Object} options - Sharing options
 * @returns {Promise<Object>} Social media links with tracking
 */
export const generateSocialMediaLinks = async (
  campaignId,
  organizerId,
  options = {}
) => {
  try {
    // Verify campaign exists and belongs to organizer
    const campaign = await findCampaignById(campaignId);
    if (!campaign || campaign.organizerId !== organizerId) {
      throw new NotFoundError("Campaign not found");
    }

    const {
      platform = "all",
      customMessage = "",
      includeImage = true,
      utmSource = "social_media",
      utmMedium = "social",
    } = options;

    const baseUrl = `${process.env.FRONTEND_URL}/campaign/${
      campaign.shareLink
    }-${(campaign.name || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 80)}`;
    const campaignTitle = encodeURIComponent(campaign.title);
    const campaignDescription = encodeURIComponent(
      campaign.description?.substring(0, 100) || ""
    );

    const socialLinks = {};

    // Generate platform-specific links
    if (platform === "all" || platform === "whatsapp") {
      const whatsappMessage = customMessage
        ? `${customMessage}\n\n${campaign.title}\n${baseUrl}`
        : `Check out this amazing campaign: ${campaign.title}\n${baseUrl}`;

      socialLinks.whatsapp = {
        url: `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`,
        platform: "whatsapp",
        type: "share",
        trackingUrl: await createTrackingLink(
          campaignId,
          organizerId,
          "whatsapp",
          utmSource,
          utmMedium,
          "whatsapp_share"
        ),
      };
    }

    if (platform === "all" || platform === "facebook") {
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        baseUrl
      )}`;

      socialLinks.facebook = {
        url: facebookUrl,
        platform: "facebook",
        type: "share",
        trackingUrl: await createTrackingLink(
          campaignId,
          organizerId,
          "facebook",
          utmSource,
          utmMedium,
          "facebook_share"
        ),
      };
    }

    if (platform === "all" || platform === "twitter") {
      const twitterMessage = customMessage
        ? `${customMessage} ${campaign.title}`
        : `Check out this campaign: ${campaign.title}`;
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        twitterMessage
      )}&url=${encodeURIComponent(baseUrl)}`;

      socialLinks.twitter = {
        url: twitterUrl,
        platform: "twitter",
        type: "share",
        trackingUrl: await createTrackingLink(
          campaignId,
          organizerId,
          "twitter",
          utmSource,
          utmMedium,
          "twitter_share"
        ),
      };
    }

    if (platform === "all" || platform === "linkedin") {
      const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        baseUrl
      )}`;

      socialLinks.linkedin = {
        url: linkedinUrl,
        platform: "linkedin",
        type: "share",
        trackingUrl: await createTrackingLink(
          campaignId,
          organizerId,
          "linkedin",
          utmSource,
          utmMedium,
          "linkedin_share"
        ),
      };
    }

    if (platform === "all" || platform === "telegram") {
      const telegramMessage = customMessage
        ? `${customMessage}\n\n${campaign.title}\n${baseUrl}`
        : `Check out this campaign: ${campaign.title}\n${baseUrl}`;

      socialLinks.telegram = {
        url: `https://t.me/share/url?url=${encodeURIComponent(
          baseUrl
        )}&text=${encodeURIComponent(telegramMessage)}`,
        platform: "telegram",
        type: "share",
        trackingUrl: await createTrackingLink(
          campaignId,
          organizerId,
          "telegram",
          utmSource,
          utmMedium,
          "telegram_share"
        ),
      };
    }

    logger.info("Social media links generated successfully", {
      campaignId,
      organizerId,
      platform,
      totalLinks: Object.keys(socialLinks).length,
    });

    return {
      campaignId,
      campaignTitle: campaign.title,
      baseUrl,
      socialLinks,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Failed to generate social media links", {
      error: error.message,
      campaignId,
      organizerId,
      options,
    });

    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }

    throw new Error("Failed to generate social media links");
  }
};

/**
 * Create a tracking link for social media sharing
 * @param {string} campaignId - Campaign ID
 * @param {string} organizerId - Organizer ID
 * @param {string} platform - Social media platform
 * @param {string} utmSource - UTM source parameter
 * @param {string} utmMedium - UTM medium parameter
 * @param {string} utmContent - UTM content parameter
 * @returns {Promise<string>} Tracking URL
 */
const createTrackingLink = async (
  campaignId,
  organizerId,
  platform,
  utmSource,
  utmMedium,
  utmContent
) => {
  try {
    // Ensure campaign exists to construct public share URL
    const campaign = await findCampaignById(campaignId);
    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }
    const linkTokenData = {
      campaignId,
      type: "share",
      utmSource,
      utmMedium,
      utmCampaign: `social_${platform}`,
      utmContent,
    };

    const linkToken = await createLinkToken(linkTokenData, organizerId);

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
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: `social_${platform}`,
        utm_content: utmContent,
      }
    );

    return trackingUrl;
  } catch (error) {
    logger.error("Failed to create tracking link for social media", {
      error: error.message,
      campaignId,
      organizerId,
      platform,
    });
    throw error;
  }
};

/**
 * Get social media sharing statistics for a campaign
 * @param {string} campaignId - Campaign ID
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Object>} Social media sharing statistics
 */
export const getSocialMediaStats = async (campaignId, organizerId) => {
  try {
    // Verify campaign exists and belongs to organizer
    const campaign = await findCampaignById(campaignId);
    if (!campaign || campaign.organizerId !== organizerId) {
      throw new NotFoundError("Campaign not found");
    }

    // Get link tokens for social media sharing
    const linkTokens = await getLinkTokensByCampaign(campaignId, organizerId);
    const socialShareTokens = linkTokens.filter(
      (token) => token.type === "share"
    );

    const stats = {
      campaignId,
      totalSocialShares: socialShareTokens.length,
      totalSocialClicks: socialShareTokens.reduce(
        (sum, token) => sum + token.clicksCount,
        0
      ),
      byPlatform: {},
      topPerformingPlatforms: [],
    };

    // Group by platform
    socialShareTokens.forEach((token) => {
      const platform = token.utmCampaign?.replace("social_", "") || "unknown";

      if (!stats.byPlatform[platform]) {
        stats.byPlatform[platform] = {
          shares: 0,
          clicks: 0,
          clickRate: 0,
        };
      }

      stats.byPlatform[platform].shares++;
      stats.byPlatform[platform].clicks += token.clicksCount;
    });

    // Calculate click rates
    Object.keys(stats.byPlatform).forEach((platform) => {
      const platformStats = stats.byPlatform[platform];
      platformStats.clickRate =
        platformStats.shares > 0
          ? ((platformStats.clicks / platformStats.shares) * 100).toFixed(2)
          : 0;
    });

    // Get top performing platforms
    stats.topPerformingPlatforms = Object.entries(stats.byPlatform)
      .sort(([, a], [, b]) => b.clickRate - a.clickRate)
      .slice(0, 3)
      .map(([platform, data]) => ({
        platform,
        clickRate: data.clickRate,
        clicks: data.clicks,
      }));

    logger.info("Social media stats retrieved successfully", {
      campaignId,
      organizerId,
      totalSocialShares: stats.totalSocialShares,
    });

    return stats;
  } catch (error) {
    logger.error("Failed to get social media stats", {
      error: error.message,
      campaignId,
      organizerId,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new Error("Failed to get social media stats");
  }
};
