/**
 * Segment Validation
 *
 * Contains Joi validation schemas for segment operations.
 * Provides input validation for API endpoints to ensure data integrity.
 *
 * Key Features:
 * - Segment creation and update validation
 * - Query parameter validation for filtering
 * - Consistent error messaging
 * - Required field validation
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import Joi from "joi";
import { validate } from "../../../utils/validation.js";

// Segment creation schema
export const SegmentSchema = Joi.object({
  name: Joi.string().min(1).max(100).required().messages({
    "string.empty": "Segment name is required",
    "string.min": "Segment name must be at least 1 character long",
    "string.max": "Segment name cannot exceed 100 characters",
    "any.required": "Segment name is required",
  }),
  description: Joi.string().max(1000).optional().allow("").messages({
    "string.max": "Description cannot exceed 1000 characters",
  }),
});

// Segment ID parameter schema
export const segmentIdSchema = Joi.object({
  segmentId: Joi.string().uuid().required().messages({
    "string.guid": "Segment ID must be a valid UUID",
    "any.required": "Segment ID is required",
  }),
});

/**
 * Validation middleware functions
 */

/**
 * Validates segment creation and update data
 */
export const validateSegment = validate(SegmentSchema);

/**
 * Validates segment ID parameter
 */
export const validateSegmentId = validate(segmentIdSchema, "params");
