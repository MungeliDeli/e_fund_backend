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

import { query } from "../../db/index.js";
import { DatabaseError, NotFoundError } from "../../utils/appError.js";
import logger from "../../utils/logger.js";

/**
 * Fetch user and profile data by userId
 * @param {string} userId - User ID
 * @returns {Promise<{user: Object, profile: Object}>}
 */
export const getUserWithProfileById = async (userId) => {
  try {
    logger.info("Fetching user/profile by ID", { userId });
    // Fetch user
    const userResult = await query(
      `SELECT user_id, email, user_type, is_email_verified, is_active, created_at FROM users WHERE user_id = $1`,
      [userId]
    );
    if (userResult.rowCount === 0) throw new NotFoundError("User not found");
    const user = userResult.rows[0];
    let profile = null;
    if (user.user_type === "individual_user") {
      const profileResult = await query(
        `SELECT first_name, last_name, phone_number, gender, date_of_birth, country, city, address, profile_picture_media_id, cover_picture_media_id, created_at FROM individual_profiles WHERE user_id = $1`,
        [userId]
      );
      profile = profileResult.rows[0] || null;
    } else if (user.user_type === "organization_user") {
      const profileResult = await query(
        `SELECT organization_name, organization_short_name, organization_type, official_email, official_website_url, profile_picture_media_id, cover_picture_media_id, address, mission_description, establishment_date, campus_affiliation_scope, affiliated_schools_names, affiliated_department_names, primary_contact_person_name, primary_contact_person_email, primary_contact_person_phone, created_by_admin_id, created_at FROM organization_profiles WHERE user_id = $1`,
        [userId]
      );
      profile = profileResult.rows[0] || null;
    }
    return { user, profile };
  } catch (error) {
    logger.error("Failed to fetch user/profile", {
      error: error.message,
      userId,
    });
    throw new DatabaseError("Failed to fetch user/profile", error);
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
      INSERT INTO media (media_id, entity_type, entity_id, media_type, file_name, file_size, description, alt_text, uploaded_by_user_id)
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
   * Update the profile's media ID field (profile_picture_media_id or cover_picture_media_id)
   * @param {string} userId - User ID
   * @param {string} field - Field to update
   * @param {string} mediaId - Media record ID
   * @param {Object} [client] - Optional DB client for transaction
   * @returns {Promise<void>}
   */
  async updateProfileMediaId(userId, field, mediaId, client) {
    const executor = client || { query };
    const queryText = `
      UPDATE individual_profiles SET ${field} = $1 WHERE user_id = $2
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
      first_name: firstName,
      last_name: lastName,
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
      UPDATE individual_profiles
      SET ${setClauses.join(", ")}
      WHERE user_id = $${valueIndex}
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
        SELECT media_id, entity_type, entity_id, media_type, file_name, file_size, description, alt_text, uploaded_by_user_id, created_at
        FROM media WHERE media_id = $1
      `;
      const result = await query(queryText, [mediaId]);

      if (result.rowCount === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        mediaId: row.media_id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        mediaType: row.media_type,
        fileName: row.file_name,
        fileSize: row.file_size,
        description: row.description,
        altText: row.alt_text,
        uploadedByUserId: row.uploaded_by_user_id,
        createdAt: row.created_at,
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
      let whereClauses = ["u.user_type = 'organization_user'"];
      let values = [];
      let idx = 1;
      if (filters.verified !== undefined) {
        whereClauses.push(`u.is_email_verified = $${idx++}`);
        values.push(filters.verified);
      }
      if (filters.active !== undefined) {
        whereClauses.push(`u.is_active = $${idx++}`);
        values.push(filters.active);
      }
      if (filters.search) {
        whereClauses.push(`(
          p.organization_name ILIKE $${idx} OR 
          p.organization_short_name ILIKE $${idx} OR 
          p.official_email ILIKE $${idx} OR 
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
          u.user_id, u.email, u.is_email_verified, u.is_active, u.created_at,
          p.organization_name, p.organization_short_name, p.organization_type, p.official_email, p.official_website_url,
          p.profile_picture_media_id, p.cover_picture_media_id,
          m.file_name AS profile_picture_file_name
        FROM users u
        JOIN organization_profiles p ON u.user_id = p.user_id
        LEFT JOIN media m ON p.profile_picture_media_id = m.media_id
        ${where}
        ORDER BY p.organization_name ASC
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
