import express from "express";
import { catchAsync } from "../../middlewares/errorHandler.js";
import { authenticate, requireEmailVerification } from "../../middlewares/auth.middleware.js";
import { validateRegistration, validateLogin } from "./auth.validation.js";
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
  refreshToken
} from "./auth.controller.js";

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

export default router;