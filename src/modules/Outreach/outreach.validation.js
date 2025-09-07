/**
 * Outreach Validation Schemas
 *
 * Defines Joi validation schemas for outreach endpoints.
 * Ensures data integrity and proper request validation.
 *
 * Key Features:
 * - Link token creation validation
 * - Email sending validation
 * - Analytics request validation
 * - Parameter validation
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import Joi from "joi";
import { validate } from "../../utils/validation.js";

// Link token creation schema
const createLinkTokenSchema = Joi.object({
  campaignId: Joi.string().uuid().required().messages({
    "string.guid": "Campaign ID must be a valid UUID",
    "any.required": "Campaign ID is required",
  }),
  contactId: Joi.string().uuid().optional().messages({
    "string.guid": "Contact ID must be a valid UUID",
  }),
  segmentId: Joi.alternatives()
    .try(Joi.string().uuid(), Joi.string().valid("all"))
    .optional()
    .messages({
      "string.guid": "Segment ID must be a valid UUID or 'all'",
      "any.only": "Segment ID must be a valid UUID or 'all'",
    }),
  type: Joi.string()
    .valid("invite", "update", "thanks", "share")
    .required()
    .messages({
      "any.only": "Type must be one of: invite, update, thanks, share",
      "any.required": "Type is required",
    }),
  prefillAmount: Joi.number().positive().precision(2).optional().messages({
    "number.base": "Prefill amount must be a number",
    "number.positive": "Prefill amount must be positive",
    "number.precision": "Prefill amount can have up to 2 decimal places",
  }),
  personalizedMessage: Joi.string().max(1000).allow("").optional().messages({
    "string.max": "Personalized message cannot exceed 1000 characters",
  }),
  utmSource: Joi.string().max(100).optional().messages({
    "string.max": "UTM source cannot exceed 100 characters",
  }),
  utmMedium: Joi.string().max(100).optional().messages({
    "string.max": "UTM medium cannot exceed 100 characters",
  }),
  utmCampaign: Joi.string().max(100).optional().messages({
    "string.max": "UTM campaign cannot exceed 100 characters",
  }),
  utmContent: Joi.string().max(100).optional().messages({
    "string.max": "UTM content cannot exceed 100 characters",
  }),
}).custom((value, helpers) => {
  // Custom validation: either contactId or segmentId must be provided, but not both
  const { contactId, segmentId } = value;
  if (!contactId && !segmentId) {
    return helpers.error("any.invalid", {
      message: "Either contactId or segmentId must be provided",
    });
  }
  if (contactId && segmentId) {
    return helpers.error("any.invalid", {
      message: "Cannot provide both contactId and segmentId",
    });
  }
  return value;
});

// Email sending schema
const sendEmailSchema = Joi.object({
  campaignId: Joi.string().uuid().required().messages({
    "string.guid": "Campaign ID must be a valid UUID",
    "any.required": "Campaign ID is required",
  }),
  contactId: Joi.string().uuid().optional().messages({
    "string.guid": "Contact ID must be a valid UUID",
  }),
  segmentId: Joi.alternatives()
    .try(Joi.string().uuid(), Joi.string().valid("all"))
    .optional()
    .messages({
      "string.guid": "Segment ID must be a valid UUID or 'all'",
      "any.only": "Segment ID must be a valid UUID or 'all'",
    }),
  type: Joi.string().valid("invite", "update", "thanks").required().messages({
    "any.only": "Type must be one of: invite, update, thanks",
    "any.required": "Type is required",
  }),
  personalizedMessage: Joi.string().max(1000).allow("").optional().messages({
    "string.max": "Personalized message cannot exceed 1000 characters",
  }),
  prefillAmount: Joi.number().positive().precision(2).optional().messages({
    "number.base": "Prefill amount must be a number",
    "number.positive": "Prefill amount must be positive",
    "number.precision": "Prefill amount can have up to 2 decimal places",
  }),
  utmParams: Joi.object({
    utmSource: Joi.string().max(100).optional().messages({
      "string.max": "UTM source cannot exceed 100 characters",
    }),
    utmMedium: Joi.string().max(100).optional().messages({
      "string.max": "UTM medium cannot exceed 100 characters",
    }),
    utmCampaign: Joi.string().max(100).optional().messages({
      "string.max": "UTM campaign cannot exceed 100 characters",
    }),
    utmContent: Joi.string().max(100).optional().messages({
      "string.max": "UTM content cannot exceed 100 characters",
    }),
  }).optional(),
}).custom((value, helpers) => {
  // Custom validation: either contactId or segmentId must be provided, but not both
  const { contactId, segmentId } = value;
  if (!contactId && !segmentId) {
    return helpers.error("any.invalid", {
      message: "Either contactId or segmentId must be provided",
    });
  }
  if (contactId && segmentId) {
    return helpers.error("any.invalid", {
      message: "Cannot provide both contactId and segmentId",
    });
  }
  return value;
});

// Campaign ID parameter schema
const campaignIdSchema = Joi.object({
  campaignId: Joi.string().uuid().required().messages({
    "string.guid": "Campaign ID must be a valid UUID",
    "any.required": "Campaign ID is required",
  }),
});

// Link token ID parameter schema
const linkTokenIdSchema = Joi.object({
  linkTokenId: Joi.string().uuid().required().messages({
    "string.guid": "Link token ID must be a valid UUID",
    "any.required": "Link token ID is required",
  }),
});

// Contact ID parameter schema
const contactIdSchema = Joi.object({
  contactId: Joi.string().uuid().required().messages({
    "string.guid": "Contact ID must be a valid UUID",
    "any.required": "Contact ID is required",
  }),
});

// Link token filters query schema
const linkTokenFiltersSchema = Joi.object({
  type: Joi.string()
    .valid("invite", "update", "thanks", "share")
    .optional()
    .messages({
      "any.only": "Type must be one of: invite, update, thanks, share",
    }),
  contactId: Joi.string().uuid().optional().messages({
    "string.guid": "Contact ID must be a valid UUID",
  }),
  segmentId: Joi.string().uuid().optional().messages({
    "string.guid": "Segment ID must be a valid UUID",
  }),
  hasClicks: Joi.boolean().optional().messages({
    "boolean.base": "hasClicks must be a boolean",
  }),
});

// Validation middleware exports
export const validateCreateLinkToken = validate(createLinkTokenSchema);
export const validateSendEmail = validate(sendEmailSchema);
export const validateCampaignId = validate(campaignIdSchema, "params");
export const validateLinkTokenId = validate(linkTokenIdSchema, "params");
export const validateContactId = validate(contactIdSchema, "params");
export const validateLinkTokenFilters = validate(
  linkTokenFiltersSchema,
  "query"
);
