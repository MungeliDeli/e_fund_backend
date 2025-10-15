/**
 * User Controller
 *
 * Handles HTTP requests for user profile management, including public/private profile
 * fetching and profile/cover image upload. Delegates business logic to the User Service
 * and formats API responses.
 *
 * Key Features:
 * - Public and private profile endpoints
 * - Profile and cover image upload endpoint
 * - Consistent API response formatting
 * - Error handling and validation
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import {
  getUserById,
  getAllUsers,
  toggleUserStatus,
  makeUserAdmin,
  getAllAdmins,
  removeAdminPrivileges,
} from "./user.service.js";
import { ResponseFactory } from "../../../utils/response.utils.js";
import { NotFoundError } from "../../../utils/appError.js";
import * as userService from "./user.service.js";
import logger from "../../../utils/logger.js";

/**
 * Get a public user profile (anyone can access)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const getUserProfile = async (req, res) => {
  const userId = req.params.userId;
  const profile = await getUserById(userId, false);
  if (!profile) throw new NotFoundError("User/profile not found");
  ResponseFactory.ok(res, "User public profile fetched successfully", profile);
};

/**
 * Get the private profile of the authenticated user (owner only)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export const getMyProfile = async (req, res) => {
  const userId = req.user.userId;
  const profile = await getUserById(userId, true);
  if (!profile) throw new NotFoundError("User/profile not found");
  ResponseFactory.ok(res, "User private profile fetched successfully", profile);
};

/**
 * Get a signed S3 URL for a media file by mediaId
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export const getMediaUrl = async (req, res) => {
  const { mediaId } = req.params;
  const mediaData = await userService.getMediaUrl(mediaId);
  logger.info(mediaData);
  ResponseFactory.ok(res, "Media URL generated successfully", mediaData);
};

/**
 * Update the profile and/or cover image for the authenticated user
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export const updateProfileImage = async (req, res) => {
  const userId = req.user.userId;
  const files = req.files || {};
  const profilePictureFile = files.profilePicture?.[0] || null;
  const coverPictureFile = files.coverPicture?.[0] || null;
  const updatedProfile = await userService.updateProfileImage(
    userId,
    profilePictureFile,
    coverPictureFile
  );
  ResponseFactory.ok(
    res,
    "Profile image(s) updated successfully",
    updatedProfile
  );
};

/**
 * Update the profile information for the authenticated user
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (req, res) => {
  const userId = req.user.userId;
  const updatedProfile = await userService.updateUserProfile(userId, req.body);

  ResponseFactory.ok(
    res,
    "Profile information updated successfully",
    updatedProfile
  );
};

/**
 * Get all individual users with optional filters (admin only)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const getAllUsersController = async (req, res) => {
  const filters = {
    emailVerified: req.query.emailVerified,
    active: req.query.active,
    search: req.query.search,
  };

  // Convert string values to boolean
  if (filters.emailVerified !== undefined) {
    filters.emailVerified = filters.emailVerified === "true";
  }
  if (filters.active !== undefined) {
    filters.active = filters.active === "true";
  }

  const users = await getAllUsers(filters);
  ResponseFactory.ok(res, "Users fetched successfully", users);
};

/**
 * Toggle user active status (admin only)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const toggleUserStatusController = async (req, res) => {
  const { userId } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== "boolean") {
    return ResponseFactory.badRequest(res, "isActive must be a boolean value");
  }

  const updatedUser = await toggleUserStatus(userId, isActive);
  ResponseFactory.ok(
    res,
    `User ${isActive ? "activated" : "deactivated"} successfully`,
    updatedUser
  );
};

/**
 * Make user an admin (super admin only)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const makeUserAdminController = async (req, res) => {
  const { userId } = req.params;
  const { adminRole = "supportAdmin" } = req.body;

  // Check if current user is super admin
  if (req.user.userType !== "superAdmin") {
    return ResponseFactory.forbidden(
      res,
      "Only super admins can promote users to admin"
    );
  }

  const updatedUser = await makeUserAdmin(userId, adminRole);
  ResponseFactory.ok(
    res,
    `User promoted to ${adminRole} successfully`,
    updatedUser
  );
};

/**
 * Get all admin users with optional filters (admin only)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const getAllAdminsController = async (req, res) => {
  const filters = {
    emailVerified: req.query.emailVerified,
    active: req.query.active,
    search: req.query.search,
  };

  // Convert string values to boolean
  if (filters.emailVerified !== undefined) {
    filters.emailVerified = filters.emailVerified === "true";
  }
  if (filters.active !== undefined) {
    filters.active = filters.active === "true";
  }

  const admins = await getAllAdmins(filters);
  ResponseFactory.ok(res, "Admins fetched successfully", admins);
};

/**
 * Remove admin privileges from user (super admin only)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const removeAdminPrivilegesController = async (req, res) => {
  const { userId } = req.params;

  // Check if current user is super admin
  if (req.user.userType !== "superAdmin") {
    return ResponseFactory.forbidden(
      res,
      "Only super admins can remove admin privileges"
    );
  }

  const updatedUser = await removeAdminPrivileges(userId);
  ResponseFactory.ok(res, "Admin privileges removed successfully", updatedUser);
};
