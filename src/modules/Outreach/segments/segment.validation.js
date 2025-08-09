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
import { ValidationError } from "../../../utils/appError.js";

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
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateSegment = (req, res, next) => {
  const { error, value } = SegmentSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(", ");
    throw new ValidationError(errorMessage);
  }

  // Replace req.body with validated and sanitized data
  req.body = value;
  next();
};

/**
 * Validates segment ID parameter
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateSegmentId = (req, res, next) => {
  const { error, value } = segmentIdSchema.validate(req.params, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(", ");
    throw new ValidationError(errorMessage);
  }

  // Replace req.params with validated and sanitized data
  req.params = value;
  next();
}; 