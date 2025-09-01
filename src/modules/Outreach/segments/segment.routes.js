/**
 * Segment Routes
 *
 * Defines all segment management API endpoints for the FundFlow backend.
 * Maps HTTP routes to controller actions, applies middleware for authentication and authorization,
 * and organizes endpoints for segment CRUD operations.
 *
 * Key Features:
 * - Segment CRUD routes
 * - Authentication and authorization middleware
 * - Request logging
 * - RESTful route organization
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { Router } from "express";
import {
  createSegment,
  getSegments,
  getSegmentById,
  updateSegment,
  deleteSegment,
} from "./segment.controller.js";
import {
  authenticate,
  requireOrganizationUser,
} from "../../../middlewares/auth.middleware.js";
import { logRequestCount } from "../../../middlewares/requestLogger.middleware.js";
import { catchAsync } from "../../../middlewares/errorHandler.js";
import { validateSegment, validateSegmentId } from "./segment.validation.js";
import { apiLimiter } from "../../../middlewares/rateLimiters.js";

const router = Router();



// Apply rate limiting to all segment routes
router.use(apiLimiter);

// Segment routes - all require authentication and organizer privileges
router.use(authenticate);
router.use(requireOrganizationUser);

// Segment CRUD operations
router.post("/", validateSegment, catchAsync(createSegment));
router.get("/", catchAsync(getSegments));
router.get(
  "/:segmentId",
  validateSegmentId,
  catchAsync(getSegmentById)
);
router.put(
  "/:segmentId",
  validateSegmentId,
  validateSegment,
  catchAsync(updateSegment)
);
router.delete(
  "/:segmentId",
  validateSegmentId,
  catchAsync(deleteSegment)
);

export default router; 