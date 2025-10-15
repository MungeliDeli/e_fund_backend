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
          background: linear-gradient(135deg, #007a35 0%, #009e47 100%);
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
          background: linear-gradient(135deg, #007a35 0%, #009e47 100%);
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
          background: linear-gradient(135deg, #00652c 0%, #008a3f 100%);
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
          border-left: 4px solid #007a35;
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
          color: #007a35;
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
 * Donation receipt email template (to donor)
 * @param {Object} data
 * @param {string} data.organizerName
 * @param {string} data.campaignTitle
 * @param {string} data.donorName
 * @param {number|string} data.donationAmount
 * @param {string} data.currency
 * @param {string} data.donationId
 * @param {string} data.campaignUrl
 * @param {string} [data.thankYouMessage]
 * @param {string} [data.linkTokenId]
 */
export function createDonationReceiptTemplate(data) {
  const {
    organizerName,
    campaignTitle,
    donorName,
    donationAmount,
    currency,
    donationId,
    campaignUrl,
    thankYouMessage,
    linkTokenId,
  } = data;

  const niceMessage =
    thankYouMessage ||
    `On behalf of ${organizerName}, thank you for supporting "${campaignTitle}". Your generosity makes a real difference.`;

  const content = `
    <div class="message">
      <p>Dear ${donorName || "Supporter"},</p>
      <p>We’ve received your donation. Please find your receipt below.</p>
    </div>

    <div class="campaign-details">
      <h2>${campaignTitle}</h2>
      <p class="amount-highlight">${new Intl.NumberFormat("en-ZM", {
        style: "currency",
        currency: currency || "ZMW",
        minimumFractionDigits: 0,
      }).format(Number(donationAmount) || 0)}</p>
      <p><strong>Donation ID:</strong> ${donationId}</p>
    </div>

    <div class="personalized-message">
      <p>${niceMessage}</p>
      <p><em>- ${organizerName}</em></p>
    </div>

    <a href="${
      campaignUrl || FRONTEND_URL
    }" class="cta-button">View Campaign</a>

    <div class="message">
      <p>Warm regards,<br/>The ${APP_NAME} Team</p>
    </div>
  `;

  return createBaseTemplate(content, linkTokenId);
}

/**
 * Campaign milestone email template (to organizer)
 * @param {Object} data
 * @param {string} data.organizerName
 * @param {string} data.campaignTitle
 * @param {number} data.percentageReached - 25, 50, 70, 100
 * @param {number|string} data.currentAmount
 * @param {number|string} data.goalAmount
 * @param {string} data.campaignUrl
 * @param {string} [data.linkTokenId]
 */
export function createMilestoneTemplate(data) {
  const {
    organizerName,
    campaignTitle,
    percentageReached,
    currentAmount,
    goalAmount,
    campaignUrl,
    linkTokenId,
  } = data;

  const content = `
    <div class="message">
      <p>Hi ${organizerName},</p>
      <p>Your campaign <strong>${campaignTitle}</strong> just reached <strong>${percentageReached}%</strong> of its goal!</p>
    </div>

    <div class="campaign-details">
      <p><strong>Raised so far:</strong> ${new Intl.NumberFormat("en-ZM", {
        style: "currency",
        currency: "ZMW",
        minimumFractionDigits: 0,
      }).format(Number(currentAmount) || 0)}</p>
      <p><strong>Goal:</strong> ${new Intl.NumberFormat("en-ZM", {
        style: "currency",
        currency: "ZMW",
        minimumFractionDigits: 0,
      }).format(Number(goalAmount) || 0)}</p>
    </div>

    <a href="${
      campaignUrl || FRONTEND_URL
    }" class="cta-button">Open Campaign Dashboard</a>

    <div class="message">
      <p>Keep up the great work!<br/>The ${APP_NAME} Team</p>
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

/**
 * Withdrawal Initiated Email Template
 * @param {Object} data - Template data
 * @param {string} data.organizerName - Name of the organizer
 * @param {number} data.amount - Withdrawal amount
 * @param {string} data.currency - Currency code
 * @param {string} data.phoneNumber - Destination phone number
 * @param {string} data.withdrawalRequestId - Withdrawal request ID
 * @returns {string} HTML email template
 */
export function createWithdrawalInitiatedTemplate(data) {
  const {
    organizerName = "Organizer",
    amount,
    currency = "ZMW",
    phoneNumber,
    withdrawalRequestId,
  } = data;

  const content = `
    <div style="text-align: center; padding: 20px;">
      <h2 style="color: #2563eb; margin-bottom: 20px;">Withdrawal Payment Initiated</h2>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; font-size: 16px;">
          <strong>Hello ${organizerName},</strong>
        </p>
        <p style="margin: 0 0 15px 0; color: #64748b;">
          Your withdrawal request has been approved and payment is being processed.
        </p>
        
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #64748b;">Amount</p>
          <p style="margin: 0; font-size: 20px; font-weight: bold; color: #059669;">
            ${amount} ${currency}
          </p>
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #64748b;">Destination</p>
          <p style="margin: 0; font-size: 16px; color: #1f2937;">
            ${phoneNumber}
          </p>
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #64748b;">Reference</p>
          <p style="margin: 0; font-size: 14px; color: #6b7280; font-family: monospace;">
            ${withdrawalRequestId}
          </p>
        </div>
      </div>
      
      <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>⏱️ Processing Time:</strong> Payments typically take 5-15 minutes to complete. 
          You will receive another notification once the payment is successful.
        </p>
      </div>
      
      <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
        If you have any questions or concerns, please contact our support team.
      </p>
    </div>
  `;

  return createBaseTemplate(content);
}

/**
 * Withdrawal Completed Email Template
 * @param {Object} data - Template data
 * @param {string} data.organizerName - Name of the organizer
 * @param {number} data.amount - Withdrawal amount
 * @param {string} data.currency - Currency code
 * @param {string} data.phoneNumber - Destination phone number
 * @param {string} data.withdrawalRequestId - Withdrawal request ID
 * @returns {string} HTML email template
 */
export function createWithdrawalCompletedTemplate(data) {
  const {
    organizerName = "Organizer",
    amount,
    currency = "ZMW",
    phoneNumber,
    withdrawalRequestId,
  } = data;

  const content = `
    <div style="text-align: center; padding: 20px;">
      <h2 style="color: #059669; margin-bottom: 20px;">✅ Withdrawal Completed</h2>
      
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
        <p style="margin: 0 0 10px 0; font-size: 16px;">
          <strong>Hello ${organizerName},</strong>
        </p>
        <p style="margin: 0 0 15px 0; color: #166534;">
          🎉 Great news! Your withdrawal has been successfully processed.
        </p>
        
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #64748b;">Amount</p>
          <p style="margin: 0; font-size: 20px; font-weight: bold; color: #059669;">
            ${amount} ${currency}
          </p>
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #64748b;">Sent to</p>
          <p style="margin: 0; font-size: 16px; color: #1f2937;">
            ${phoneNumber}
          </p>
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #64748b;">Reference</p>
          <p style="margin: 0; font-size: 14px; color: #6b7280; font-family: monospace;">
            ${withdrawalRequestId}
          </p>
        </div>
      </div>
      
      <div style="background: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #1e40af;">
          <strong>💡 Tip:</strong> Check your mobile money account to confirm receipt. 
          The funds should appear within a few minutes.
        </p>
      </div>
      
      <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
        Thank you for using FundFlow! If you have any questions, please contact our support team.
      </p>
    </div>
  `;

  return createBaseTemplate(content);
}

/**
 * Withdrawal Failed Email Template
 * @param {Object} data - Template data
 * @param {string} data.organizerName - Name of the organizer
 * @param {number} data.amount - Withdrawal amount
 * @param {string} data.currency - Currency code
 * @param {string} data.phoneNumber - Destination phone number
 * @param {string} data.withdrawalRequestId - Withdrawal request ID
 * @param {string} data.errorMessage - Error message from payment provider
 * @returns {string} HTML email template
 */
export function createWithdrawalFailedTemplate(data) {
  const {
    organizerName = "Organizer",
    amount,
    currency = "ZMW",
    phoneNumber,
    withdrawalRequestId,
    errorMessage = "Unknown error",
  } = data;

  const content = `
    <div style="text-align: center; padding: 20px;">
      <h2 style="color: #dc2626; margin-bottom: 20px;">❌ Withdrawal Failed</h2>
      
      <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
        <p style="margin: 0 0 10px 0; font-size: 16px;">
          <strong>Hello ${organizerName},</strong>
        </p>
        <p style="margin: 0 0 15px 0; color: #991b1b;">
          We're sorry, but your withdrawal request could not be processed.
        </p>
        
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #64748b;">Amount</p>
          <p style="margin: 0; font-size: 20px; font-weight: bold; color: #dc2626;">
            ${amount} ${currency}
          </p>
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #64748b;">Destination</p>
          <p style="margin: 0; font-size: 16px; color: #1f2937;">
            ${phoneNumber}
          </p>
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #64748b;">Reference</p>
          <p style="margin: 0; font-size: 14px; color: #6b7280; font-family: monospace;">
            ${withdrawalRequestId}
          </p>
        </div>
        
        <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #92400e; font-weight: bold;">Error Details:</p>
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            ${errorMessage}
          </p>
        </div>
      </div>
      
      <div style="background: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #1e40af;">
          <strong>🔧 What's Next:</strong> Please contact our support team to resolve this issue. 
          We'll help you complete your withdrawal successfully.
        </p>
      </div>
      
      <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
        We apologize for any inconvenience. Our support team is here to help.
      </p>
    </div>
  `;

  return createBaseTemplate(content);
}

/**
 * Withdrawal Rejected Email Template
 * @param {Object} data - Template data
 * @param {string} data.organizerName - Name of the organizer
 * @param {number} data.amount - Withdrawal amount
 * @param {string} data.currency - Currency code
 * @param {string} data.withdrawalRequestId - Withdrawal request ID
 * @param {string} data.reason - Rejection reason
 * @returns {string} HTML email template
 */
export function createWithdrawalRejectedTemplate(data) {
  const {
    organizerName = "Organizer",
    amount,
    currency = "ZMW",
    withdrawalRequestId,
    reason = "No reason provided",
  } = data;

  const content = `
    <div style="text-align: center; padding: 20px;">
      <h2 style="color: #dc2626; margin-bottom: 20px;">❌ Withdrawal Request Rejected</h2>
      
      <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
        <p style="margin: 0 0 10px 0; font-size: 16px;">
          <strong>Hello ${organizerName},</strong>
        </p>
        <p style="margin: 0 0 15px 0; color: #991b1b;">
          We're sorry, but your withdrawal request has been rejected.
        </p>
        
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #64748b;">Amount</p>
          <p style="margin: 0; font-size: 20px; font-weight: bold; color: #dc2626;">
            ${amount} ${currency}
          </p>
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #64748b;">Reference</p>
          <p style="margin: 0; font-size: 14px; color: #6b7280; font-family: monospace;">
            ${withdrawalRequestId}
          </p>
        </div>
        
        <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #92400e; font-weight: bold;">Rejection Reason:</p>
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            ${reason}
          </p>
        </div>
      </div>
      
      <div style="background: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #1e40af;">
          <strong>🔧 What's Next:</strong> Please review the reason for rejection and address any issues. 
          You can submit a new withdrawal request once the issues are resolved.
        </p>
      </div>
      
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #166534;">
          <strong>💡 Need Help?</strong> If you have questions about this rejection or need assistance, 
          please contact our support team. We're here to help you succeed.
        </p>
      </div>
      
      <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
        Thank you for using FundFlow. We appreciate your understanding.
      </p>
    </div>
  `;

  return createBaseTemplate(content);
}
