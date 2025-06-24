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

    // Register the user
    const result = await authService.registerIndividualUser(registrationData);

    // Send success response
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
        token: result.token
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
    // Accept token from query or body
    const verificationToken = req.query.token || req.body.token;
    if (!verificationToken) {
      return ResponseFactory.badRequest(res, "Verification token is required");
    }
    // Verify email
    const result = await authService.verifyEmail(verificationToken);
    // Send success response
    ResponseFactory.ok(
      res,
      "Email verified and account activated successfully",
      {
        userId: result.userId,
        email: result.email,
        isEmailVerified: result.isEmailVerified,
        isActive: result.isActive
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
    // Optionally, you can blacklist the token here if you implement token blacklisting
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
    const userId = req.user.userId;
    const result = await authService.refreshToken(userId);
    ResponseFactory.ok(res, "Token refreshed successfully", result);
  } catch (error) {
    next(error);
  }
}; 