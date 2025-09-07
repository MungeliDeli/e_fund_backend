/**
 * Email Templates Module
 *
 * Provides HTML email templates for outreach functionality including
 * campaign invitations, updates, and thank-you messages.
 *
 * TEMPLATE FEATURES:
 * - Responsive HTML design
 * - Tracking pixel integration
 * - Professional styling
 * - Dynamic content insertion
 * - Call-to-action buttons
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

const APP_NAME = process.env.APP_NAME || "FundFlow";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
// Base URL where tracking endpoints are hosted (backend). Defaults to local backend.
const TRACKING_BASE_URL =
  process.env.TRACKING_BASE_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:3000";

/**
 * Base email template wrapper
 * @param {string} content - Main content HTML
 * @param {string} linkTokenId - Link token ID for tracking pixel
 * @returns {string} Complete HTML email
 */
function createBaseTemplate(content, linkTokenId) {
  const trackingPixel = linkTokenId
    ? `<img src="${TRACKING_BASE_URL}/t/pixel/${linkTokenId}.png" alt="" width="1" height="1" style="display:none" />`
    : "";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${APP_NAME}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 30px 20px;
        }
        .message {
          margin-bottom: 25px;
          font-size: 16px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-decoration: none;
          padding: 15px 30px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          margin: 20px 0;
          text-align: center;
        }
        .cta-button:hover {
          background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          font-size: 14px;
          color: #666;
        }
        .personalized-message {
          background-color: #f8f9fa;
          border-left: 4px solid #667eea;
          padding: 15px;
          margin: 20px 0;
          font-style: italic;
        }
        .campaign-details {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .amount-highlight {
          font-size: 24px;
          font-weight: bold;
          color: #667eea;
        }
        @media (max-width: 600px) {
          .container {
            margin: 0;
            box-shadow: none;
          }
          .header {
            padding: 20px 15px;
          }
          .content {
            padding: 20px 15px;
          }
          .cta-button {
            display: block;
            margin: 20px 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${APP_NAME}</h1>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>This email was sent from ${APP_NAME}</p>
          <p>If you have any questions, please contact us</p>
        </div>
      </div>
      ${trackingPixel}
    </body>
    </html>
  `;
}

/**
 * Campaign invitation email template
 * @param {Object} data - Template data
 * @param {string} data.organizerName - Organizer's name
 * @param {string} data.campaignTitle - Campaign title
 * @param {string} data.campaignDescription - Campaign description
 * @param {string} data.trackedLink - Personalized tracking link
 * @param {string} data.personalizedMessage - Personalized message from organizer
 * @param {number} data.prefillAmount - Pre-filled donation amount
 * @param {string} data.linkTokenId - Link token ID for tracking
 * @returns {string} HTML email content
 */
export function createInvitationTemplate(data) {
  const {
    organizerName,
    campaignTitle,
    campaignDescription,
    trackedLink,
    personalizedMessage,
    prefillAmount,
    linkTokenId,
  } = data;

  const content = `
    <div class="message">
      <p>Hello!</p>
      <p>${organizerName} has invited you to support their fundraising campaign.</p>
    </div>

    <div class="campaign-details">
      <h2>${campaignTitle}</h2>
      <p>${campaignDescription}</p>
    </div>

    ${
      personalizedMessage
        ? `
      <div class="personalized-message">
        <p><strong>Personal message from ${organizerName}:</strong></p>
        <p>"${personalizedMessage}"</p>
      </div>
    `
        : ""
    }

    ${
      prefillAmount
        ? `
      <div class="message">
        <p>Suggested donation amount: <span class="amount-highlight">$${prefillAmount}</span></p>
      </div>
    `
        : ""
    }

    <div class="message">
      <p>Please click the button below to view the campaign and make a donation:</p>
    </div>

    <a href="${trackedLink}" class="cta-button">
      View Campaign & Donate
    </a>

    <div class="message">
      <p>Thank you for your support!</p>
      <p>Best regards,<br>The ${APP_NAME} Team</p>
    </div>
  `;

  return createBaseTemplate(content, linkTokenId);
}

/**
 * Campaign update email template
 * @param {Object} data - Template data
 * @param {string} data.organizerName - Organizer's name
 * @param {string} data.campaignTitle - Campaign title
 * @param {string} data.updateMessage - Update message content
 * @param {string} data.trackedLink - Personalized tracking link
 * @param {string} data.linkTokenId - Link token ID for tracking
 * @returns {string} HTML email content
 */
export function createUpdateTemplate(data) {
  const {
    organizerName,
    campaignTitle,
    updateMessage,
    trackedLink,
    linkTokenId,
  } = data;

  const content = `
    <div class="message">
      <p>Hello!</p>
      <p>${organizerName} has an update about their fundraising campaign.</p>
    </div>

    <div class="campaign-details">
      <h2>${campaignTitle}</h2>
    </div>

    <div class="personalized-message">
      <p><strong>Update from ${organizerName}:</strong></p>
      <p>${updateMessage}</p>
    </div>

    <div class="message">
      <p>Click below to see the latest progress and continue supporting this campaign:</p>
    </div>

    <a href="${trackedLink}" class="cta-button">
      View Campaign Updates
    </a>

    <div class="message">
      <p>Thank you for your continued support!</p>
      <p>Best regards,<br>The ${APP_NAME} Team</p>
    </div>
  `;

  return createBaseTemplate(content, linkTokenId);
}

/**
 * Thank you email template
 * @param {Object} data - Template data
 * @param {string} data.organizerName - Organizer's name
 * @param {string} data.campaignTitle - Campaign title
 * @param {string} data.donorName - Donor's name
 * @param {number} data.donationAmount - Donation amount
 * @param {string} data.thankYouMessage - Thank you message
 * @param {string} data.trackedLink - Personalized tracking link
 * @param {string} data.linkTokenId - Link token ID for tracking
 * @returns {string} HTML email content
 */
export function createThankYouTemplate(data) {
  const {
    organizerName,
    campaignTitle,
    donorName,
    donationAmount,
    thankYouMessage,
    trackedLink,
    linkTokenId,
  } = data;

  const content = `
    <div class="message">
      <p>Dear ${donorName},</p>
      <p>Thank you so much for your generous donation!</p>
    </div>

    <div class="campaign-details">
      <h2>${campaignTitle}</h2>
      <p>Your donation of <span class="amount-highlight">$${donationAmount}</span> has been received.</p>
    </div>

    <div class="personalized-message">
      <p><strong>Message from ${organizerName}:</strong></p>
      <p>${thankYouMessage}</p>
    </div>

    <div class="message">
      <p>You can track the campaign's progress and share it with others:</p>
    </div>

    <a href="${trackedLink}" class="cta-button">
      View Campaign Progress
    </a>

    <div class="message">
      <p>Your support makes a real difference. Thank you!</p>
      <p>Best regards,<br>${organizerName} and the ${APP_NAME} Team</p>
    </div>
  `;

  return createBaseTemplate(content, linkTokenId);
}

/**
 * Generate tracking link with UTM parameters
 * @param {string} baseUrl - Base campaign URL
 * @param {string} linkTokenId - Link token ID
 * @param {Object} utmParams - UTM parameters
 * @returns {string} Complete tracking link
 */
export function generateTrackingLink(baseUrl, linkTokenId, utmParams = {}) {
  const trackingUrl = `${TRACKING_BASE_URL}/t/click/${linkTokenId}`;

  const params = new URLSearchParams({
    ...utmParams,
    redirect: baseUrl,
  });

  return `${trackingUrl}?${params.toString()}`;
}
