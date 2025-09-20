/**
 * Organization User Validation Schemas
 *
 * Joi validation schemas for organization user profile updates and other organization-related endpoints.
 * Ensures input data is validated and sanitized before reaching controllers.
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import Joi from "joi";
import { validate } from "../../../utils/validation.js";

export const updateOrganizationProfileSchema = Joi.object({
  organizationName: Joi.string().trim().max(255).required().messages({
    "string.empty": "Organization name is required.",
    "string.max": "Organization name cannot be more than 255 characters.",
    "any.required": "Organization name is required.",
  }),
  organizationShortName: Joi.string()
    .trim()
    .max(50)
    .allow("")
    .optional()
    .messages({
      "string.max": "Short name cannot be more than 50 characters.",
    }),
  organizationType: Joi.string().trim().max(50).required().messages({
    "string.empty": "Organization type is required.",
    "string.max": "Organization type cannot be more than 50 characters.",
    "any.required": "Organization type is required.",
  }),
  officialEmail: Joi.string()
    .trim()
    .email({ tlds: false })
    .max(255)
    .required()
    .messages({
      "string.empty": "Official email is required.",
      "string.email": "Enter a valid email address.",
      "string.max": "Email cannot be more than 255 characters.",
      "any.required": "Official email is required.",
    }),
  officialWebsiteUrl: Joi.string()
    .trim()
    .uri({ allowRelative: false })
    .max(255)
    .allow("")
    .optional()
    .messages({
      "string.uri": "Enter a valid website URL.",
      "string.max": "Website URL cannot be more than 255 characters.",
    }),
  address: Joi.string().trim().max(255).allow("").optional().messages({
    "string.max": "Address cannot be more than 255 characters.",
  }),
  missionDescription: Joi.string()
    .trim()
    .max(2000)
    .allow("")
    .optional()
    .messages({
      "string.max": "Mission description cannot be more than 2000 characters.",
    }),
  establishmentDate: Joi.date().iso().allow("").optional().messages({
    "date.format": "Enter a valid date (YYYY-MM-DD).",
  }),
  campusAffiliationScope: Joi.string()
    .trim()
    .max(50)
    .allow("")
    .optional()
    .messages({
      "string.max":
        "Campus affiliation scope cannot be more than 50 characters.",
    }),
  primaryContactPersonName: Joi.string().trim().max(255).required().messages({
    "string.empty": "Primary contact person name is required.",
    "string.max":
      "Primary contact person name cannot be more than 255 characters.",
    "any.required": "Primary contact person name is required.",
  }),
  primaryContactPersonEmail: Joi.string()
    .trim()
    .email({ tlds: false })
    .max(255)
    .required()
    .messages({
      "string.empty": "Primary contact person email is required.",
      "string.email": "Enter a valid email address.",
      "string.max": "Email cannot be more than 255 characters.",
      "any.required": "Primary contact person email is required.",
    }),
  primaryContactPersonPhone: Joi.string().trim().max(20).required().messages({
    "string.empty": "Primary contact person phone is required.",
    "string.max": "Phone number cannot be more than 20 characters.",
    "any.required": "Primary contact person phone is required.",
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
 * Validates organization profile update data
 */
export const validateUpdateOrganizationProfile = validate(
  updateOrganizationProfileSchema
);

/**
 * Validates user ID parameter
 */
export const validateUserId = validate(userIdSchema, "params");

/**
 * Validates media ID parameter
 */
export const validateMediaId = validate(mediaIdSchema, "params");
