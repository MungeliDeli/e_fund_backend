/**
 * Authentication Routes Module
 * 
 * This module defines all the HTTP routes for authentication and user management
 * operations. It sets up the Express router with proper middleware chains,
 * validation, rate limiting, and access control for each endpoint.
 * 
 * ROUTE STRUCTURE:
 * All routes are prefixed with /api/v1/auth/ and organized by functionality:
 * 
 * PUBLIC ENDPOINTS (No authentication required):
 * - POST /register: Individual user registration
 * - POST /login: User authentication
 * - POST /verify-email: Email verification
 * - POST /forgot-password: Password reset initiation
 * - POST /reset-password: Password reset completion
 * - POST /activate-and-set-password: Organization user activation
 * - POST /resend-verification: Resend verification email
 * - GET /health: Health check endpoint
 * 
 * PROTECTED ENDPOINTS (Authentication required):
 * - POST /logout: User logout
 * - POST /refresh-token: Token refresh
 * - GET /profile: Get user profile
 * - POST /change-password: Change user password
 * 
 * ADMIN ENDPOINTS (Admin authentication required):
 * - POST /admin/users/create-organization-user: Create organization user
 * 
 * MIDDLEWARE CHAINS:
 * - Validation: Input validation using Joi schemas
 * - Rate Limiting: Protection against brute force attacks
 * - Authentication: JWT token verification
 * - Authorization: Role-based access control
 * - Error Handling: Centralized error processing
 * 
 * SECURITY FEATURES:
 * - Rate limiting on sensitive endpoints (login, password reset, verification)
 * - Input validation and sanitization
 * - Authentication middleware for protected routes
 * - Role-based access control for admin routes
 * - CORS handling through Express
 * 
 * RATE LIMITING:
 * - loginLimiter: Limits login attempts
 * - passwordResetLimiter: Limits password reset requests
 * - resendVerificationLimiter: Limits verification email resends
 * 
 * VALIDATION SCHEMAS:
 * - validateRegistration: Individual user registration validation
 * - validateLogin: Login credentials validation
 * - validateCreateOrganizationUser: Organization user creation validation
 * - validatePasswordSetup: Password setup validation
 * 
 * ERROR HANDLING:
 * - catchAsync wrapper for async route handlers
 * - Centralized error processing
 * - Proper HTTP status codes
 * - Consistent error response format
 * 
 * DEPENDENCIES:
 * - Express router for route definition
 * - Authentication middleware for route protection
 * - Validation middleware for input validation
 * - Rate limiting middleware for security
 * - Controller functions for request handling
 * - Error handling middleware
 * 
 * @author Your Name
 * @version 1.0.0
 * @since 2024
 */

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