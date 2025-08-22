import Joi from "joi";
import { validate } from "../../../utils/validation.js";

// Validation schemas
const createDonationSchema = Joi.object({
  campaignId: Joi.string().uuid().required().messages({
    "string.guid": "Campaign ID must be a valid UUID",
    "any.required": "Campaign ID is required",
  }),
  amount: Joi.number()
    .positive()
    .precision(2)
    .min(0.01)
    .max(999999.99)
    .required()
    .messages({
      "number.base": "Amount must be a valid number",
      "number.positive": "Amount must be greater than 0",
      "number.min": "Amount must be at least $0.01",
      "number.max": "Amount cannot exceed $999,999.99",
      "number.precision": "Amount can have maximum 2 decimal places",
      "any.required": "Amount is required",
    }),
  isAnonymous: Joi.boolean().default(false).messages({
    "boolean.base": "isAnonymous must be a boolean value",
  }),
  messageText: Joi.string().max(1000).trim().optional().messages({
    "string.max": "Message cannot exceed 1000 characters",
    "string.trim": "Message cannot be empty or contain only whitespace",
  }),
  currency: Joi.string()
    .length(3)
    .pattern(/^[A-Z]{3}$/)
    .default("USD")
    .messages({
      "string.length": "Currency must be exactly 3 characters",
      "string.pattern":
        "Currency must be a valid 3-letter currency code (e.g., USD, EUR)",
    }),
  gatewayUsed: Joi.string().min(1).max(50).required().messages({
    "string.empty": "Payment gateway is required",
    "string.min": "Payment gateway name is too short",
    "string.max": "Payment gateway name is too long",
    "any.required": "Payment gateway is required",
  }),
  gatewayTransactionId: Joi.string().min(1).max(100).required().messages({
    "string.empty": "Gateway transaction ID is required",
    "string.min": "Gateway transaction ID is too short",
    "string.max": "Gateway transaction ID is too long",
    "any.required": "Gateway transaction ID is required",
  }),
  phoneNumber: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required()
    .messages({
      "string.pattern":
        "Phone number must be a valid international format (e.g., +1234567890)",
      "any.required": "Phone number is required",
    }),
  subscribeToCampaign: Joi.boolean().default(true).messages({
    "boolean.base": "subscribeToCampaign must be a boolean value",
  }),
});

const updateDonationStatusSchema = Joi.object({
  status: Joi.string()
    .valid("completed", "pending", "failed", "refunded")
    .required()
    .messages({
      "any.only": "Status must be one of: completed, pending, failed, refunded",
      "any.required": "Status is required",
    }),
});

const updateReceiptSentSchema = Joi.object({
  receiptSent: Joi.boolean().required().messages({
    "boolean.base": "receiptSent must be a boolean value",
    "any.required": "receiptSent is required",
  }),
});

const donationIdSchema = Joi.object({
  donationId: Joi.string().uuid().required().messages({
    "string.guid": "Donation ID must be a valid UUID",
    "any.required": "Donation ID is required",
  }),
});

const campaignIdSchema = Joi.object({
  campaignId: Joi.string().uuid().required().messages({
    "string.guid": "Campaign ID must be a valid UUID",
    "any.required": "Campaign ID is required",
  }),
});

// Validation middlewares
export const validateCreateDonation = validate(createDonationSchema);
export const validateUpdateDonationStatus = validate(
  updateDonationStatusSchema
);
export const validateUpdateReceiptSent = validate(updateReceiptSentSchema);
export const validateDonationId = validate(donationIdSchema, "params");
export const validateCampaignId = validate(campaignIdSchema, "params");
