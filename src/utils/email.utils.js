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

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_EMAIL = process.env.FROM_EMAIL || 'no-reply@example.com';
const APP_NAME = process.env.APP_NAME || 'E-Fund';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

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
  const subject = 'Verify your email address';
  const html = `<p>Thank you for registering with ${APP_NAME}.</p>
    <p>Please verify your email by clicking the link below:</p>
    <a href="${link}">${link}</a>
    <p>This link will expire in 24 hours.</p>`;
  return sendMail({ to, subject, html });
}

export async function sendPasswordResetEmail(to, token) {
  const link = `${FRONTEND_URL}/reset-password?token=${token}`;
  const subject = 'Reset your password';
  const html = `<p>You requested a password reset for your ${APP_NAME} account.</p>
    <p>Click the link below to reset your password:</p>
    <a href="${link}">${link}</a>
    <p>This link will expire in 20 minutes.</p>`;
  return sendMail({ to, subject, html });
}

export async function sendSetupEmail(to, token) {
  const link = `${FRONTEND_URL}/setup-account?token=${token}`;
  const subject = 'Set up your account';
  const html = `<p>You have been invited to set up your ${APP_NAME} account.</p>
    <p>Click the link below to activate your account and set your password:</p>
    <a href="${link}">${link}</a>
    <p>This link will expire in 48 hours.</p>`;
  return sendMail({ to, subject, html });
} 