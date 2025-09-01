import Joi from "joi";
import { validate } from "../../../utils/validation.js";

// Validation schemas
const moderateMessageSchema = Joi.object({
  status: Joi.string().valid("approved", "rejected").required(),
  isFeatured: Joi.boolean().optional(),
});

const messageIdSchema = Joi.object({
  messageId: Joi.string().uuid().required(),
});

const campaignIdSchema = Joi.object({
  campaignId: Joi.string().uuid().required(),
});

// Bulk operation schemas (no body validation needed, just campaignId param)
const bulkOperationSchema = Joi.object({});

// Validation middlewares
export const validateModerateMessage = validate(moderateMessageSchema);
export const validateMessageId = validate(messageIdSchema, "params");
export const validateCampaignId = validate(campaignIdSchema, "params");
export const validateBulkOperation = validate(bulkOperationSchema);
