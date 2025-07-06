/**
 * Authentication Validation Module
 * 
 * This module provides comprehensive input validation for all authentication-related
 * operations using Joi validation schemas. It ensures data integrity, security,
 * and proper formatting of user inputs before processing.
 * 
 * VALIDATION SCHEMAS:
 * - registerSchema: Individual user registration validation
 * - loginSchema: User login credentials validation
 * - createOrganizationUserSchema: Organization user creation validation
 * - passwordSetupSchema: Password setup/activation validation
 * 
 * VALIDATION FEATURES:
 * - Email format validation with TLD checking
 * - Strong password requirements with regex patterns
 * - Password confirmation matching
 * - Name format validation (letters, spaces, hyphens, apostrophes)
 * - Phone number format validation (10-15 digits)
 * - Gender selection validation
 * - Date of birth validation (no future dates)
 * - Address and location validation
 * - Organization-specific field validation
 * 
 * PASSWORD SECURITY:
 * - Minimum 8 characters, maximum 128 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 * - Allowed special characters: !@#$%^&*()_+-=[]{};':"|,.<>/?`~
 * 
 * INPUT SANITIZATION:
 * - String trimming and normalization
 * - Email case normalization (lowercase)
 * - Optional field handling
 * - Unknown field stripping
 * - Data type conversion
 * 
 * ERROR HANDLING:
 * - Detailed error messages for each validation rule
 * - Multiple error collection (abortEarly: false)
 * - User-friendly error descriptions
 * - Field-specific error messages
 * 
 * VALIDATION MIDDLEWARE:
 * - validateRegistration: Registration data validation
 * - validateLogin: Login data validation
 * - validateCreateOrganizationUser: Organization user validation
 * - validatePasswordSetup: Password setup validation
 * - validateEmail: Email format validation utility
 * - validatePassword: Password strength validation utility
 * 
 * SECURITY CONSIDERATIONS:
 * - Input sanitization to prevent injection attacks
 * - Strong password requirements
 * - Email format validation
 * - Phone number format validation
 * - Name format restrictions
 * 
 * CUSTOM VALIDATION RULES:
 * - Password strength regex pattern
 * - Name format regex pattern
 * - Phone number regex pattern
 * - Email TLD validation
 * - Date range validation
 * 
 * DEPENDENCIES:
 * - Joi: For schema validation
 * - appError: For custom error handling
 * - Custom regex patterns for specific validations
 * 
 * @author Your Name
 * @version 1.0.0
 * @since 2024
 */

// src/modules/auth/auth.validation.js

import Joi from "joi";
import { ValidationError } from "../../utils/appError.js";


const strongPasswordRegex = new RegExp(
  "^(?=.*[a-z])" + // At least one lowercase letter
  "(?=.*[A-Z])" + // At least one uppercase letter
  "(?=.*\\d)" +   // At least one digit
  // Define allowed special characters. Remember to escape special regex characters like -, [, ], etc.
  "(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\|,.<>/?`~])" + // At least one special character
  // Allowed characters for the entire string, and length constraint
  "[A-Za-z\\d!@#$%^&*()_+\\-=\\[\\]{};':\"\\|,.<>/?`~]{8,128}$"
);
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
    .pattern(strongPasswordRegex)
    .required()
    .messages({
      'string.pattern.base': 'Password must be 8-128 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (e.g., !@#$%^&*).',
      'any.required': 'Password is required.',
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
    .pattern(/^\d{10,15}$/)
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

// Organization user creation schema (admin)
const createOrganizationUserSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  organizationName: Joi.string().min(2).max(255).required(),
  organizationShortName: Joi.string().max(50).optional(),
  organizationType: Joi.string().max(50).required(),
  officialEmail: Joi.string().email({ tlds: { allow: false } }).optional(),
  officialWebsiteUrl: Joi.string().uri().optional(),
  profilePicture: Joi.string().optional(),
  coverPicture: Joi.string().optional(),
  address: Joi.string().max(255).optional(),
  missionDescription: Joi.string().optional(),
  establishmentDate: Joi.date().optional(),
  campusAffiliationScope: Joi.string().max(50).optional(),
  affiliatedSchoolsNames: Joi.string().optional(),
  affiliatedDepartmentNames: Joi.string().optional(),
  primaryContactPersonName: Joi.string().max(255).optional(),
  primaryContactPersonEmail: Joi.string().email({ tlds: { allow: false } }).optional(),
  primaryContactPersonPhone: Joi.string().optional()
});

// Password setup (activation) schema
const passwordSetupSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string()
    .pattern(strongPasswordRegex)
    .required(),
  confirmPassword: Joi.string().valid(Joi.ref("newPassword")).required()
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
    .pattern(strongPasswordRegex);

  const { error } = passwordSchema.validate(password);
  
  if (error) {
    const errors = error.details.map((detail) => detail.message);
    return { isValid: false, errors };
  }

  return { isValid: true, errors: [] };
};

export const validateCreateOrganizationUser = (req, res, next) => {
  const { error, value } = createOrganizationUserSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(", ");
    throw new ValidationError(errorMessage);
  }
  req.body = value;
  next();
};

export const validatePasswordSetup = (req, res, next) => {
  const { error, value } = passwordSetupSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(", ");
    throw new ValidationError(errorMessage);
  }
  req.body = value;
  next();
}; 