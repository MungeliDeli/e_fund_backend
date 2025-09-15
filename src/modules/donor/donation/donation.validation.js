import Joi from "joi";
import { validate } from "../../../utils/validation.js";
import { getCampaignById } from "../../campaign/campaigns/campaign.service.js";
import { AppError } from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";

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
  messageText: Joi.string()
    .max(1000)
    .trim()
    .optional()
    .custom((value, helpers) => {
      if (value !== undefined && value !== null) {
        // Check for potentially harmful content
        const harmfulPatterns = [
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
          /data:text\/html/gi,
        ];

        for (const pattern of harmfulPatterns) {
          if (pattern.test(value)) {
            return helpers.error("any.invalid", {
              message: "Message contains potentially harmful content",
            });
          }
        }
      }
      return value;
    })
    .messages({
      "string.max": "Message cannot exceed 1000 characters",
      "string.trim": "Message cannot be empty or contain only whitespace",
      "any.invalid": "Message contains potentially harmful content",
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
  paymentMethod: Joi.string().min(1).max(50).required().messages({
    "string.empty": "Payment method is required",
    "string.min": "Payment method name is too short",
    "string.max": "Payment method name is too long",
    "any.required": "Payment method is required",
  }),
  gatewayTransactionId: Joi.string().min(1).max(100).optional().messages({
    "string.empty": "Gateway transaction ID cannot be empty",
    "string.min": "Gateway transaction ID is too short",
    "string.max": "Gateway transaction ID is too long",
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
  // Optional outreach attribution
  linkTokenId: Joi.string().uuid().optional().messages({
    "string.guid": "linkTokenId must be a valid UUID",
  }),
  contactId: Joi.string().uuid().optional().messages({
    "string.guid": "contactId must be a valid UUID",
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

/**
 * Campaign state validation middleware
 * Validates that a campaign is in a valid state to receive donations
 */
export const validateCampaignState = async (req, res, next) => {
  try {
    const { campaignId } = req.body;

    if (!campaignId) {
      return next(new AppError("Campaign ID is required", 400));
    }

    const campaign = await getCampaignById(campaignId);

    if (!campaign) {
      return next(new AppError("Campaign not found", 404));
    }

    // Check if campaign is active
    if (campaign.status !== "active") {
      const validStatuses = ["active"];
      return next(
        new AppError(
          `Campaign is not accepting donations. Current status: ${
            campaign.status
          }. Only campaigns with status: ${validStatuses.join(
            ", "
          )} can receive donations.`,
          422
        )
      );
    }

    

   

    // Check if campaign is suspended (additional safety check)
    if (campaign.status === "cancelled" || campaign.status === "rejected") {
      return next(
        new AppError(
          `Campaign is ${campaign.status} and cannot receive donations`,
          422
        )
      );
    }

    logger.info("Campaign state validation passed", {
      campaignId,
      status: campaign.status,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
    });

    next();
  } catch (error) {
    logger.error("Failed to validate campaign state", {
      error: error.message,
      campaignId: req.body.campaignId,
    });
    next(new AppError("Failed to validate campaign state", 500));
  }
};
