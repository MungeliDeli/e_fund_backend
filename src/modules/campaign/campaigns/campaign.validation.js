/**
 * Campaign Validation Schemas
 *
 * Joi validation schemas for campaign creation, updates, and other
 * campaign-related endpoints. Ensures input data is validated and sanitized
 * before reaching controllers.
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import Joi from "joi";
import { validate } from "../../../utils/validation.js";

// Base campaign schema (common fields)
// Added .allow(null, '') to optional fields to support draft saving where fields can be empty.
const baseCampaignSchema = {
  name: Joi.string()
    .trim()
    .min(3)
    .max(255)
    .optional()
    .allow(null, "")
    .messages({
      "string.min": "Name must be at least 3 characters long.",
      "string.max": "Name cannot be more than 255 characters long.",
    }),
  description: Joi.string()
    .trim()
    .max(5000)
    .optional()
    .allow(null, "")
    .messages({
      "string.max": "Description cannot be more than 5000 characters long.",
    }),
  themeColor: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .allow(null, "")
    .messages({
      "string.pattern.base":
        "Theme color must be a valid hex color code (e.g., #10B981).",
    }),
  predefinedAmounts: Joi.alternatives()
    .try(
      Joi.string().custom((value, helpers) => {
        try {
          const parsed = JSON.parse(value);
          if (!Array.isArray(parsed) || parsed.length !== 4) {
            return helpers.error("array.length");
          }
          return parsed;
        } catch (error) {
          return helpers.error("string.base");
        }
      }),
      Joi.array().items(Joi.string()).length(4)
    )
    .optional()
    .allow(null, "")
    .messages({
      "array.length": "Exactly 4 predefined amounts are required.",
      "string.base": "Predefined amounts must be a valid JSON array.",
    }),
  goalAmount: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .allow(null)
    .messages({
      "number.base": "Goal amount must be a valid number.",
      "number.positive": "Goal amount must be positive.",
      "number.precision": "Goal amount can have up to 2 decimal places.",
    }),
  startDate: Joi.date().iso().optional().allow(null).messages({
    "date.base": "Start date must be a valid date.",
    "date.format": "Start date must be in ISO format.",
  }),
  endDate: Joi.date()
    .iso()
    .greater(Joi.ref("startDate"))
    .optional()
    .allow(null)
    .messages({
      "date.base": "End date must be a valid date.",
      "date.format": "End date must be in ISO format.",
      "date.greater": "End date must be after start date.",
    }),

  statusReason: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow(null, "")
    .messages({
      "string.max": "Status reason cannot be more than 1000 characters.",
    }),

  // Template-related fields removed during demolition
  categoryIds: Joi.alternatives()
    .try(
      Joi.string().custom((value, helpers) => {
        try {
          const parsed = JSON.parse(value);
          if (!Array.isArray(parsed)) {
            return helpers.error("array.base");
          }
          if (parsed.length < 1) {
            return helpers.error("array.min");
          }
          if (parsed.length > 3) {
            return helpers.error("array.max");
          }
          // Validate each item is a UUID
          for (const id of parsed) {
            if (
              typeof id !== "string" ||
              !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                id
              )
            ) {
              return helpers.error("string.guid");
            }
          }
          return parsed;
        } catch (error) {
          return helpers.error("string.base");
        }
      }),
      Joi.array().items(Joi.string().uuid()).min(1).max(3)
    )
    .optional()
    .allow(null)
    .messages({
      "array.base": "Category IDs must be an array.",
      "array.min": "At least one category is required.",
      "array.max": "Maximum 3 categories allowed.",
      "string.base": "Category IDs must be a valid JSON string.",
      "string.guid": "Each category ID must be a valid UUID.",
    }),

  // Campaign settings for custom page configuration
  campaignSettings: Joi.string().optional().allow(null, "").messages({
    "string.base": "Campaign settings must be a valid JSON string.",
  }),
};

// Schema for creating a new campaign
export const createCampaignSchema = Joi.object({
  ...baseCampaignSchema,
  name: baseCampaignSchema.name.required().messages({
    "any.required": "Name is required.",
    "string.empty": "Name is required.",
  }),
  goalAmount: baseCampaignSchema.goalAmount.required().messages({
    "any.required": "Goal amount is required.",
  }),
  categoryIds: baseCampaignSchema.categoryIds.required().messages({
    "any.required": "At least one category is required.",
    "array.min": "At least one category is required.",
  }),
  // Template-related fields removed during demolition
  status: Joi.string()
    .valid(
      "pendingApproval",
      "pendingStart",
      "active",
      "successful",
      "closed",
      "cancelled",
      "rejected"
    )
    .optional()
    .default("pendingApproval")
    .messages({
      "any.only":
        "Status must be one of: pendingApproval, pendingStart, active, successful, closed, cancelled, rejected.",
    }),
});

// Schema for updating an existing campaign
export const updateCampaignSchema = Joi.object({
  ...baseCampaignSchema,
  status: Joi.string()
    .valid(
      "pendingApproval",
      "pendingStart",
      "active",
      "successful",
      "closed",
      "cancelled",
      "rejected"
    )
    .optional()
    .messages({
      "any.only":
        "Status must be one of: pendingApproval, pendingStart, active, successful, closed, cancelled, rejected.",
    }),
});

// Draft schema removed during demolition

// Schema for campaign filters (for listing campaigns)
export const campaignFiltersSchema = Joi.object({
  status: Joi.string()
    .valid(
      "pendingApproval",
      "pendingStart",
      "active",
      "successful",
      "closed",
      "cancelled",
      "rejected"
    )
    .optional()
    .messages({
      "any.only":
        "Status must be one of: pendingApproval, pendingStart, active, successful, closed, cancelled, rejected.",
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .messages({
      "number.base": "Limit must be a valid number.",
      "number.integer": "Limit must be an integer.",
      "number.min": "Limit must be at least 1.",
      "number.max": "Limit cannot be more than 100.",
    }),
  offset: Joi.number().integer().min(0).optional().default(0).messages({
    "number.base": "Offset must be a valid number.",
    "number.integer": "Offset must be an integer.",
    "number.min": "Offset cannot be negative.",
  }),
});

// Schema for campaign ID parameter
export const campaignIdSchema = Joi.object({
  campaignId: Joi.string().uuid().required().messages({
    "any.required": "Campaign ID is required.",
    "string.guid": "Campaign ID must be a valid UUID.",
  }),
});

// Export validation middlewares
export const validateCreateCampaign = validate(createCampaignSchema);
export const validateUpdateCampaign = validate(updateCampaignSchema);
// Draft validation removed during demolition
export const validateCampaignId = validate(campaignIdSchema, "params");
export const validateCampaignFilters = validate(campaignFiltersSchema, "query");
