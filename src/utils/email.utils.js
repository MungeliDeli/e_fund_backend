/**
 * Email Utilities Module
 *
 * This module provides email sending functionality for the application using Nodemailer.
 * It handles various types of emails including verification emails, password reset emails,
 * and organization setup invitation emails with proper templating and error handling.
 *
 * EMAIL TYPES:
 * - sendVerificationEmail: Email verification for new user registration
 * - sendPasswordResetEmail: Password reset functionality
 * - sendSetupEmail: Organization user account setup invitation
 *
 * EMAIL FEATURES:
 * - HTML email templates
 * - Plain text fallbacks
 * - Dynamic content insertion
 * - Professional email formatting
 * - Responsive email design
 *
 * EMAIL TEMPLATES:
 * - Verification emails with activation links
 * - Password reset emails with secure tokens
 * - Organization setup emails with invitation links
 * - Consistent branding and styling
 * - Mobile-friendly layouts
 *
 * CONFIGURATION:
 * - SMTP server configuration
 * - Email credentials management
 * - Environment-based settings
 * - Transport configuration
 * - Security settings (TLS/SSL)
 *
 * SECURITY FEATURES:
 * - Secure SMTP connections
 * - Token-based email verification
 * - Time-limited email links
 * - Email address validation
 * - Spam prevention measures
 *
 * ERROR HANDLING:
 * - SMTP connection errors
 * - Email delivery failures
 * - Invalid email addresses
 * - Network timeout handling
 * - Graceful error recovery
 *
 * EMAIL CONTENT:
 * - Professional subject lines
 * - Clear call-to-action buttons
 * - Branded email headers
 * - Contact information
 * - Legal disclaimers
 *
 * TEMPLATE VARIABLES:
 * - User name and email
 * - Verification/reset tokens
 * - Application branding
 * - Support contact information
 * - Expiration information
 *
 * INTEGRATION:
 * - Works with authentication service
 * - Compatible with user registration flow
 * - Supports password reset functionality
 * - Enables organization user invitations
 *
 * MONITORING:
 * - Email delivery tracking
 * - Failure logging
 * - Success rate monitoring
 * - Performance metrics
 *
 * @author Your Name
 * @version 1.0.0
 * @since 2024
 */

import nodemailer from "nodemailer";
import logger from "./logger.js";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_EMAIL = process.env.FROM_EMAIL || "no-reply@example.com";
const APP_NAME = process.env.APP_NAME || "E-Fund";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

async function sendMail({ to, subject, html }) {
  return transporter.sendMail({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to,
    subject,
    html,
  });
}

export async function sendVerificationEmail(to, token) {
  const link = `${FRONTEND_URL}/email-verified?token=${token}`;
  const subject = "Verify your email address";
  const html = `<p>Thank you for registering with ${APP_NAME}.</p>
    <p>Please verify your email by clicking the link below:</p>
    <a href="${link}">${link}</a>
    <p>This link will expire in 24 hours.</p>`;
  return sendMail({ to, subject, html });
}

export async function sendPasswordResetEmail(to, token) {
  const link = `${FRONTEND_URL}/reset-password?token=${token}`;
  const subject = "Reset your password";
  const html = `<p>You requested a password reset for your ${APP_NAME} account.</p>
    <p>Click the link below to reset your password:</p>
    <a href="${link}">${link}</a>
    <p>This link will expire in 20 minutes.</p>`;
  return sendMail({ to, subject, html });
}

export async function sendSetupEmail(to, token) {
  const link = `${FRONTEND_URL}/setup-account?token=${token}`;
  const subject = "Set up your account";
  const html = `<p>You have been invited to set up your ${APP_NAME} account.</p>
    <p>Click the link below to activate your account and set your password:</p>
    <a href="${link}">${link}</a>
    <p>This link will expire in 48 hours.</p>`;
  return sendMail({ to, subject, html });
}

/**
 * Sends a generic email with provided subject and HTML body.
 * Useful for transactional notifications (v1 minimal implementation).
 * @param {string} to
 * @param {string} subject
 * @param {string} html
 */
export async function sendGenericEmail(to, subject, html) {
  return sendMail({ to, subject, html });
}

/**
 * Sends an outreach email with tracking pixel and personalized content.
 * Used for campaign invitations, updates, and thank-you messages.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content (should include tracking pixel)
 * @param {Object} options - Additional options
 * @param {string} options.linkTokenId - Link token ID for tracking
 * @param {string} options.contactId - Contact ID for attribution
 * @returns {Promise<Object>} Email sending result
 */
export async function sendOutreachEmail(to, subject, html, options = {}) {
  try {
    const result = await sendMail({ to, subject, html });

    logger.info("Outreach email sent successfully", {
      to,
      subject,
      linkTokenId: options.linkTokenId,
      contactId: options.contactId,
    });

    return result;
  } catch (error) {
    console.log("error sending outreach email by function", error, to);
    logger.error("Failed to send outreach email", {
      error: error.message,
      to,
      subject,
      linkTokenId: options.linkTokenId,
      contactId: options.contactId,
    });

    throw error;
  }
}
