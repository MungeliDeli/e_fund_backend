/**
 * Auth Routes
 *
 * Defines all authentication and user management API endpoints for the FundFlow backend.
 * Maps HTTP routes to controller actions, applies middleware for validation and authentication,
 * and organizes endpoints for registration, login, token, email, password, and media operations.
 *
 * Key Features:
 * - User and organization registration routes
 * - Login, logout, and token refresh routes
 * - Email verification and password reset routes
 * - Profile/cover image upload and retrieval routes
 * - Middleware integration for validation and authentication
 * - RESTful route organization
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import {Router} from "express";
import { logRequestCount } from '../../middlewares/requestLogger.middleware.js';
import { catchAsync } from "../../middlewares/errorHandler.js";
import { authenticate, requireEmailVerification, requireSupportAdmin, verifyAccessTokenForRefresh } from "../../middlewares/auth.middleware.js";
import { validateRegistration, validateLogin, validateCreateOrganizationUser, validatePassword } from "./auth.validation.js";
import {
  register,
  login,
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
import multer from 'multer';
import processUploadsMiddleware from "../../middlewares/processUploads.middleware.js";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Apply request logger to all auth routes
router.use(logRequestCount);

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
  verifyAccessTokenForRefresh,
  catchAsync(refreshToken)
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
  "/create-organization-user",
  authenticate,
  requireSupportAdmin,
  upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'coverPicture', maxCount: 1 }
  ]),
  validateCreateOrganizationUser,
  processUploadsMiddleware(),
  catchAsync(createOrganizationUser)
);

/**
 * @route   POST /api/v1/auth/activate-and-set-password
 * @desc    Organizational user activates account and sets password
 * @access  Public
 */
router.post(
  "/activate-and-set-password",
  validatePassword,
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