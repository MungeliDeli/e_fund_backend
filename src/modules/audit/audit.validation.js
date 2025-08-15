/**
 * Audit Validation Schemas
 *
 * Defines Joi schemas and validation logic for all audit-related endpoints.
 * Ensures input data is validated and sanitized before reaching controllers.
 *
 * Key Features:
 * - Audit log creation and retrieval validation
 * - Filtering and pagination validation
 * - Query parameter validation
 * - Centralized schema management for all audit routes
 * - Custom error messages and field requirements
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import Joi from "joi";
import { ValidationError } from "../../utils/appError.js";
import {
  ALL_ACTION_TYPES,
  ENTITY_TYPES,
  AUDIT_CONFIG,
} from "./audit.constants.js";

/**
 * Helper function to create validation middleware
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Request property to validate (body, query, params)
 * @returns {Function} Express middleware function
 */
const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(", ");
      return next(new ValidationError(errorMessage));
    }

    req[property] = value;
    next();
  };
};

// UUID validation pattern
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Audit log creation schema
const createAuditLogSchema = Joi.object({
  userId: Joi.string().pattern(uuidPattern).optional().messages({
    "string.pattern.base": "userId must be a valid UUID",
  }),
  actionType: Joi.string()
    .valid(...Object.values(ALL_ACTION_TYPES))
    .required()
    .messages({
      "any.only": "actionType must be one of the valid audit action types",
      "any.required": "actionType is required",
    }),
  entityType: Joi.string()
    .valid(...Object.values(ENTITY_TYPES))
    .required()
    .messages({
      "any.only": "entityType must be one of the valid entity types",
      "any.required": "entityType is required",
    }),
  entityId: Joi.string().pattern(uuidPattern).optional().messages({
    "string.pattern.base": "entityId must be a valid UUID",
  }),
  details: Joi.object()
    .optional()
    .max(AUDIT_CONFIG.MAX_DETAILS_SIZE)
    .messages({
      "object.max": `details object size cannot exceed ${AUDIT_CONFIG.MAX_DETAILS_SIZE} characters`,
    }),
  ipAddress: Joi.string()
    .ip({ version: ["ipv4", "ipv6"] })
    .optional()
    .messages({
      "string.ip": "ipAddress must be a valid IP address",
    }),
  userAgent: Joi.string().max(500).optional().messages({
    "string.max": "userAgent cannot exceed 500 characters",
  }),
  sessionId: Joi.string().max(255).optional().messages({
    "string.max": "sessionId cannot exceed 255 characters",
  }),
});

// Audit log retrieval schema
const getAuditLogsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    "number.base": "page must be a number",
    "number.integer": "page must be an integer",
    "number.min": "page must be at least 1",
  }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(AUDIT_CONFIG.MAX_PAGE_SIZE)
    .default(AUDIT_CONFIG.DEFAULT_PAGE_SIZE)
    .messages({
      "number.base": "limit must be a number",
      "number.integer": "limit must be an integer",
      "number.min": "limit must be at least 1",
      "number.max": `limit cannot exceed ${AUDIT_CONFIG.MAX_PAGE_SIZE}`,
    }),
  actionType: Joi.string()
    .valid(...Object.values(ALL_ACTION_TYPES))
    .optional()
    .messages({
      "any.only": "actionType must be one of the valid audit action types",
    }),
  entityType: Joi.string()
    .valid(...Object.values(ENTITY_TYPES))
    .optional()
    .messages({
      "any.only": "entityType must be one of the valid entity types",
    }),
  entityId: Joi.string().pattern(uuidPattern).optional().messages({
    "string.pattern.base": "entityId must be a valid UUID",
  }),
  userId: Joi.string().pattern(uuidPattern).optional().messages({
    "string.pattern.base": "userId must be a valid UUID",
  }),
  startDate: Joi.date().iso().optional().messages({
    "date.base": "startDate must be a valid date",
    "date.format": "startDate must be in ISO format",
  }),
  endDate: Joi.date().iso().min(Joi.ref("startDate")).optional().messages({
    "date.base": "endDate must be a valid date",
    "date.format": "endDate must be in ISO format",
    "date.min": "endDate must be after startDate",
  }),
  search: Joi.string().max(100).optional().messages({
    "string.max": "search term cannot exceed 100 characters",
  }),
  sortBy: Joi.string()
    .valid("timestamp", "actionType", "entityType", "userId")
    .default("timestamp")
    .messages({
      "any.only":
        "sortBy must be one of: timestamp, actionType, entityType, userId",
    }),
  sortOrder: Joi.string().valid("asc", "desc").default("desc").messages({
    "any.only": "sortOrder must be either 'asc' or 'desc'",
  }),
});

// Audit log ID validation schema
const auditLogIdSchema = Joi.object({
  logId: Joi.string().pattern(uuidPattern).required().messages({
    "string.pattern.base": "logId must be a valid UUID",
    "any.required": "logId is required",
  }),
});

// User ID validation schema
const userIdSchema = Joi.object({
  userId: Joi.string().pattern(uuidPattern).required().messages({
    "string.pattern.base": "userId must be a valid UUID",
    "any.required": "userId is required",
  }),
});

// Entity validation schema
const entitySchema = Joi.object({
  entityType: Joi.string()
    .valid(...Object.values(ENTITY_TYPES))
    .required()
    .messages({
      "any.only": "entityType must be one of the valid entity types",
      "any.required": "entityType is required",
    }),
  entityId: Joi.string().pattern(uuidPattern).required().messages({
    "string.pattern.base": "entityId must be a valid UUID",
    "any.required": "entityId is required",
  }),
});

// Export validation middlewares
export const validateCreateAuditLog = validate(createAuditLogSchema, "body");
export const validateGetAuditLogs = validate(getAuditLogsSchema, "query");
export const validateAuditLogId = validate(auditLogIdSchema, "params");
export const validateUserId = validate(userIdSchema, "params");
export const validateEntity = validate(entitySchema, "params");

// Export schemas for testing
export {
  createAuditLogSchema,
  getAuditLogsSchema,
  auditLogIdSchema,
  userIdSchema,
  entitySchema,
};
