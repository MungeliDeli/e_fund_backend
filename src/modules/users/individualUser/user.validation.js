/**
 * User Validation Schemas
 *
 * Joi validation schemas for user profile updates and other user-related endpoints.
 * Ensures input data is validated and sanitized before reaching controllers.
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import Joi from "joi";
import { validate } from "../../../utils/validation.js";

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).required().messages({
    "string.empty": "First name is required.",
    "string.min": "First name must be at least 2 characters long.",
    "string.max": "First name cannot be more than 50 characters long.",
    "any.required": "First name is required.",
  }),
  lastName: Joi.string().trim().min(2).max(50).required().messages({
    "string.empty": "Last name is required.",
    "string.min": "Last name must be at least 2 characters long.",
    "string.max": "Last name cannot be more than 50 characters long.",
    "any.required": "Last name is required.",
  }),
  country: Joi.string().trim().max(100).allow("").optional().messages({
    "string.max": "Country cannot be more than 100 characters long.",
  }),
  city: Joi.string().trim().max(100).allow("").optional().messages({
    "string.max": "City cannot be more than 100 characters long.",
  }),
  address: Joi.string().trim().max(255).allow("").optional().messages({
    "string.max": "Address cannot be more than 255 characters long.",
  }),
});

// User ID parameter schema
export const userIdSchema = Joi.object({
  userId: Joi.string().uuid().required().messages({
    "any.required": "User ID is required.",
    "string.guid": "User ID must be a valid UUID.",
  }),
});

// Media ID parameter schema
export const mediaIdSchema = Joi.object({
  mediaId: Joi.string().uuid().required().messages({
    "any.required": "Media ID is required.",
    "string.guid": "Media ID must be a valid UUID.",
  }),
});

/**
 * Validation middleware functions
 */

/**
 * Validates user profile update data
 */
export const validateUpdateProfile = validate(updateProfileSchema);

/**
 * Validates user ID parameter
 */
export const validateUserId = validate(userIdSchema, "params");

/**
 * Validates media ID parameter
 */
export const validateMediaId = validate(mediaIdSchema, "params");
