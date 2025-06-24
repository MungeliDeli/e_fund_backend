// src/modules/auth/auth.validation.js

import Joi from "joi";
import { ValidationError } from "../../utils/appError.js";

/**
 * Validation schemas for authentication operations
 */

// User registration schema
const registerSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters long",
      "string.max": "Password must not exceed 128 characters",
      "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      "any.required": "Password is required",
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
      "any.required": "Password confirmation is required",
    }),
  firstName: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required()
    .messages({
      "string.min": "First name must be at least 2 characters long",
      "string.max": "First name must not exceed 100 characters",
      "string.pattern.base": "First name can only contain letters, spaces, hyphens, and apostrophes",
      "any.required": "First name is required",
    }),
  lastName: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required()
    .messages({
      "string.min": "Last name must be at least 2 characters long",
      "string.max": "Last name must not exceed 100 characters",
      "string.pattern.base": "Last name can only contain letters, spaces, hyphens, and apostrophes",
      "any.required": "Last name is required",
    }),
  phoneNumber: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .messages({
      "string.pattern.base": "Please provide a valid phone number",
    }),
  gender: Joi.string()
    .valid("Male", "Female", "Other", "Prefer not to say")
    .optional()
    .messages({
      "any.only": "Gender must be one of: Male, Female, Other, Prefer not to say",
    }),
  dateOfBirth: Joi.date()
    .max("now")
    .optional()
    .messages({
      "date.max": "Date of birth cannot be in the future",
    }),
  country: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      "string.min": "Country must be at least 2 characters long",
      "string.max": "Country must not exceed 100 characters",
    }),
  city: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      "string.min": "City must be at least 2 characters long",
      "string.max": "City must not exceed 100 characters",
    }),
  address: Joi.string()
    .min(5)
    .max(255)
    .optional()
    .messages({
      "string.min": "Address must be at least 5 characters long",
      "string.max": "Address must not exceed 255 characters",
    }),
});

// Login schema
const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
  password: Joi.string()
    .required()
    .messages({
      "any.required": "Password is required",
    }),
});

/**
 * Validation middleware functions
 */

/**
 * Validates user registration data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateRegistration = (req, res, next) => {
  const { error, value } = registerSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(", ");
    throw new ValidationError(errorMessage);
  }

  // Replace req.body with validated and sanitized data
  req.body = value;
  next();
};

/**
 * Validates user login data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateLogin = (req, res, next) => {
  const { error, value } = loginSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(", ");
    throw new ValidationError(errorMessage);
  }

  // Replace req.body with validated and sanitized data
  req.body = value;
  next();
};

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateEmail = (email) => {
  const emailSchema = Joi.string().email({ tlds: { allow: false } });
  const { error } = emailSchema.validate(email);
  return !error;
};

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result with isValid and errors
 */
export const validatePassword = (password) => {
  const passwordSchema = Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/);

  const { error } = passwordSchema.validate(password);
  
  if (error) {
    const errors = error.details.map((detail) => detail.message);
    return { isValid: false, errors };
  }

  return { isValid: true, errors: [] };
}; 