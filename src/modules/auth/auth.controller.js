/**
 * Auth Controller
 *
 * Handles HTTP requests for authentication, registration, email verification,
 * password reset, token management, and user media endpoints. Delegates business
 * logic to the Auth Service and formats API responses.
 *
 * Key Features:
 * - User and organization registration endpoints
 * - Login, logout, and token refresh endpoints
 * - Email verification and password reset flows
 * - Profile/cover image upload and retrieval endpoints
 * - Consistent API response formatting
 * - Error handling and validation
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

// src/modules/auth/auth.controller.js

import authService from "./auth.service.js";
import { ResponseFactory } from "../../utils/response.utils.js";
import logger from "../../utils/logger.js";
import { uploadFileToS3 } from "../../utils/s3.utils.js";
import { v4 as uuidv4 } from "uuid";
import authRepository from "./auth.repository.js";

/**
 * Authentication Controller
 * Handles HTTP requests and responses for authentication operations
 */

/**
 * Registers a new individual user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const register = async (req, res) => {
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
        createdAt: result.user.createdAt,
      },
      profile: {
        firstName: result.profile.firstName,
        lastName: result.profile.lastName,
        phoneNumber: result.profile.phoneNumber,
        gender: result.profile.gender,
        dateOfBirth: result.profile.dateOfBirth,
        country: result.profile.country,
        city: result.profile.city,
        address: result.profile.address,
      },
    }
  );

  logger.api.response(
    req.method,
    req.originalUrl,
    201,
    Date.now() - req.startTime
  );
};

/**
 * Authenticates a user and returns a token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const login = async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.authenticateUser(email, password);
  ResponseFactory.ok(res, "Login successful", {
    user: {
      userId: result.user.userId,
      email: result.user.email,
      userType: result.user.userType,
      isEmailVerified: result.user.isEmailVerified,
      isActive: result.user.isActive,
      createdAt: result.user.createdAt,
    },
    token: result.token,

    refreshToken: result.refreshToken,
  });
  logger.api.response(
    req.method,
    req.originalUrl,
    200,
    Date.now() - req.startTime
  );
};

/**
 * Verifies user's email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const verifyEmail = async (req, res) => {
  const verificationToken = req.query.token || req.body.token;
  logger.info(req.query.token);

  if (!verificationToken) {
    return ResponseFactory.badRequest(res, "Verification token is required");
  }
  const result = await authService.verifyEmail(verificationToken);
  ResponseFactory.ok(res, "Email verified and account activated successfully", {
    userId: result.userId,
    email: result.email,
    isEmailVerified: result.isEmailVerified,
    isActive: result.isActive,
    token: result.token,
    refreshToken: result.refreshToken,
  });
  logger.api.response(
    req.method,
    req.originalUrl,
    200,
    Date.now() - req.startTime
  );
};

/**
 * Health check endpoint for authentication module
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const healthCheck = (req, res) => {
  ResponseFactory.ok(res, "Authentication service is healthy", {
    service: "auth",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
};

/**
 * Change password for authenticated user
 * @route POST /api/v1/auth/change-password
 */
export const changePassword = async (req, res) => {
  const userId = req.user.userId;
  const { currentPassword, newPassword } = req.body;
  const result = await authService.changePassword(
    userId,
    currentPassword,
    newPassword
  );
  ResponseFactory.ok(res, "Password changed successfully", result);
};

/**
 * Initiate forgot password process
 * @route POST /api/v1/auth/forgot-password
 */
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  ResponseFactory.ok(
    res,
    "Password reset instructions sent if email exists",
    result
  );
};

/**
 * Reset password using reset token
 * @route POST /api/v1/auth/reset-password
 */
export const resetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body;
  logger.info(resetToken, newPassword);
  const result = await authService.resetPassword(resetToken, newPassword);
  ResponseFactory.ok(res, "Password reset successfully", result);
};

/**
 * Logout user (client-side token invalidation)
 * @route POST /api/v1/auth/logout
 */
export const logout = async (req, res) => {
  const { refreshToken } = req.body;
  await authService.logout(refreshToken);
  ResponseFactory.ok(res, "Logged out successfully");
};

/**
 * Refresh authentication token
 * @route POST /api/v1/auth/refresh-token
 */
export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return ResponseFactory.badRequest(res, "Refresh token is required");
  }
  const result = await authService.refreshToken(refreshToken);
  ResponseFactory.ok(res, "Token refreshed successfully", result);
};

/**
 * Support admin creates an organization user and sends invite
 */
export const createOrganizationUser = async (req, res) => {
  const registrationData = req.body;
  const createdByAdminId = req.user.userId;
  const files = req.files || {};

  // Prepare file metadata to pass to service (no mediaId generation here)
  const profilePictureFile =
    files.profilePicture && files.profilePicture[0]
      ? {
          buffer: files.profilePicture[0].buffer,
          originalname: files.profilePicture[0].originalname,
          mimetype: files.profilePicture[0].mimetype,
          size: files.profilePicture[0].size,
        }
      : null;
  const coverPictureFile =
    files.coverPicture && files.coverPicture[0]
      ? {
          buffer: files.coverPicture[0].buffer,
          originalname: files.coverPicture[0].originalname,
          mimetype: files.coverPicture[0].mimetype,
          size: files.coverPicture[0].size,
        }
      : null;

  // Pass file metadata to service
  const result = await authService.createOrganizationUserAndInvite(
    {
      ...registrationData,
      profilePictureFile,
      coverPictureFile,
    },
    createdByAdminId
  );

  ResponseFactory.created(
    res,
    "Organization user created and invitation sent.",
    {
      user: result.user,
      profile: result.profile,
      setupToken: result.setupToken, // REMOVE in production
    }
  );
};

/**
 * Organizational user activates account and sets password
 */
export const activateAndSetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  logger.info(token, newPassword);
  const result = await authService.activateAndSetPassword(token, newPassword);
  ResponseFactory.ok(
    res,
    "Account activated and password set successfully",
    result
  );
};

/**
 * Resend verification email
 * @route POST /api/v1/auth/resend-verification
 */
export const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return ResponseFactory.badRequest(res, "Email is required");
  }
  await authService.resendVerificationEmail(email);
  ResponseFactory.ok(
    res,
    "Verification email resent if the account exists and is not verified"
  );
};
