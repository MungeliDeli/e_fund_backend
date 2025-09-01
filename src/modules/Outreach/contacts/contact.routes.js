/**
 * Contact Routes
 *
 * Defines all contact management API endpoints for the FundFlow backend.
 * Maps HTTP routes to controller actions, applies middleware for authentication and authorization,
 * and organizes endpoints for contact CRUD operations.
 *
 * Key Features:
 * - Contact CRUD routes
 * - Authentication and authorization middleware
 * - Request logging
 * - RESTful route organization
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { Router } from "express";
import {
  createContact,
  bulkCreateContacts,
  getContactsBySegment,
  getContactById,
  updateContact,
  deleteContact,
} from "./contact.controller.js";
import {
  authenticate,
  requireOrganizationUser,
} from "../../../middlewares/auth.middleware.js";
import { logRequestCount } from "../../../middlewares/requestLogger.middleware.js";
import { catchAsync } from "../../../middlewares/errorHandler.js";
import {
  validateContact,
  validateContactId,
  validateSegmentId,
} from "./contact.validation.js";
import { apiLimiter } from "../../../middlewares/rateLimiters.js";

const router = Router();

// Apply rate limiting to all contact routes
router.use(apiLimiter);

// Contact routes - all require authentication and organizer privileges
router.use(authenticate);
router.use(requireOrganizationUser);

// Contact CRUD operations within segments
router.post(
  "/:segmentId",
  validateSegmentId,
  validateContact,
  catchAsync(createContact)
);
router.post(
  "/:segmentId/bulk",
  validateSegmentId,
  catchAsync(bulkCreateContacts)
);
router.get("/:segmentId", validateSegmentId, catchAsync(getContactsBySegment));

// Individual contact operations
router.get("/:contactId", validateContactId, catchAsync(getContactById));
router.put(
  "/:contactId",
  validateContactId,
  validateContact,
  catchAsync(updateContact)
);
router.delete("/:contactId", validateContactId, catchAsync(deleteContact));

export default router;
