/**
 * Segment Service
 *
 * Contains business logic for segment management.
 * Handles segment CRUD operations, validation, and data formatting.
 * Used by the Segment Controller and other modules for segment-related operations.
 *
 * Key Features:
 * - Segment CRUD operations
 * - Input validation and sanitization
 * - Error handling and logging
 * - Data formatting for API responses
 * - Business rule enforcement
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import * as segmentRepository from "./segment.repository.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";

/**
 * Create a new segment
 * @param {Object} segmentData - Segment data
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Object>} Created segment
 */
export const createSegment = async (segmentData, organizerId) => {
  try {
    logger.info("Creating new segment", { segmentData, organizerId });

    // Check if segment name already exists
    const nameExists = await segmentRepository.segmentNameExists(
      segmentData.name,
      organizerId
    );
    if (nameExists) {
      throw new ValidationError(
        "Segment name already exists for this organizer"
      );
    }

    const segment = await segmentRepository.createSegment(
      segmentData,
      organizerId
    );

    logger.info("Segment created successfully", {
      segmentId: segment.segment_id,
      name: segment.name,
      organizerId,
    });

    return segment;
  } catch (error) {
    logger.error("Failed to create segment in service", {
      error: error.message,
      segmentData,
      organizerId,
    });

    if (error instanceof ValidationError) {
      throw error;
    }

    throw new DatabaseError("Failed to create segment", error);
  }
};

/**
 * Get all segments for an organizer
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Array>} Array of segments
 */
export const getSegmentsByOrganizer = async (organizerId) => {
  try {
    logger.info("Getting segments for organizer", { organizerId });

    const segments = await segmentRepository.getSegmentsByOrganizer(
      organizerId
    );

    console.log("segments", segments);

    logger.info("Segments retrieved successfully", {
      organizerId,
      count: segments.length,
    });

    return segments;
  } catch (error) {
    logger.error("Failed to get segments in service", {
      error: error.message,
      organizerId,
    });

    throw new DatabaseError("Failed to get segments", error);
  }
};

/**
 * Get a segment by ID
 * @param {string} segmentId - Segment ID
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Object>} Segment object
 */
export const getSegmentById = async (segmentId, organizerId) => {
  try {
    logger.info("Getting segment by ID", { segmentId, organizerId });

    const segment = await segmentRepository.getSegmentById(
      segmentId,
      organizerId
    );

    if (!segment) {
      throw new NotFoundError("Segment not found");
    }

    logger.info("Segment retrieved successfully", { segmentId, organizerId });
    return segment;
  } catch (error) {
    logger.error("Failed to get segment by ID in service", {
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
 * Update a segment by ID
 * @param {string} segmentId - Segment ID
 * @param {Object} updateData - Data to update
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Object>} Updated segment
 */
export const updateSegment = async (segmentId, updateData, organizerId) => {
  try {
    logger.info("Updating segment", { segmentId, updateData, organizerId });

    // Check if segment exists
    const existingSegment = await segmentRepository.getSegmentById(
      segmentId,
      organizerId
    );
    if (!existingSegment) {
      throw new NotFoundError("Segment not found");
    }

    // Check if new name conflicts with existing segment (excluding current)
    if (updateData.name && updateData.name !== existingSegment.name) {
      const nameExists = await segmentRepository.segmentNameExists(
        updateData.name,
        organizerId,
        segmentId
      );
      if (nameExists) {
        throw new ValidationError(
          "Segment name already exists for this organizer"
        );
      }
    }

    const updatedSegment = await segmentRepository.updateSegment(
      segmentId,
      updateData,
      organizerId
    );

    logger.info("Segment updated successfully", {
      segmentId,
      organizerId,
      updatedFields: Object.keys(updateData),
    });

    return updatedSegment;
  } catch (error) {
    logger.error("Failed to update segment in service", {
      error: error.message,
      segmentId,
      updateData,
      organizerId,
    });

    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }

    throw new DatabaseError("Failed to update segment", error);
  }
};

/**
 * Delete a segment by ID (only if empty)
 * @param {string} segmentId - Segment ID
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteSegment = async (segmentId, organizerId) => {
  try {
    logger.info("Deleting segment", { segmentId, organizerId });

    // Check if segment exists
    const existingSegment = await segmentRepository.getSegmentById(
      segmentId,
      organizerId
    );
    if (!existingSegment) {
      throw new NotFoundError("Segment not found");
    }

    // Check if segment has contacts
    if (parseInt(existingSegment.contact_count) > 0) {
      throw new ValidationError("Cannot delete segment with existing contacts");
    }

    const result = await segmentRepository.deleteSegment(
      segmentId,
      organizerId
    );

    logger.info("Segment deleted successfully", {
      segmentId,
      organizerId,
    });

    return result;
  } catch (error) {
    logger.error("Failed to delete segment in service", {
      error: error.message,
      segmentId,
      organizerId,
    });

    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }

    throw new DatabaseError("Failed to delete segment", error);
  }
};
