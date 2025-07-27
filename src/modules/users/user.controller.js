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

import { getUserById } from "./user.service.js";
import { ResponseFactory } from "../../utils/response.utils.js";
import { updateProfileSchema } from "./user.validation.js";
import { NotFoundError } from "../../utils/appError.js";
import * as userService from "./user.service.js";
import logger from "../../utils/logger.js";

/**
 * Get a public user profile (anyone can access)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {Promise<void>}
 */
export const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const profile = await getUserById(userId, false);
    if (!profile) throw new NotFoundError("User/profile not found");
    ResponseFactory.ok(
      res,
      "User public profile fetched successfully",
      profile
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get the private profile of the authenticated user (owner only)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 * @returns {Promise<void>}
 */
export const getMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const profile = await getUserById(userId, true);
    if (!profile) throw new NotFoundError("User/profile not found");
    ResponseFactory.ok(
      res,
      "User private profile fetched successfully",
      profile
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get a signed S3 URL for a media file by mediaId
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 * @returns {Promise<void>}
 */
export const getMediaUrl = async (req, res, next) => {
  try {
    const { mediaId } = req.params;
    const mediaData = await userService.getMediaUrl(mediaId);
    logger.info(mediaData);
    ResponseFactory.ok(res, "Media URL generated successfully", mediaData);
  } catch (error) {
    next(error);
  }
};

/**
 * Update the profile and/or cover image for the authenticated user
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 * @returns {Promise<void>}
 */
export const updateProfileImage = async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
};
/**
 * Update the profile and/or cover image for the authenticated user
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (req, res, next) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      // Extract validation error messages
      const errorMessages = error.details
        .map((detail) => detail.message)
        .join(", ");
      // In a real app, you might use a custom ValidationError class
      return ResponseFactory.badRequest(
        res,
        `Validation failed: ${errorMessages}`
      );
    }

    const userId = req.user.userId;
    const updatedProfile = await userService.updateUserProfile(userId, value);

    ResponseFactory.ok(
      res,
      "Profile information updated successfully",
      updatedProfile
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get a list of organization users (organizers) with optional filters
 * @route GET /api/v1/users/organizers
 */
export const getOrganizers = async (req, res, next) => {
  try {
    // Parse filters from query params
    const filters = {};
    if (req.query.verified !== undefined) {
      filters.verified = req.query.verified === "true";
    }
    if (req.query.active !== undefined) {
      filters.active = req.query.active === "true";
    }
    const organizers = await userService.getOrganizers(filters);
    ResponseFactory.ok(res, "Organizers fetched successfully", organizers);
  } catch (error) {
    next(error);
  }
};
