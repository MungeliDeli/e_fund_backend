/**
 * Campaign Routes
 *
 * Defines all campaign and category management API endpoints for the FundFlow backend.
 * Maps HTTP routes to controller actions, applies middleware for authentication and authorization,
 * and organizes endpoints for category CRUD operations.
 *
 * Key Features:
 * - Category CRUD routes
 * - Authentication and authorization middleware
 * - Request logging
 * - RESTful route organization
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { Router } from "express";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  getCategoryStats,
} from "./category.controller.js";
import {
  authenticate,
  requireAdmin,
} from "../../../middlewares/auth.middleware.js";
import { logRequestCount } from "../../../middlewares/requestLogger.middleware.js";
import { catchAsync } from "../../../middlewares/errorHandler.js";
import {
  validateCategory,
  validateCategoryId,
} from "./category.validation.js";

const router = Router();

// Apply request logger to all campaign routes
router.use(logRequestCount);

// Category routes - all require authentication and admin privileges
router.use(authenticate);
router.use(requireAdmin);

// Category CRUD operations
router.post("/categories", validateCategory, catchAsync(createCategory));
router.get("/categories", catchAsync(getCategories));
router.get("/categories/stats", catchAsync(getCategoryStats));
router.get("/categories/:categoryId", validateCategoryId, catchAsync(getCategoryById));
router.put(
  "/categories/:categoryId",
  validateCategoryId,
  validateCategory,
  catchAsync(updateCategory)
);

export default router;
