/**
 * Validation Utility Module
 *
 * Provides reusable validation functions for Joi schemas across the application.
 * Centralizes validation logic and error handling to reduce code duplication.
 *
 * Key Features:
 * - Generic validate function for Joi schemas
 * - Consistent error handling with ValidationError
 * - Support for different validation contexts (body, params, query)
 * - Automatic data sanitization and unknown field stripping
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { ValidationError } from "./appError.js";

/**
 * Generic validation function that creates Express middleware for Joi schemas
 * @param {Joi.ObjectSchema} schema - Joi validation schema
 * @param {string} context - Validation context ('body', 'params', 'query')
 * @returns {Function} Express middleware function
 */
export const validate = (schema, context = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[context], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(", ");
      throw new ValidationError(errorMessage);
    }

    // Replace the validated context with sanitized data
    // Note: In some router versions, req.query/req.params are read-only properties.
    // Avoid reassigning the whole object; instead, mutate existing object keys.
    if (context === "query" || context === "params") {
      const target = req[context] || {};
      // Remove existing keys
      Object.keys(target).forEach((k) => {
        delete target[k];
      });
      // Assign validated keys
      Object.keys(value || {}).forEach((k) => {
        target[k] = value[k];
      });
    } else {
      req[context] = value;
    }

    next();
  };
};

/**
 * Validates data against a schema without Express middleware
 * @param {Joi.ObjectSchema} schema - Joi validation schema
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result with error or value
 */
export const validateData = (schema, data) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(", ");
    throw new ValidationError(errorMessage);
  }

  return value;
};

/**
 * Validates data against a schema and returns validation result without throwing
 * @param {Joi.ObjectSchema} schema - Joi validation schema
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result with isValid flag and errors/value
 */
export const validateDataSafe = (schema, data) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
      type: detail.type,
    }));

    return {
      isValid: false,
      errors,
      value: null,
    };
  }

  return {
    isValid: true,
    errors: [],
    value,
  };
};

export default {
  validate,
  validateData,
  validateDataSafe,
};
