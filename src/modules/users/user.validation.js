/**
 * User Validation Schemas
 *
 * (Placeholder for future validation logic.)
 *
 * Intended for Joi schemas and validation logic for user profile updates and other
 * user-related endpoints. Ensures input data is validated and sanitized before reaching controllers.
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import Joi from 'joi';

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'First name is required.',
    'string.min': 'First name must be at least 2 characters long.',
    'string.max': 'First name cannot be more than 50 characters long.',
    'any.required': 'First name is required.',
  }),
  lastName: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Last name is required.',
    'string.min': 'Last name must be at least 2 characters long.',
    'string.max': 'Last name cannot be more than 50 characters long.',
    'any.required': 'Last name is required.',
  }),
  country: Joi.string().trim().max(100).allow('').optional().messages({
    'string.max': 'Country cannot be more than 100 characters long.',
  }),
  city: Joi.string().trim().max(100).allow('').optional().messages({
    'string.max': 'City cannot be more than 100 characters long.',
  }),
  address: Joi.string().trim().max(255).allow('').optional().messages({
    'string.max': 'Address cannot be more than 255 characters long.',
  }),
});

