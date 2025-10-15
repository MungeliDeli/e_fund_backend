/**
 * Organization User Controller
 *
 * Handles HTTP requests for organization user profile management, including public/private profile
 * fetching and profile/cover image upload. Delegates business logic to the Organization User Service
 * and formats API responses.
 *
 * Key Features:
 * - Public and private organization profile endpoints
 * - Profile and cover image upload endpoint
 * - Organization listing endpoint
 * - Consistent API response formatting
 * - Error handling and validation
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { getUserById } from "./user.service.js";
import { ResponseFactory } from "../../../utils/response.utils.js";
import { NotFoundError } from "../../../utils/appError.js";
import * as userService from "./user.service.js";
import logger from "../../../utils/logger.js";

/**
 * Get a public organization user profile (anyone can access)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const getUserProfile = async (req, res) => {
  const userId = req.params.userId;
  const profile = await getUserById(userId, false);
  if (!profile) throw new NotFoundError("Organization user/profile not found");
  ResponseFactory.ok(
    res,
    "Organization user public profile fetched successfully",
    profile
  );
};

/**
 * Get the private profile of the authenticated organization user (owner only)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export const getMyProfile = async (req, res) => {
  const userId = req.user.userId;
  const profile = await getUserById(userId, true);
  if (!profile) throw new NotFoundError("Organization user/profile not found");
  ResponseFactory.ok(
    res,
    "Organization user private profile fetched successfully",
    profile
  );
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
 * Update the profile and/or cover image for the authenticated organization user
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
    "Organization profile image(s) updated successfully",
    updatedProfile
  );
};

/**
 * Update the profile information for the authenticated organization user
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (req, res) => {
  const userId = req.user.userId;
  const updatedProfile = await userService.updateUserProfile(userId, req.body);

  ResponseFactory.ok(
    res,
    "Organization profile information updated successfully",
    updatedProfile
  );
};

/**
 * Update payout settings for the authenticated organization user
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export const updatePayoutSettings = async (req, res) => {
  const userId = req.user.userId;
  const updatedProfile = await userService.updatePayoutSettings(
    userId,
    req.body
  );

  ResponseFactory.ok(
    res,
    "Payout settings updated successfully",
    updatedProfile
  );
};

/**
 * Update organization profile with both data and images
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export const updateOrganizationProfileWithImages = async (req, res) => {
  const userId = req.user.userId;
  const files = req.files || {};
  const profilePictureFile = files.profilePicture?.[0] || null;
  const coverPictureFile = files.coverPicture?.[0] || null;

  // Extract profile data from body (excluding files)
  const profileData = { ...req.body };

  const updatedProfile = await userService.updateOrganizationProfileWithImages(
    userId,
    profileData,
    profilePictureFile,
    coverPictureFile
  );

  ResponseFactory.ok(
    res,
    "Organization profile updated successfully",
    updatedProfile
  );
};

/**
 * Get a list of organization users (organizers) with optional filters
 * @route GET /api/v1/users/organizers
 */
export const getOrganizers = async (req, res) => {
  // Parse filters from query params
  const filters = {};
  if (req.query.verified !== undefined) {
    filters.verified = req.query.verified === "true";
  }
  if (req.query.active !== undefined) {
    filters.active = req.query.active === "true";
  }
  if (req.query.search) {
    filters.search = req.query.search;
  }
  const organizers = await userService.getOrganizers(filters);
  ResponseFactory.ok(res, "Organizers fetched successfully", organizers);
};
