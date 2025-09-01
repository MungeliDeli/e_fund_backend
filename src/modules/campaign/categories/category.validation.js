/**
 * Campaign Validation
 *
 * Contains Joi validation schemas for campaign and category operations.
 * Provides input validation for API endpoints to ensure data integrity.
 *
 * Key Features:
 * - Category creation and update validation
 * - Query parameter validation for filtering
 * - Consistent error messaging
 * - Required field validation
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import Joi from "joi";
import { ValidationError } from "../../../utils/appError.js";

// Category creation schema
export const CategorySchema = Joi.object({
  name: Joi.string().min(1).max(100).required().messages({
    "string.empty": "Category name is required",
    "string.min": "Category name must be at least 1 character long",
    "string.max": "Category name cannot exceed 100 characters",
    "any.required": "Category name is required",
  }),
  description: Joi.string().max(1000).optional().allow("").messages({
    "string.max": "Description cannot exceed 1000 characters",
  }),
  isActive: Joi.boolean().default(true).messages({
    "boolean.base": "isActive must be a boolean value",
  }),
});




// Category ID parameter schema
export const categoryIdSchema = Joi.object({
  categoryId: Joi.string().uuid().required().messages({
    "string.guid": "Category ID must be a valid UUID",
    "any.required": "Category ID is required",
  }),
});

/**
 * Validation middleware functions
 */

/**
 * Validates category creation and update data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateCategory = (req, res, next) => {
  const { error, value } = CategorySchema.validate(req.body, {
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
 * Validates category ID parameter
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateCategoryId = (req, res, next) => {
  const { error, value } = categoryIdSchema.validate(req.params, {
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
