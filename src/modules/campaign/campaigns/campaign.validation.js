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

// Base campaign schema (common fields)
// Added .allow(null, '') to optional fields to support draft saving where fields can be empty.
const baseCampaignSchema = {
  title: Joi.string()
    .trim()
    .min(3)
    .max(255)
    .optional()
    .allow(null, "")
    .messages({
      "string.min": "Title must be at least 3 characters long.",
      "string.max": "Title cannot be more than 255 characters long.",
    }),
  description: Joi.string()
    .trim()
    .max(5000)
    .optional()
    .allow(null, "")
    .messages({
      "string.max": "Description cannot be more than 5000 characters long.",
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
  mainMediaId: Joi.string().uuid().optional().allow(null, "").messages({
    "string.guid": "Main media ID must be a valid UUID.",
  }),
  campaignLogoMediaId: Joi.string().uuid().optional().allow(null, "").messages({
    "string.guid": "Campaign logo media ID must be a valid UUID.",
  }),
  customPageSettings: Joi.object().optional().messages({
    "object.base": "Custom page settings must be a valid JSON object.",
  }),
  templateId: Joi.string().trim().min(1).max(100).optional().messages({
    "string.empty": "Template ID is required.",
    "string.max": "Template ID cannot be more than 100 characters long.",
  }),
  categoryIds: Joi.array()
    .items(Joi.string().uuid())
    .optional()
    .allow(null)
    .messages({
      "array.base": "Category IDs must be an array.",
      "string.guid": "Each category ID must be a valid UUID.",
    }),
};

// Schema for creating a new campaign
export const createCampaignSchema = Joi.object({
  ...baseCampaignSchema,
  title: baseCampaignSchema.title.required().messages({
    "any.required": "Title is required.",
    "string.empty": "Title is required.",
  }),
  goalAmount: baseCampaignSchema.goalAmount.required().messages({
    "any.required": "Goal amount is required.",
  }),
  templateId: baseCampaignSchema.templateId.required().messages({
    "any.required": "Template ID is required.",
    "string.empty": "Template ID is required.",
  }),
  customPageSettings: baseCampaignSchema.customPageSettings
    .required()
    .messages({
      "any.required": "Custom page settings are required.",
    }),
  status: Joi.string()
    .valid(
      "draft",
      "pendingApproval",
      "pendingStart",
      "active",
      "successful",
      "closed",
      "cancelled",
      "rejected"
    )
    .optional()
    .default("draft")
    .messages({
      "any.only":
        "Status must be one of: draft, pendingApproval, pendingStart, active, successful, closed, cancelled, rejected.",
    }),
});

// Schema for updating an existing campaign
export const updateCampaignSchema = Joi.object({
  ...baseCampaignSchema,
  status: Joi.string()
    .valid(
      "draft",
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
        "Status must be one of: draft, pendingApproval, pendingStart, active, successful, closed, cancelled, rejected.",
    }),
});

// Schema for saving campaign as draft
export const saveDraftSchema = Joi.object({
  customPageSettings: Joi.object().required().messages({
    "any.required": "Custom page settings are required.",
    "object.base": "Custom page settings must be a valid JSON object.",
  }),
  templateId: Joi.string().trim().min(1).max(100).required().messages({
    "any.required": "Template ID is required.",
    "string.empty": "Template ID is required.",
    "string.max": "Template ID cannot be more than 100 characters long.",
  }),
  // Optional fields for draft
  title: baseCampaignSchema.title,
  description: baseCampaignSchema.description,
  goalAmount: baseCampaignSchema.goalAmount,
  startDate: baseCampaignSchema.startDate,
  endDate: baseCampaignSchema.endDate,
  mainMediaId: baseCampaignSchema.mainMediaId,
  campaignLogoMediaId: baseCampaignSchema.campaignLogoMediaId,
  categoryIds: baseCampaignSchema.categoryIds,
});

// Schema for campaign filters (for listing campaigns)
export const campaignFiltersSchema = Joi.object({
  status: Joi.string()
    .valid(
      "draft",
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
        "Status must be one of: draft, pendingApproval, pendingStart, active, successful, closed, cancelled, rejected.",
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

// Generic validation middleware
const validate =
  (schema, property = "body") =>
  (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(", ");
      // Using a consistent error response structure from the user's error handler
      return res.status(400).json({
        status: "error",
        success: false,
        message: `Validation failed: ${errorMessage}`,
      });
    }

    req[property] = value; // Overwrite request property with validated value
    next();
  };

// Export validation middlewares
export const validateCreateCampaign = validate(createCampaignSchema);
export const validateUpdateCampaign = validate(updateCampaignSchema);
export const validateSaveDraft = validate(saveDraftSchema);
export const validateCampaignId = validate(campaignIdSchema, "params");
export const validateCampaignFilters = validate(campaignFiltersSchema, "query");
