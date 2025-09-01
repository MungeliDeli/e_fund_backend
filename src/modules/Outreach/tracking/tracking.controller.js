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
import logger from "../../../utils/logger.js";
import { NotFoundError } from "../../../utils/appError.js";

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
    await recordEmailEvent({
      linkTokenId,
      contactId: linkToken.contactId,
      type: "open",
      userAgent,
      ipAddress,
    });

    logger.info("Email open tracked successfully", {
      linkTokenId,
      contactId: linkToken.contactId,
      ipAddress,
    });

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

    // Increment click count
    await incrementClickCount(linkTokenId);

    // Record click event
    await recordEmailEvent({
      linkTokenId,
      contactId: linkToken.contactId,
      type: "click",
      userAgent,
      ipAddress,
    });

    logger.info("Link click tracked successfully", {
      linkTokenId,
      contactId: linkToken.contactId,
      ipAddress,
      redirectUrl: redirect,
    });

    // Build redirect URL with UTM parameters
    let finalRedirectUrl =
      redirect ||
      `${process.env.FRONTEND_URL}/campaigns/${linkToken.campaignId}`;

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

    // Append UTM parameters to redirect URL
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
