/**
 * Contact Validation
 *
 * Contains Joi validation schemas for contact operations.
 * Provides input validation for API endpoints to ensure data integrity.
 *
 * Key Features:
 * - Contact creation and update validation
 * - Query parameter validation for filtering
 * - Consistent error messaging
 * - Required field validation
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import Joi from "joi";
import { validate } from "../../../utils/validation.js";

// Contact creation schema
export const ContactSchema = Joi.object({
  name: Joi.string().min(1).max(100).required().messages({
    "string.empty": "Contact name is required",
    "string.min": "Contact name must be at least 1 character long",
    "string.max": "Contact name cannot exceed 100 characters",
    "any.required": "Contact name is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "string.empty": "Email is required",
    "any.required": "Email is required",
  }),
  description: Joi.string().max(1000).optional().allow("").messages({
    "string.max": "Description cannot exceed 1000 characters",
  }),
});

// Contact ID parameter schema
export const contactIdSchema = Joi.object({
  contactId: Joi.string().uuid().required().messages({
    "string.guid": "Contact ID must be a valid UUID",
    "any.required": "Contact ID is required",
  }),
});

// Segment ID parameter schema (for contact operations within a segment)
export const segmentIdSchema = Joi.object({
  segmentId: Joi.string().uuid().required().messages({
    "string.guid": "Segment ID must be a valid UUID",
    "any.required": "Segment ID is required",
  }),
});

/**
 * Validation middleware functions
 */

/**
 * Validates contact creation and update data
 */
export const validateContact = validate(ContactSchema);

/**
 * Validates contact ID parameter
 */
export const validateContactId = validate(contactIdSchema, "params");

/**
 * Validates segment ID parameter
 */
export const validateSegmentId = validate(segmentIdSchema, "params");
