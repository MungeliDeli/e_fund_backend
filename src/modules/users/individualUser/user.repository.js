/**
 * User Repository
 *
 * Handles all database operations for user profile management, including fetching user
 * and profile data, and creating/updating media records. Provides a data access layer
 * for the User Service, abstracting SQL queries and transactions.
 *
 * Key Features:
 * - Fetch user and profile data by userId
 * - Create media records for profile/cover images
 * - Update profile media IDs in the database
 * - Error handling and logging
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { query } from "../../../db/index.js";
import { DatabaseError, NotFoundError } from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";

/**
 * Fetch user and profile data by userId
 * @param {string} userId - User ID
 * @returns {Promise<{user: Object, profile: Object}>}
 */
export const getUserWithProfileById = async (userId) => {
  try {
    logger.info("Fetching individual user/profile by ID", { userId });
    // Fetch user
    const userResult = await query(
      `SELECT "userId", email, "userType", "isEmailVerified", "isActive", "createdAt" FROM "users" WHERE "userId" = $1`,
      [userId]
    );
    if (userResult.rowCount === 0) throw new NotFoundError("User not found");
    const user = userResult.rows[0];

    // Only handle individual users
    if (user.userType !== "individualUser") {
      throw new NotFoundError("Individual user not found");
    }

    let profile = null;
    const profileResult = await query(
      `SELECT 
        p."firstName", p."lastName", p."phoneNumber", p.gender, p."dateOfBirth", 
        p.country, p.city, p.address, p."profilePictureMediaId", p."coverPictureMediaId", 
        p."createdAt",
        pp."fileName" AS profilePictureFileName,
        cp."fileName" AS coverPictureFileName
      FROM "individualProfiles" p
      LEFT JOIN "media" pp ON p."profilePictureMediaId" = pp."mediaId"
      LEFT JOIN "media" cp ON p."coverPictureMediaId" = cp."mediaId"
      WHERE p."userId" = $1`,
      [userId]
    );
    profile = profileResult.rows[0] || null;

    return { user, profile };
  } catch (error) {
    logger.error("Failed to fetch individual user/profile", {
      error: error.message,
      userId,
    });
    throw new DatabaseError("Failed to fetch individual user/profile", error);
  }
};

const userRepository = {
  /**
   * Create a media record in the media table
   * @param {Object} mediaRecord - Media record data
   * @param {Object} [client] - Optional DB client for transaction
   * @returns {Promise<void>}
   */
  async createMediaRecord(mediaRecord, client) {
    const executor = client || { query };
    const {
      mediaId,
      entityType,
      entityId,
      mediaType,
      fileName,
      fileSize,
      description,
      altText,
      uploadedByUserId,
    } = mediaRecord;
    const queryText = `
      INSERT INTO "media" ("mediaId", "entityType", "entityId", "mediaType", "fileName", "fileSize", description, "altText", "uploadedByUserId")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    await executor.query(queryText, [
      mediaId,
      entityType,
      entityId,
      mediaType,
      fileName,
      fileSize,
      description,
      altText,
      uploadedByUserId,
    ]);
  },
  /**
   * Update the profile's media ID field (profilePictureMediaId or coverPictureMediaId)
   * @param {string} userId - User ID
   * @param {string} field - Field to update
   * @param {string} mediaId - Media record ID
   * @param {Object} [client] - Optional DB client for transaction
   * @returns {Promise<void>}
   */
  async updateProfileMediaId(userId, field, mediaId, client) {
    const executor = client || { query };
    // Validate and safely inject the column identifier
    const allowedFields = ["profilePictureMediaId", "coverPictureMediaId"];
    if (!allowedFields.includes(field)) {
      throw new DatabaseError(`Invalid profile media field: ${field}`);
    }

    const queryText = `
      UPDATE "individualProfiles" SET "${field}" = $1 WHERE "userId" = $2
    `;
    await executor.query(queryText, [mediaId, userId]);
  },
  /**
   * Fetch a media record by mediaId
   * @param {string} mediaId - Media record ID
   * @returns {Promise<Object|null>} Media record or null if not found
   */
  async updateUserProfile(userId, profileData) {
    const { firstName, lastName, country, city, address } = profileData;

    const fields = {
      firstName: firstName,
      lastName: lastName,
      country,
      city,
      address,
    };

    const setClauses = [];
    const values = [];
    let valueIndex = 1;

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        setClauses.push(`${key} = $${valueIndex++}`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) {
      return null; // Or throw an error if no fields are being updated
    }

    values.push(userId);
    const queryText = `
      UPDATE "individualProfiles"
      SET ${setClauses.join(", ")}
      WHERE "userId" = $${valueIndex}
      RETURNING *;
    `;

    try {
      const result = await query(queryText, values);
      if (result.rowCount === 0) {
        throw new NotFoundError("Profile not found for the given user ID.");
      }
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to update user profile in repository", {
        error: error.message,
        userId,
      });
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError("Failed to update user profile.", error);
    }
  },

  async getMediaRecord(mediaId) {
    try {
      const queryText = `
        SELECT "mediaId", "entityType", "entityId", "mediaType", "fileName", "fileSize", description, "altText", "uploadedByUserId", "createdAt"
        FROM "media" WHERE "mediaId" = $1
      `;
      const result = await query(queryText, [mediaId]);

      if (result.rowCount === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        mediaId: row.mediaId,
        entityType: row.entityType,
        entityId: row.entityId,
        mediaType: row.mediaType,
        fileName: row.fileName,
        fileSize: row.fileSize,
        description: row.description,
        altText: row.altText,
        uploadedByUserId: row.uploadedByUserId,
        createdAt: row.createdAt,
      };
    } catch (error) {
      logger.error("Failed to get media record", {
        error: error.message,
        mediaId,
      });
      throw new DatabaseError("Failed to get media record", error);
    }
  },
};

export default userRepository;
