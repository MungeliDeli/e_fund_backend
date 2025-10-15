import Joi from "joi";
import { validate } from "../../../utils/validation.js";

// Validation schemas
const createTransactionSchema = Joi.object({
  userId: Joi.string().uuid().optional(),
  campaignId: Joi.string().uuid().required(),
  amount: Joi.number().positive().precision(2).required(),
  currency: Joi.string().length(3).required(),
  gatewayTransactionId: Joi.string().required(),
  gatewayUsed: Joi.string().required(),
  transactionType: Joi.string()
    .valid("donation_in", "withdrawal_out", "platform_fee")
    .required(),
  feesAmount: Joi.number().positive().precision(2).optional(),
});

const updateTransactionStatusSchema = Joi.object({
  status: Joi.string()
    .valid("succeeded", "failed", "pending", "refunded")
    .required(),
});

const transactionIdSchema = Joi.object({
  transactionId: Joi.string().uuid().required(),
});

const campaignIdSchema = Joi.object({
  campaignId: Joi.string().uuid().required(),
});

const userIdSchema = Joi.object({
  userId: Joi.string().uuid().required(),
});

const adminTransactionsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  search: Joi.string().allow("").optional(),
  campaignId: Joi.string().uuid().optional(),
  status: Joi.string()
    .valid("succeeded", "failed", "pending", "refunded")
    .optional(),
  gatewayUsed: Joi.string().optional(),
  sortBy: Joi.string()
    .valid(
      "transactionTimestamp",
      "amount",
      "status",
      "gatewayUsed",
      "campaignName",
      "userEmail"
    )
    .default("transactionTimestamp"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});

// Validation middlewares
export const validateCreateTransaction = validate(createTransactionSchema);
export const validateUpdateTransactionStatus = validate(
  updateTransactionStatusSchema
);
export const validateTransactionId = validate(transactionIdSchema, "params");
export const validateCampaignId = validate(campaignIdSchema, "params");
export const validateUserId = validate(userIdSchema, "params");
export const validateAdminTransactions = validate(
  adminTransactionsSchema,
  "query"
);
