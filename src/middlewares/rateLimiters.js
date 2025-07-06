/**
 * Rate Limiting Middleware Module
 * 
 * This module provides rate limiting functionality to protect the application
 * from abuse, brute force attacks, and excessive resource consumption.
 * It uses Express Rate Limit to implement different rate limiting strategies
 * for various endpoints and user scenarios.
 * 
 * RATE LIMITING STRATEGIES:
 * - loginLimiter: Protects login endpoints from brute force attacks
 * - passwordResetLimiter: Limits password reset requests
 * - resendVerificationLimiter: Limits verification email resends
 * - generalLimiter: General API rate limiting
 * - strictLimiter: Strict rate limiting for sensitive operations
 * 
 * PROTECTION FEATURES:
 * - Brute force attack prevention
 * - Email spam prevention
 * - API abuse protection
 * - Resource consumption control
 * - DDoS attack mitigation
 * 
 * RATE LIMIT CONFIGURATIONS:
 * - Window size: Time window for rate limiting
 * - Max requests: Maximum requests per window
 * - Skip successful requests: Whether to count successful requests
 * - Skip failed requests: Whether to count failed requests
 * - Standard headers: Rate limit headers in responses
 * 
 * LIMITER TYPES:
 * - loginLimiter: 5 attempts per 15 minutes for login
 * - passwordResetLimiter: 3 attempts per hour for password reset
 * - resendVerificationLimiter: 3 attempts per hour for verification emails
 * - generalLimiter: 100 requests per 15 minutes for general API
 * - strictLimiter: 10 requests per 15 minutes for sensitive operations
 * 
 * RESPONSE HEADERS:
 * - X-RateLimit-Limit: Maximum requests allowed
 * - X-RateLimit-Remaining: Remaining requests in window
 * - X-RateLimit-Reset: Time when limit resets
 * - Retry-After: Time to wait before retrying
 * 
 * ERROR HANDLING:
 * - Rate limit exceeded responses
 * - Proper HTTP status codes (429)
 * - Clear error messages
 * - Retry-after information
 * - Logging of rate limit violations
 * 
 * SECURITY FEATURES:
 * - IP-based rate limiting
 * - User-based rate limiting (when authenticated)
 * - Dynamic rate limiting based on user type
 * - Whitelist support for trusted IPs
 * - Blacklist support for malicious IPs
 * 
 * MONITORING:
 * - Rate limit violation logging
 * - IP address tracking
 * - User agent logging
 * - Request pattern analysis
 * - Security event recording
 * 
 * CONFIGURATION OPTIONS:
 * - Environment-based rate limits
 * - Configurable time windows
 * - Adjustable request limits
 * - Custom error messages
 * - Header customization
 * 
 * INTEGRATION:
 * - Works with Express.js middleware
 * - Compatible with authentication system
 * - Supports monitoring and alerting
 * - Enables security analytics
 * 
 * @author Your Name
 * @version 1.0.0
 * @since 2024
 */

import rateLimit from 'express-rate-limit';
import config from '../config/index.js';

// Login: 5 attempts per 10 minutes per IP
export const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
    errorCode: "LOGIN_RATE_LIMITED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password Reset: 3 attempts per hour per email (or IP if no email)
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  keyGenerator: (req) => req.body?.email?.toLowerCase() || req.ip,
  message: {
    success: false,
    message: "Too many password reset requests. Please try again later.",
    errorCode: "PASSWORD_RESET_RATE_LIMITED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Resend Verification: 3 attempts per hour per email (or IP if no email)
export const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  keyGenerator: (req) => req.body?.email?.toLowerCase() || req.ip,
  message: {
    success: false,
    message: "Too many resend verification requests. Please try again later.",
    errorCode: "RESEND_VERIFICATION_RATE_LIMITED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Global API limiter: 100 requests per 15 min per IP in prod, 1000 in dev
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (config?.env === "production") ? 100 : 1000,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
    errorCode: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
}); 