/**
 * Social Media Validation Schemas
 *
 * Joi validation schemas for social media sharing endpoints.
 * Ensures proper input validation and data integrity.
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import Joi from "joi";
import { validate } from "../../../utils/validation.js";

// Campaign ID parameter schema
const campaignIdSchema = Joi.object({
  campaignId: Joi.string().uuid().required().messages({
    "string.guid": "Campaign ID must be a valid UUID",
    "any.required": "Campaign ID is required",
  }),
});

// Social media link generation options schema
const socialMediaOptionsSchema = Joi.object({
  platform: Joi.string()
    .valid("all", "whatsapp", "facebook", "twitter", "linkedin", "telegram")
    .optional()
    .default("all")
    .messages({
      "any.only":
        "Platform must be one of: all, whatsapp, facebook, twitter, linkedin, telegram",
    }),
  customMessage: Joi.string().max(500).optional().allow("").messages({
    "string.max": "Custom message cannot exceed 500 characters",
  }),
  includeImage: Joi.boolean().optional().default(true).messages({
    "boolean.base": "Include image must be a boolean",
  }),
  utmSource: Joi.string().max(100).optional().default("social_media").messages({
    "string.max": "UTM source cannot exceed 100 characters",
  }),
  utmMedium: Joi.string().max(100).optional().default("social").messages({
    "string.max": "UTM medium cannot exceed 100 characters",
  }),
});

// Validation middleware exports
export const validateCampaignId = validate(campaignIdSchema, "params");
export const validateSocialMediaOptions = validate(socialMediaOptionsSchema);
