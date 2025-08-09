/**
 * Segment Repository
 *
 * Handles all database operations for segments (contact lists).
 * Provides data access layer for segment CRUD operations.
 *
 * Key Features:
 * - Segment CRUD operations
 * - Database query optimization
 * - Error handling for database operations
 * - Data validation and sanitization
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { query, transaction } from "../../../db/index.js";
import {
  DatabaseError,
  NotFoundError,
  ConflictError,
} from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";

/**
 * Create a new segment
 * @param {Object} segmentData - Segment data
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Object>} Created segment
 */
export const createSegment = async (segmentData, organizerId) => {
  return await transaction(async (client) => {
    const { name, description } = segmentData;

    // Check if segment name already exists for this organizer
    const nameCheckQuery = `
      SELECT segment_id FROM segments 
      WHERE organizer_id = $1 AND name = $2
    `;
    const nameCheckResult = await client.query(nameCheckQuery, [
      organizerId,
      name,
    ]);

    if (nameCheckResult.rows.length > 0) {
      throw new ConflictError("Segment name already exists for this organizer");
    }

    // Insert new segment
    const insertQuery = `
      INSERT INTO segments (organizer_id, name, description)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await client.query(insertQuery, [
      organizerId,
      name,
      description,
    ]);

    logger.info("Segment created successfully", {
      segmentId: result.rows[0].segment_id,
      organizerId,
      name,
    });

    return result.rows[0];
  });
};

/**
 * Get all segments for an organizer
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Array>} Array of segments
 */
export const getSegmentsByOrganizer = async (organizerId) => {
  try {
    const queryText = `
      SELECT 
        s.segment_id,
        s.name,
        s.description,
        s.created_at,
        s.updated_at,
        COUNT(c.contact_id) as contact_count
      FROM segments s
      LEFT JOIN contacts c ON s.segment_id = c.segment_id
      WHERE s.organizer_id = $1
      GROUP BY s.segment_id, s.name, s.description, s.created_at, s.updated_at
      ORDER BY s.created_at DESC
    `;

    const result = await query(queryText, [organizerId]);

    logger.info("Segments retrieved successfully", {
      organizerId,
      count: result.rows.length,
    });

    return result.rows;
  } catch (error) {
    logger.error("Failed to get segments in repository", {
      error: error.message,
      organizerId,
    });

    throw new DatabaseError("Failed to get segments", error);
  }
};

/**
 * Get a segment by ID
 * @param {string} segmentId - Segment ID
 * @param {string} organizerId - Organizer ID (for authorization)
 * @returns {Promise<Object>} Segment object
 */
export const getSegmentById = async (segmentId, organizerId) => {
  try {
    const queryText = `
      SELECT 
        s.segment_id,
        s.name,
        s.description,
        s.created_at,
        s.updated_at,
        COUNT(c.contact_id) as contact_count
      FROM segments s
      LEFT JOIN contacts c ON s.segment_id = c.segment_id
      WHERE s.segment_id = $1 AND s.organizer_id = $2
      GROUP BY s.segment_id, s.name, s.description, s.created_at, s.updated_at
    `;

    const result = await query(queryText, [segmentId, organizerId]);

    if (result.rows.length === 0) {
      throw new NotFoundError("Segment not found");
    }

    logger.info("Segment retrieved successfully", {
      segmentId,
      organizerId,
    });

    return result.rows[0];
  } catch (error) {
    logger.error("Failed to get segment by ID in repository", {
      error: error.message,
      segmentId,
      organizerId,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new DatabaseError("Failed to get segment", error);
  }
};

/**
 * Update a segment
 * @param {string} segmentId - Segment ID
 * @param {Object} updateData - Data to update
 * @param {string} organizerId - Organizer ID (for authorization)
 * @returns {Promise<Object>} Updated segment
 */
export const updateSegment = async (segmentId, updateData, organizerId) => {
  return await transaction(async (client) => {
    const { name, description } = updateData;

    // Check if segment exists and belongs to organizer
    const segmentCheckQuery = `
      SELECT segment_id FROM segments 
      WHERE segment_id = $1 AND organizer_id = $2
    `;
    const segmentCheckResult = await client.query(segmentCheckQuery, [
      segmentId,
      organizerId,
    ]);

    if (segmentCheckResult.rows.length === 0) {
      throw new NotFoundError("Segment not found");
    }

    // Check if new name conflicts with existing segment (excluding current)
    if (name) {
      const nameCheckQuery = `
        SELECT segment_id FROM segments 
        WHERE organizer_id = $1 AND name = $2 AND segment_id != $3
      `;
      const nameCheckResult = await client.query(nameCheckQuery, [
        organizerId,
        name,
        segmentId,
      ]);

      if (nameCheckResult.rows.length > 0) {
        throw new ConflictError(
          "Segment name already exists for this organizer"
        );
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(name);
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      throw new Error("No fields to update");
    }

    updateValues.push(segmentId, organizerId);

    const updateQuery = `
      UPDATE segments 
      SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE segment_id = $${paramIndex} AND organizer_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await client.query(updateQuery, updateValues);

    logger.info("Segment updated successfully", {
      segmentId,
      organizerId,
      updatedFields: Object.keys(updateData),
    });

    return result.rows[0];
  });
};

/**
 * Delete a segment (only if empty)
 * @param {string} segmentId - Segment ID
 * @param {string} organizerId - Organizer ID (for authorization)
 * @returns {Promise<boolean>} Success status
 */
export const deleteSegment = async (segmentId, organizerId) => {
  return await transaction(async (client) => {
    // Check if segment exists and belongs to organizer
    const segmentCheckQuery = `
      SELECT segment_id FROM segments 
      WHERE segment_id = $1 AND organizer_id = $2
    `;
    const segmentCheckResult = await client.query(segmentCheckQuery, [
      segmentId,
      organizerId,
    ]);

    if (segmentCheckResult.rows.length === 0) {
      throw new NotFoundError("Segment not found");
    }

    // Check if segment has contacts
    const contactCheckQuery = `
      SELECT COUNT(*) as contact_count FROM contacts 
      WHERE segment_id = $1
    `;
    const contactCheckResult = await client.query(contactCheckQuery, [
      segmentId,
    ]);

    if (parseInt(contactCheckResult.rows[0].contact_count) > 0) {
      throw new ConflictError("Cannot delete segment with existing contacts");
    }

    // Delete segment
    const deleteQuery = `
      DELETE FROM segments 
      WHERE segment_id = $1 AND organizer_id = $2
    `;

    const result = await client.query(deleteQuery, [segmentId, organizerId]);

    if (result.rowCount === 0) {
      throw new NotFoundError("Segment not found");
    }

    logger.info("Segment deleted successfully", {
      segmentId,
      organizerId,
    });

    return true;
  });
};

/**
 * Check if segment name exists for an organizer
 * @param {string} name - Segment name
 * @param {string} organizerId - Organizer ID
 * @param {string} excludeSegmentId - Segment ID to exclude (for updates)
 * @returns {Promise<boolean>} True if exists
 */
export const segmentNameExists = async (
  name,
  organizerId,
  excludeSegmentId = null
) => {
  try {
    let queryText = `
      SELECT segment_id FROM segments 
      WHERE organizer_id = $1 AND name = $2
    `;
    let params = [organizerId, name];

    if (excludeSegmentId) {
      queryText += " AND segment_id != $3";
      params.push(excludeSegmentId);
    }

    const result = await query(queryText, params);
    return result.rows.length > 0;
  } catch (error) {
    logger.error("Failed to check segment name existence", {
      error: error.message,
      name,
      organizerId,
    });

    throw new DatabaseError("Failed to check segment name", error);
  }
};
