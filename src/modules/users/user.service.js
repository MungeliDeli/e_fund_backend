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
import { NotFoundError, DatabaseError } from "../../utils/appError.js";
import { uploadFileToS3, getPublicS3Url } from "../../utils/s3.utils.js";
import { v4 as uuidv4 } from "uuid";
import userRepository from "./user.repository.js";
import logger from "../../utils/logger.js";
import { query, transaction } from "../../db/index.js";
import sharp from "sharp";

const MAX_IMAGE_DIMENSION = 1024;
const JPEG_QUALITY = 80;

// Helper to filter fields for public/private view
function formatProfile(user, profile, isOwner) {
  if (!user || !profile) return null;
  if (user.user_type === "individual_user") {
    // Individual user profile
    const publicFields = {
      userId: user.user_id,
      userType: user.user_type,
      firstName: profile.first_name,
      lastName: profile.last_name,
      gender: profile.gender,
      country: profile.country,
      city: profile.city,
      profilePictureMediaId: profile.profile_picture_media_id,
      coverPictureMediaId: profile.cover_picture_media_id,
      createdAt: profile.created_at,
    };
    if (isOwner) {
      return {
        ...publicFields,
        email: user.email,
        phoneNumber: profile.phone_number,
        dateOfBirth: profile.date_of_birth,
        address: profile.address,
        isEmailVerified: user.is_email_verified,
        isActive: user.is_active,
      };
    }
    return publicFields;
  } else if (user.user_type === "organization_user") {
    // Organization user profile
    const publicFields = {
      userId: user.user_id,
      userType: user.user_type,
      organizationName: profile.organization_name,
      organizationShortName: profile.organization_short_name,
      organizationType: profile.organization_type,
      officialWebsiteUrl: profile.official_website_url,
      profilePictureMediaId: profile.profile_picture_media_id,
      coverPictureMediaId: profile.cover_picture_media_id,
      address: profile.address,
      missionDescription: profile.mission_description,
      establishmentDate: profile.establishment_date,
      campusAffiliationScope: profile.campus_affiliation_scope,
      affiliatedSchoolsNames: profile.affiliated_schools_names,
      affiliatedDepartmentNames: profile.affiliated_department_names,
      createdAt: profile.created_at,
    };
    if (isOwner) {
      return {
        ...publicFields,
        email: user.email,
        officialEmail: profile.official_email,
        primaryContactPersonName: profile.primary_contact_person_name,
        primaryContactPersonEmail: profile.primary_contact_person_email,
        primaryContactPersonPhone: profile.primary_contact_person_phone,
        isEmailVerified: user.is_email_verified,
        isActive: user.is_active,
      };
    }
    return publicFields;
  }
  return null;
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
    logger.info("Updating user profile in service", { userId });

    const updatedProfile = await userRepository.updateUserProfile(
      userId,
      profileData
    );

    if (!updatedProfile) {
      throw new NotFoundError("User profile not found or no fields to update.");
    }

    // After updating, refetch the full profile to return consistent data
    const { user, profile } = await getUserWithProfileById(userId);
    // isOwner is true since the user is updating their own profile
    const formattedProfile = formatProfile(user, profile, true);

    return formattedProfile;
  } catch (error) {
    logger.error("Failed to update user profile in service", {
      error: error.message,
      userId,
    });
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to update user profile.", error);
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
  if (user.user_type !== "individual_user")
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
        "profile_picture_media_id",
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
        "cover_picture_media_id",
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

/**
 * Get a list of organization users (organizers) with optional filters
 * @param {Object} filters - { verified, active, search }
 * @returns {Promise<Array>} List of formatted organizer profiles
 */
export const getOrganizers = async (filters = {}) => {
  const organizers = await userRepository.findOrganizers(filters);
  // Format for frontend table (add status, active, logoImageUrl, etc.)
  return organizers.map((org) => {
    let logoImageUrl = null;
    if (org.profile_picture_file_name) {
      logoImageUrl = getPublicS3Url(org.profile_picture_file_name);
    }
    return {
      userId: org.user_id,
      organizationName: org.organization_name,
      organizationShortName: org.organization_short_name,
      organizationType: org.organization_type,
      email: org.official_email || org.email,
      status: org.is_email_verified ? "VERIFIED" : "PENDING",
      active: !!org.is_active,
      profilePictureMediaId: org.profile_picture_media_id,
      coverPictureMediaId: org.cover_picture_media_id,
      createdAt: org.created_at,
      officialWebsiteUrl: org.official_website_url,
      logoImageUrl,
    };
  });
};
