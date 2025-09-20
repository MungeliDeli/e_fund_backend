/**
 * Organization User Repository
 *
 * Handles all database operations for organization user profile management, including fetching organization
 * and profile data, and creating/updating media records. Provides a data access layer
 * for the Organization User Service, abstracting SQL queries and transactions.
 *
 * Key Features:
 * - Fetch organization user and profile data by userId
 * - Create media records for profile/cover images
 * - Update organization profile media IDs in the database
 * - Organization profile update operations
 * - Error handling and logging
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { query } from "../../../db/index.js";
import { DatabaseError, NotFoundError } from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";

/**
 * Fetch organization user and profile data by userId
 * @param {string} userId - User ID
 * @returns {Promise<{user: Object, profile: Object}>}
 */
export const getUserWithProfileById = async (userId) => {
  try {
    logger.info("Fetching organization user/profile by ID", { userId });
    // Fetch user
    const userResult = await query(
      `SELECT "userId", email, "userType", "isEmailVerified", "isActive", "createdAt" FROM "users" WHERE "userId" = $1`,
      [userId]
    );
    if (userResult.rowCount === 0) throw new NotFoundError("User not found");
    const user = userResult.rows[0];

    // Only handle organization users
    if (user.userType !== "organizationUser") {
      throw new NotFoundError("Organization user not found");
    }

    let profile = null;
    const profileResult = await query(
      `SELECT 
        p."organizationName", p."organizationShortName", p."organizationType", 
        p."officialEmail", p."officialWebsiteUrl", p."profilePictureMediaId", 
        p."coverPictureMediaId", p.address, p."missionDescription", 
        p."establishmentDate", p."campusAffiliationScope", 
        p."primaryContactPersonName", 
        p."primaryContactPersonEmail", p."primaryContactPersonPhone", 
        p."createdByAdminId", p."createdAt",
        pp."fileName" AS "profilePictureFileName",
        cp."fileName" AS "coverPictureFileName"
      FROM "organizationProfiles" p
      LEFT JOIN "media" pp ON p."profilePictureMediaId" = pp."mediaId"
      LEFT JOIN "media" cp ON p."coverPictureMediaId" = cp."mediaId"
      WHERE p."userId" = $1`,
      [userId]
    );
    profile = profileResult.rows[0] || null;

    return { user, profile };
  } catch (error) {
    logger.error("Failed to fetch organization user/profile", {
      error: error.message,
      userId,
    });
    throw new DatabaseError("Failed to fetch organization user/profile", error);
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
   * Update the organization profile's media ID field (profilePictureMediaId or coverPictureMediaId)
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
      UPDATE "organizationProfiles" SET "${field}" = $1 WHERE "userId" = $2
    `;
    await executor.query(queryText, [mediaId, userId]);
  },

  /**
   * Update organization profile information
   * @param {string} userId - The ID of the user to update
   * @param {Object} profileData - The organization profile data to update
   * @param {Object} [client] - Optional DB client for transaction
   * @returns {Promise<Object>} Updated organization profile
   */
  async updateOrganizationProfile(userId, profileData, client = null) {
    const {
      organizationName,
      organizationShortName,
      organizationType,
      officialEmail,
      officialWebsiteUrl,
      address,
      missionDescription,
      establishmentDate,
      campusAffiliationScope,
      primaryContactPersonName,
      primaryContactPersonEmail,
      primaryContactPersonPhone,
    } = profileData;

    const fields = {
      organizationName,
      organizationShortName,
      organizationType,
      officialEmail,
      officialWebsiteUrl,
      address,
      missionDescription,
      establishmentDate,
      campusAffiliationScope,
      primaryContactPersonName,
      primaryContactPersonEmail,
      primaryContactPersonPhone,
    };

    const setClauses = [];
    const values = [];
    let valueIndex = 1;

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        setClauses.push(`"${key}" = $${valueIndex++}`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) {
      return null; // No fields to update
    }

    values.push(userId);
    const queryText = `
      UPDATE "organizationProfiles"
      SET ${setClauses.join(", ")}
      WHERE "userId" = $${valueIndex}
      RETURNING *;
    `;

    try {
      const executor = client || { query };
      const result = await executor.query(queryText, values);
      if (result.rowCount === 0) {
        throw new NotFoundError(
          "Organization profile not found for the given user ID."
        );
      }
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to update organization profile in repository", {
        error: error.message,
        userId,
      });
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError("Failed to update organization profile.", error);
    }
  },

  /**
   * Fetch a media record by mediaId
   * @param {string} mediaId - Media record ID
   * @returns {Promise<Object|null>} Media record or null if not found
   */
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

  /**
   * Fetch a list of organization users (organizers) with optional filters
   * @param {Object} filters - { verified, active, search }
   * @returns {Promise<Array>} List of organizers with user and profile info
   */
  async findOrganizers(filters = {}) {
    try {
      let whereClauses = [`u."userType" = 'organizationUser'`];
      let values = [];
      let idx = 1;
      if (filters.verified !== undefined) {
        whereClauses.push(`u."isEmailVerified" = $${idx++}`);
        values.push(filters.verified);
      }
      if (filters.active !== undefined) {
        whereClauses.push(`u."isActive" = $${idx++}`);
        values.push(filters.active);
      }
      if (filters.search) {
        whereClauses.push(`(
          p."organizationName" ILIKE $${idx} OR 
          p."organizationShortName" ILIKE $${idx} OR 
          p."officialEmail" ILIKE $${idx} OR 
          u.email ILIKE $${idx}
        )`);
        values.push(`%${filters.search}%`);
        idx++;
      }
      const where = whereClauses.length
        ? "WHERE " + whereClauses.join(" AND ")
        : "";
      const queryText = `
        SELECT 
          u."userId", u.email, u."isEmailVerified", u."isActive", u."createdAt",
          p."organizationName", p."organizationShortName", p."organizationType", p."officialEmail", p."officialWebsiteUrl",
          p."profilePictureMediaId", p."coverPictureMediaId",
          m."fileName" AS profilePictureFileName
          FROM "users" u
          JOIN "organizationProfiles" p ON u."userId" = p."userId"
        LEFT JOIN media m ON p."profilePictureMediaId" = m."mediaId"
        ${where}
        ORDER BY p."organizationName" ASC
      `;
      const result = await query(queryText, values);
      return result.rows;
    } catch (error) {
      logger.error("Failed to fetch organizers", {
        error: error.message,
        filters,
      });
      throw new DatabaseError("Failed to fetch organizers", error);
    }
  },
};

export default userRepository;
