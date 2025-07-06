/**
 * Authentication Controller Module
 * 
 * This module handles all HTTP requests and responses for authentication operations.
 * It serves as the presentation layer that receives client requests, validates input,
 * calls the appropriate service methods, and returns formatted responses.
 * 
 * CONTROLLER RESPONSIBILITIES:
 * - Request validation and sanitization
 * - Response formatting using ResponseFactory
 * - Error handling and logging
 * - HTTP status code management
 * - Request/response logging for monitoring
 * 
 * ENDPOINTS HANDLED:
 * - POST /register: Individual user registration
 * - POST /login: User authentication
 * - GET /profile: Get user profile
 * - POST /verify-email: Email verification
 * - POST /change-password: Password change for authenticated users
 * - POST /forgot-password: Password reset initiation
 * - POST /reset-password: Password reset completion
 * - POST /logout: User logout
 * - POST /refresh-token: Token refresh
 * - POST /admin/users/create-organization-user: Admin creates org user
 * - POST /activate-and-set-password: Org user activation
 * - POST /resend-verification: Resend verification email
 * - GET /health: Health check endpoint
 * 
 * SECURITY FEATURES:
 * - Input validation through validation middleware
 * - Rate limiting on sensitive endpoints
 * - Authentication middleware for protected routes
 * - Role-based access control
 * 
 * RESPONSE FORMATTING:
 * - Consistent response structure using ResponseFactory
 * - Proper HTTP status codes
 * - Error message standardization
 * - Success message formatting
 * 
 * LOGGING:
 * - API request/response logging
 * - Performance monitoring
 * - Error tracking
 * - Security event logging
 * 
 * DEPENDENCIES:
 * - authService: For business logic operations
 * - ResponseFactory: For standardized response formatting
 * - logger: For application logging
 * - Validation middleware: For input validation
 * - Authentication middleware: For route protection
 * 
 * @author Your Name
 * @version 1.0.0
 * @since 2024
 */

// src/modules/auth/auth.controller.js

import authService from "./auth.service.js";
import { ResponseFactory } from "../../utils/response.utils.js";
import logger from "../../utils/logger.js";

/**
 * Authentication Controller
 * Handles HTTP requests and responses for authentication operations
 */

/**
 * Registers a new individual user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const register = async (req, res, next) => {
  try {
    const registrationData = req.body;

    const result = await authService.registerIndividualUser(registrationData);

    
    ResponseFactory.created(
      res,
      "User registered successfully. Please check your email for a verification link to activate your account.",
      {
        user: {
          userId: result.user.userId,
          email: result.user.email,
          userType: result.user.userType,
          isEmailVerified: result.user.isEmailVerified,
          isActive: result.user.isActive,
          createdAt: result.user.createdAt
        },
        profile: {
          firstName: result.profile.firstName,
          lastName: result.profile.lastName,
          phoneNumber: result.profile.phoneNumber,
          gender: result.profile.gender,
          dateOfBirth: result.profile.dateOfBirth,
          country: result.profile.country,
          city: result.profile.city,
          address: result.profile.address
        }
      }
    );

    logger.api.response(req.method, req.originalUrl, 201, Date.now() - req.startTime);
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticates a user and returns a token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.authenticateUser(email, password);
    ResponseFactory.ok(
      res,
      "Login successful",
      {
        user: {
          userId: result.user.userId,
          email: result.user.email,
          userType: result.user.userType,
          isEmailVerified: result.user.isEmailVerified,
          isActive: result.user.isActive,
          createdAt: result.user.createdAt
        },
        token: result.token,
        refreshToken: result.refreshToken
      }
    );
    logger.api.response(req.method, req.originalUrl, 200, Date.now() - req.startTime);
  } catch (error) {
    next(error);
  }
};

/**
 * Gets the current user's profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Get user profile
    const result = await authService.getUserProfile(userId);

    // Send success response
    ResponseFactory.ok(
      res,
      "Profile retrieved successfully",
      {
        user: result.user,
        profile: result.profile
      }
    );

    logger.api.response(req.method, req.originalUrl, 200, Date.now() - req.startTime);
  } catch (error) {
    next(error);
  }
};

/**
 * Verifies user's email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const verificationToken = req.query.token || req.body.token;
    logger.info(req.query.token  )
    
    if (!verificationToken) {
      return ResponseFactory.badRequest(res, "Verification token is required");
    }
    const result = await authService.verifyEmail(verificationToken);
    ResponseFactory.ok(
      res,
      "Email verified and account activated successfully",
      {
        userId: result.userId,
        email: result.email,
        isEmailVerified: result.isEmailVerified,
        isActive: result.isActive,
        token: result.token,
        refreshToken: result.refreshToken
      }
    );
    logger.api.response(req.method, req.originalUrl, 200, Date.now() - req.startTime);
  } catch (error) {
    next(error);
  }
};

/**
 * Health check endpoint for authentication module
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const healthCheck = (req, res) => {
  ResponseFactory.ok(
    res,
    "Authentication service is healthy",
    {
      service: "auth",
      status: "healthy",
      timestamp: new Date().toISOString()
    }
  );
};

/**
 * Change password for authenticated user
 * @route POST /api/v1/auth/change-password
 */
export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(userId, currentPassword, newPassword);
    ResponseFactory.ok(res, "Password changed successfully", result);
  } catch (error) {
    next(error);
  }
};

/**
 * Initiate forgot password process
 * @route POST /api/v1/auth/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    ResponseFactory.ok(res, "Password reset instructions sent if email exists", result);
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password using reset token
 * @route POST /api/v1/auth/reset-password
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    const result = await authService.resetPassword(resetToken, newPassword);
    ResponseFactory.ok(res, "Password reset successfully", result);
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user (client-side token invalidation)
 * @route POST /api/v1/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    ResponseFactory.ok(res, "Logged out successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh authentication token
 * @route POST /api/v1/auth/refresh-token
 */
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return ResponseFactory.badRequest(res, "Refresh token is required");
    }
    const result = await authService.refreshToken(refreshToken);
    ResponseFactory.ok(res, "Token refreshed successfully", result);
  } catch (error) {
    next(error);
  }
};

/**
 * Support admin creates an organization user and sends invite
 */
export const createOrganizationUser = async (req, res, next) => {
  try {
    const registrationData = req.body;
    const createdByAdminId = req.user.userId;
    const result = await authService.createOrganizationUserAndInvite(registrationData, createdByAdminId);
    ResponseFactory.created(
      res,
      "Organization user created and invitation sent.",
      {
        user: result.user,
        profile: result.profile,
        setupToken: result.setupToken // REMOVE in production
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Organizational user activates account and sets password
 */
export const activateAndSetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.activateAndSetPassword(token, newPassword);
    ResponseFactory.ok(res, "Account activated and password set successfully", result);
  } catch (error) {
    next(error);
  }
};

/**
 * Resend verification email
 * @route POST /api/v1/auth/resend-verification
 */
export const resendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return ResponseFactory.badRequest(res, "Email is required");
    }
    await authService.resendVerificationEmail(email);
    ResponseFactory.ok(res, "Verification email resent if the account exists and is not verified");
  } catch (error) {
    next(error);
  }
}; 