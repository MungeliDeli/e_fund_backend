/**
 * User Service
 *
 * Contains business logic for user profile management, including public/private profile
 * formatting, profile/cover image upload, and database transaction handling. Used by
 * both the User Controller and other modules for user-related operations.
 *
 * Key Features:
 * - Public and private profile formatting
 * - Profile and cover image upload to S3
 * - Media record creation and profile update in DB
 * - Transaction management for atomic updates
 * - Error handling and logging
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { getUserWithProfileById } from "./user.repository.js";
import { NotFoundError, DatabaseError } from "../../../utils/appError.js";
import { uploadFileToS3, getPublicS3Url } from "../../../utils/s3.utils.js";
import { v4 as uuidv4 } from "uuid";
import userRepository from "./user.repository.js";
import logger from "../../../utils/logger.js";
import { query, transaction } from "../../../db/index.js";
import sharp from "sharp";
import { logUserAction } from "../../audit/audit.utils.js";
import { USER_ACTIONS } from "../../audit/audit.constants.js";

const MAX_IMAGE_DIMENSION = 1024;
const JPEG_QUALITY = 80;

// Helper to filter fields for public/private view (individual users only)
function formatProfile(user, profile, isOwner) {
  if (!user || !profile) return null;

  // Only handle individual users
  if (user.userType !== "individualUser") {
    return null;
  }

  // Generate public URLs for profile and cover pictures
  const profilePictureUrl = profile.profilePictureFileName
    ? getPublicS3Url(profile.profilePictureFileName)
    : null;
  const coverPictureUrl = profile.coverPictureFileName
    ? getPublicS3Url(profile.coverPictureFileName)
    : null;

  // Individual user profile
  const publicFields = {
    userId: user.userId,
    userType: user.userType,
    firstName: profile.firstName,
    lastName: profile.lastName,
    gender: profile.gender,
    country: profile.country,
    city: profile.city,
    profilePictureUrl,
    coverPictureUrl,
    createdAt: profile.createdAt,
  };

  if (isOwner) {
    return {
      ...publicFields,
      email: user.email,
      phoneNumber: profile.phoneNumber,
      dateOfBirth: profile.dateOfBirth,
      address: profile.address,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
    };
  }

  return publicFields;
}

/**
 * Get a user profile by userId, formatted for public or private view
 * @param {string} userId - User ID
 * @param {boolean} isOwner - Whether the requester is the profile owner
 * @returns {Promise<Object>} Formatted profile object
 */
export const getUserById = async (userId, isOwner = false) => {
  const { user, profile } = await getUserWithProfileById(userId);
  if (!user || !profile) throw new NotFoundError("User/profile not found");

  // Only handle individual users in this service
  if (user.userType !== "individualUser") {
    throw new NotFoundError("Individual user not found");
  }

  return formatProfile(user, profile, isOwner);
};

/**
 * Update a user's profile information.
 * @param {string} userId - The ID of the user to update.
 * @param {object} profileData - The profile data to update.
 * @returns {Promise<Object>} The updated profile data.
 */
export const updateUserProfile = async (userId, profileData) => {
  try {
    logger.info("Updating individual user profile in service", { userId });

    // Get user info to verify it's an individual user
    const { user } = await getUserWithProfileById(userId);

    if (user.userType !== "individualUser") {
      throw new DatabaseError(
        "Only individual users can update profiles through this service"
      );
    }

    const updatedProfile = await userRepository.updateUserProfile(
      userId,
      profileData
    );

    if (!updatedProfile) {
      throw new NotFoundError("User profile not found or no fields to update.");
    }

    // After updating, refetch the full profile to return consistent data
    const { user: updatedUser, profile: updatedProfileData } =
      await getUserWithProfileById(userId);
    // isOwner is true since the user is updating their own profile
    const formattedProfile = formatProfile(
      updatedUser,
      updatedProfileData,
      true
    );

    // Log audit event for profile update
    if (global.req) {
      await logUserAction(
        global.req,
        USER_ACTIONS.USER_PROFILE_UPDATED,
        userId,
        {
          userType: updatedUser.userType,
          updatedFields: Object.keys(profileData),
        }
      );
    }

    return formattedProfile;
  } catch (error) {
    logger.error("Failed to update individual user profile in service", {
      error: error.message,
      userId,
    });
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to update individual user profile.", error);
  }
};

/**
 * Update the profile and/or cover image for a user
 * Uploads files to S3, creates media records, and updates profile in DB
 * @param {string} userId - User ID
 * @param {Object|null} profilePictureFile - Multer file object for profile picture
 * @param {Object|null} coverPictureFile - Multer file object for cover picture
 * @returns {Promise<Object>} Updated profile object
 */
export const updateProfileImage = async (
  userId,
  profilePictureFile,
  coverPictureFile
) => {
  // Only for individual users for now
  const { user, profile } = await getUserWithProfileById(userId);
  if (!user || !profile) throw new NotFoundError("User/profile not found");
  if (user.userType !== "individualUser")
    throw new DatabaseError("Only individual users can update profile images");

  let profilePictureMediaId = null;
  let coverPictureMediaId = null;
  let profilePictureMediaRecord = null;
  let coverPictureMediaRecord = null;

  // Helper to process and compress image with sharp
  async function processImage(file) {
    if (!file) return null;
    // Use sharp to resize and compress
    const outputBuffer = await sharp(file.buffer)
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: "inside",
      })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    return {
      buffer: outputBuffer,
      originalname: file.originalname.replace(/\.[^.]+$/, ".jpg"),
      mimetype: "image/jpeg",
      size: outputBuffer.length,
    };
  }

  // Upload and create media record for profile picture
  if (profilePictureFile) {
    logger.info("Processing and compressing profile picture with sharp", {
      userId,
      fileName: profilePictureFile.originalname,
      fileSize: profilePictureFile.size,
    });
    const processed = await processImage(profilePictureFile);
    const s3Key = await uploadFileToS3({
      fileBuffer: processed.buffer,
      fileName: processed.originalname,
      mimeType: processed.mimetype,
      folder: "user-profiles",
    });
    logger.info("Profile picture uploaded to S3 successfully", {
      userId,
      s3Key,
      fileName: processed.originalname,
    });
    profilePictureMediaId = uuidv4();
    profilePictureMediaRecord = {
      mediaId: profilePictureMediaId,
      entityType: "individualProfile",
      entityId: userId,
      mediaType: "image",
      fileName: s3Key,
      fileSize: processed.size,
      description: "Profile picture",
      altText: "",
      uploadedByUserId: userId,
    };
  }
  // Upload and create media record for cover picture
  if (coverPictureFile) {
    logger.info("Processing and compressing cover picture with sharp", {
      userId,
      fileName: coverPictureFile.originalname,
      fileSize: coverPictureFile.size,
    });
    const processed = await processImage(coverPictureFile);
    const s3Key = await uploadFileToS3({
      fileBuffer: processed.buffer,
      fileName: processed.originalname,
      mimeType: processed.mimetype,
      folder: "user-profiles",
    });
    logger.info("Cover picture uploaded to S3 successfully", {
      userId,
      s3Key,
      fileName: processed.originalname,
    });
    coverPictureMediaId = uuidv4();
    coverPictureMediaRecord = {
      mediaId: coverPictureMediaId,
      entityType: "individualProfile",
      entityId: userId,
      mediaType: "image",
      fileName: s3Key,
      fileSize: processed.size,
      description: "Cover picture",
      altText: "",
      uploadedByUserId: userId,
    };
  }

  // Update DB in a transaction
  await transaction(async (client) => {
    if (profilePictureMediaRecord) {
      await userRepository.createMediaRecord(profilePictureMediaRecord, client);
      await userRepository.updateProfileMediaId(
        userId,
        "profilePictureMediaId",
        profilePictureMediaId,
        client
      );
      logger.info(
        "Profile picture media record created and profile updated in database",
        {
          userId,
          mediaId: profilePictureMediaId,
        }
      );
    }
    if (coverPictureMediaRecord) {
      await userRepository.createMediaRecord(coverPictureMediaRecord, client);
      await userRepository.updateProfileMediaId(
        userId,
        "coverPictureMediaId",
        coverPictureMediaId,
        client
      );
      logger.info(
        "Cover picture media record created and profile updated in database",
        {
          userId,
          mediaId: coverPictureMediaId,
        }
      );
    }
  });

  // Return updated profile
  const { user: updatedUser, profile: updatedProfile } =
    await getUserWithProfileById(userId);

  logger.info("Profile image update completed successfully", {
    userId,
    profilePictureUpdated: !!profilePictureFile,
    coverPictureUpdated: !!coverPictureFile,
  });

  return formatProfile(updatedUser, updatedProfile, true);
};

/**
 * Get a signed S3 URL for a media file by mediaId
 * @param {string} mediaId - Media record ID
 * @returns {Promise<Object>} Media data including signed URL and metadata
 */
export const getMediaUrl = async (mediaId) => {
  try {
    // Get media record from database
    const mediaRecord = await userRepository.getMediaRecord(mediaId);
    if (!mediaRecord) {
      throw new NotFoundError("Media not found");
    }

    // GENERATE PUBLIC URL INSTEAD OF SIGNED URL
    const publicUrl = getPublicS3Url(mediaRecord.fileName);

    logger.info("Media URL generated successfully", {
      mediaId,
      fileName: mediaRecord.fileName,
      expiresIn: "1 hour",
    });

    return {
      mediaId: mediaRecord.mediaId,
      url: publicUrl,
      fileName: mediaRecord.fileName,
      fileSize: mediaRecord.fileSize,
      description: mediaRecord.description,
      altText: mediaRecord.altText,
    };
  } catch (error) {
    logger.error("Failed to get media URL", { error: error.message, mediaId });
    throw error;
  }
};
