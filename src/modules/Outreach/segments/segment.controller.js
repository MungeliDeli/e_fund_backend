/**
 * Segment Controller
 *
 * Handles HTTP requests for segment management operations.
 * Provides RESTful API endpoints for segment CRUD operations.
 *
 * Key Features:
 * - Segment CRUD endpoints
 * - Request/response handling
 * - Error handling
 * - Data validation
 * - Response formatting
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import * as segmentService from "./segment.service.js";
import { ResponseFactory } from "../../../utils/response.utils.js";
import logger from "../../../utils/logger.js";

/**
 * Create a new segment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createSegment = async (req, res) => {
  const { name, description } = req.body;
  const organizerId = req.user.userId;

  logger.info("Creating segment request", {
    organizerId,
    segmentData: { name, description },
  });

  const segment = await segmentService.createSegment(
    { name, description },
    organizerId
  );

  ResponseFactory.created(res, "Segment created successfully", {
    segmentId: segment.segmentId,
    name: segment.name,
    description: segment.description,
    contactCount: segment.contactCount || 0,
    createdAt: segment.createdAt,
  });
};

/**
 * Get all segments for the authenticated organizer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getSegments = async (req, res) => {
  const organizerId = req.user.userId;

  console.log("organizerId", organizerId);
  logger.info("Getting segments request", { organizerId });

  const segments = await segmentService.getSegmentsByOrganizer(organizerId);
  console.log("segments", segments);
  ResponseFactory.ok(res, "Segments retrieved successfully", segments);
};

/**
 * Get a segment by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getSegmentById = async (req, res) => {
  const { segmentId } = req.params;
  const organizerId = req.user.userId;

  logger.info("Getting segment by ID request", { segmentId, organizerId });

  const segment = await segmentService.getSegmentById(segmentId, organizerId);

  ResponseFactory.ok(res, "Segment retrieved successfully", {
    segmentId: segment.segmentId,
    name: segment.name,
    description: segment.description,
    contactCount: segment.contactCount || 0,
    createdAt: segment.createdAt,
    updatedAt: segment.updatedAt,
  });
};

/**
 * Update a segment by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateSegment = async (req, res) => {
  const { segmentId } = req.params;
  const { name, description } = req.body;
  const organizerId = req.user.userId;

  logger.info("Updating segment request", {
    segmentId,
    organizerId,
    updateData: { name, description },
  });

  const updatedSegment = await segmentService.updateSegment(
    segmentId,
    { name, description },
    organizerId
  );

  ResponseFactory.ok(res, "Segment updated successfully", {
    segmentId: updatedSegment.segmentId,
    name: updatedSegment.name,
    description: updatedSegment.description,
    contactCount: updatedSegment.contactCount || 0,
    updatedAt: updatedSegment.updatedAt,
  });
};

/**
 * Delete a segment by ID (only if empty)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteSegment = async (req, res) => {
  const { segmentId } = req.params;
  const organizerId = req.user.userId;

  logger.info("Deleting segment request", { segmentId, organizerId });

  await segmentService.deleteSegment(segmentId, organizerId);

  ResponseFactory.ok(res, "Segment deleted successfully");
};
