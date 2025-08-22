import Joi from "joi";
import { validate } from "../../../utils/validation.js";

// Validation schemas
const createDonationSchema = Joi.object({
  campaignId: Joi.string().uuid().required(),
  amount: Joi.number().positive().precision(2).required(),
  isAnonymous: Joi.boolean().default(false),
  messageText: Joi.string().max(1000).optional(), // Optional message text
  currency: Joi.string().length(3).default("USD"),
  gatewayUsed: Joi.string().required(),
  gatewayTransactionId: Joi.string().required(),
  phoneNumber: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required(),
  subscribeToCampaign: Joi.boolean().default(true),
});

const updateDonationStatusSchema = Joi.object({
  status: Joi.string()
    .valid("completed", "pending", "failed", "refunded")
    .required(),
});

const updateReceiptSentSchema = Joi.object({
  receiptSent: Joi.boolean().required(),
});

const donationIdSchema = Joi.object({
  donationId: Joi.string().uuid().required(),
});

const campaignIdSchema = Joi.object({
  campaignId: Joi.string().uuid().required(),
});

// Validation middlewares
export const validateCreateDonation = validate(createDonationSchema);
export const validateUpdateDonationStatus = validate(
  updateDonationStatusSchema
);
export const validateUpdateReceiptSent = validate(updateReceiptSentSchema);
export const validateDonationId = validate(donationIdSchema, "params");
export const validateCampaignId = validate(campaignIdSchema, "params");
