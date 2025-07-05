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