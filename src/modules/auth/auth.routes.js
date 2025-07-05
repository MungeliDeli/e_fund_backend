import express from "express";
import { catchAsync } from "../../middlewares/errorHandler.js";
import { authenticate, requireEmailVerification, requireSupportAdmin } from "../../middlewares/auth.middleware.js";
import { validateRegistration, validateLogin, validateCreateOrganizationUser, validatePasswordSetup } from "./auth.validation.js";
import {
  register,
  login,
  getProfile,
  verifyEmail,
  healthCheck,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
  refreshToken,
  createOrganizationUser,
  activateAndSetPassword,
  resendVerificationEmail
} from "./auth.controller.js";
import { loginLimiter, passwordResetLimiter, resendVerificationLimiter } from '../../middlewares/rateLimiters.js';

const router = express.Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new individual user
 * @access  Public
 */
router.post(
  "/register",
  validateRegistration,
  catchAsync(register)
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user and return token
 * @access  Public
 */
router.post(
  "/login",
  loginLimiter,
  validateLogin,
  catchAsync(login)
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (client-side token invalidation)
 * @access  Private (requires authentication)
 */
router.post(
  "/logout",
  authenticate,
  catchAsync(logout)
);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token
 * @access  Private (requires authentication)
 */
router.post(
  "/refresh-token",
  authenticate,
  catchAsync(refreshToken)
);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current user's profile
 * @access  Private (requires authentication)
 */
router.get(
  "/profile",
  authenticate,
  catchAsync(getProfile)
);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change user's password (authenticated)
 * @access  Private (requires authentication)
 */
router.post(
  "/change-password",
  authenticate,
  requireEmailVerification,
  catchAsync(changePassword)
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Initiate password reset process
 * @access  Public
 */
router.post(
  "/forgot-password",
  passwordResetLimiter,
  catchAsync(forgotPassword)
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password using reset token
 * @access  Public
 */
router.post(
  "/reset-password",
  catchAsync(resetPassword)
);

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify user's email address
 * @access  Public
 */
router.post(
  "/verify-email",
  catchAsync(verifyEmail)
);

/**
 * @route   GET /api/v1/auth/health
 * @desc    Health check for authentication service
 * @access  Public
 */
router.get("/health", healthCheck);

/**
 * @route   POST /api/v1/admin/users/create-organization-user
 * @desc    Support admin creates an organization user and sends invite
 * @access  Private (support admin only)
 */
router.post(
  "/admin/users/create-organization-user",
  authenticate,
  requireSupportAdmin,
  validateCreateOrganizationUser,
  catchAsync(createOrganizationUser)
);

/**
 * @route   POST /api/v1/auth/activate-and-set-password
 * @desc    Organizational user activates account and sets password
 * @access  Public
 */
router.post(
  "/activate-and-set-password",
  validatePasswordSetup,
  catchAsync(activateAndSetPassword)
);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Public
 */
router.post(
  "/resend-verification",
  resendVerificationLimiter,
  catchAsync(resendVerificationEmail)
);

export default router;