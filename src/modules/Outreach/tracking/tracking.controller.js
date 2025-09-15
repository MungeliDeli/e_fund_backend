/**
 * Tracking Controller
 *
 * Handles tracking endpoints for email opens (pixel) and link clicks.
 * Records tracking events and provides redirects for click tracking.
 *
 * Key Features:
 * - Pixel tracking for email opens
 * - Click tracking with redirects
 * - Event recording and logging
 * - Rate limiting and abuse prevention
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { incrementClickCount } from "../linkTokens/linkToken.repository.js";
import { recordEmailEvent } from "../emailEvents/emailEvent.repository.js";
import { getLinkTokenById } from "../linkTokens/linkToken.repository.js";
import { refreshStatsForOutreachCampaign } from "../outreachCampaign/outreachCampaignStatsRefresh.service.js";
import logger from "../../../utils/logger.js";
import { NotFoundError } from "../../../utils/appError.js";
import {
  markRecipientOpenedByLinkToken,
  markRecipientClickedByLinkToken,
} from "../outreachCampaign/outreachCampaignRecipients.repository.js";

/**
 * Generate a 1x1 transparent PNG pixel for email tracking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const generateTrackingPixel = async (req, res) => {
  const { linkTokenId } = req.params;
  const userAgent = req.get("User-Agent");
  const ipAddress = req.ip;

  try {
    // Verify link token exists
    const linkToken = await getLinkTokenById(linkTokenId, null); // No organizer check for public tracking

    // Record email open event
    const openEvent = await recordEmailEvent({
      linkTokenId,
      contactId: linkToken.contactId,
      type: "open",
      userAgent,
      ipAddress,
    });
    // Sync recipients table
    try {
      await markRecipientOpenedByLinkToken(linkTokenId, linkToken.contactId);
    } catch (e) {
      logger.error("Failed to mark recipient opened", { e: e.message });
    }

    logger.info("Email open tracked successfully", {
      linkTokenId,
      contactId: linkToken.contactId,
      ipAddress,
    });

    // Refresh stats asynchronously if this is a new open event
    if (openEvent && linkToken.outreachCampaignId) {
      refreshStatsForOutreachCampaign(linkToken.outreachCampaignId).catch(
        (error) => {
          logger.error("Failed to refresh stats after email open", {
            error: error.message,
            outreachCampaignId: linkToken.outreachCampaignId,
          });
        }
      );
    }

    // Generate 1x1 transparent PNG
    const pixelData = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64"
    );

    res.set({
      "Content-Type": "image/png",
      "Content-Length": pixelData.length,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    res.send(pixelData);
  } catch (error) {
    logger.error("Failed to generate tracking pixel", {
      error: error.message,
      linkTokenId,
      ipAddress,
    });

    // Return transparent pixel even on error to avoid breaking email display
    const pixelData = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64"
    );

    res.set({
      "Content-Type": "image/png",
      "Content-Length": pixelData.length,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    });

    res.send(pixelData);
  }
};

/**
 * Handle click tracking with redirect
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const handleClickTracking = async (req, res) => {
  const { linkTokenId } = req.params;
  const { redirect } = req.query;
  const userAgent = req.get("User-Agent");
  const ipAddress = req.ip;

  try {
    // Verify link token exists
    const linkToken = await getLinkTokenById(linkTokenId, null); // No organizer check for public tracking

    // Record click event (only if first time for this recipient)
    const clickEvent = await recordEmailEvent({
      linkTokenId,
      contactId: linkToken.contactId,
      type: "click",
      userAgent,
      ipAddress,
    });

    // Only increment click count if this is a new click event
    if (clickEvent) {
      await incrementClickCount(linkTokenId);
      // Sync recipients table
      try {
        await markRecipientClickedByLinkToken(linkTokenId, linkToken.contactId);
      } catch (e) {
        logger.error("Failed to mark recipient clicked", { e: e.message });
      }
    }

    logger.info("Link click tracked successfully", {
      linkTokenId,
      contactId: linkToken.contactId,
      ipAddress,
      redirectUrl: redirect,
      isNewClick: !!clickEvent,
    });

    // Refresh stats asynchronously if this is a new click event
    if (clickEvent && linkToken.outreachCampaignId) {
      refreshStatsForOutreachCampaign(linkToken.outreachCampaignId).catch(
        (error) => {
          logger.error("Failed to refresh stats after email click", {
            error: error.message,
            outreachCampaignId: linkToken.outreachCampaignId,
          });
        }
      );
    }

    // Build redirect URL with UTM parameters
    let finalRedirectUrl = redirect;
    // If no explicit redirect provided, fall back to public share URL if available
    if (!finalRedirectUrl) {
      // Attempt to use share slug if present on token (requires repository join in future)
      // Fallback to organizer route by id only as last resort
      finalRedirectUrl = `${process.env.FRONTEND_URL}`;
    }

    // Add UTM parameters if they exist
    const utmParams = new URLSearchParams();
    if (linkToken.utmSource)
      utmParams.append("utm_source", linkToken.utmSource);
    if (linkToken.utmMedium)
      utmParams.append("utm_medium", linkToken.utmMedium);
    if (linkToken.utmCampaign)
      utmParams.append("utm_campaign", linkToken.utmCampaign);
    if (linkToken.utmContent)
      utmParams.append("utm_content", linkToken.utmContent);

    // Add prefill parameters if they exist
    if (linkToken.prefillAmount)
      utmParams.append("prefillAmount", linkToken.prefillAmount);
    if (linkToken.personalizedMessage)
      utmParams.append("message", linkToken.personalizedMessage);

    // Include attribution identifiers for frontend (lt = linkTokenId, cid = contactId)
    utmParams.append("lt", linkToken.linkTokenId || linkTokenId);
    if (linkToken.contactId) utmParams.append("cid", linkToken.contactId);

    // Append parameters to redirect URL
    if (utmParams.toString()) {
      const separator = finalRedirectUrl.includes("?") ? "&" : "?";
      finalRedirectUrl += `${separator}${utmParams.toString()}`;
    }

    // Redirect to final URL
    res.redirect(302, finalRedirectUrl);
  } catch (error) {
    logger.error("Failed to handle click tracking", {
      error: error.message,
      linkTokenId,
      ipAddress,
      redirect,
    });

    // Fallback redirect to frontend
    const fallbackUrl = redirect || `${process.env.FRONTEND_URL}`;
    res.redirect(302, fallbackUrl);
  }
};
