/**
 * Campaign Controller
 *
 * Handles HTTP requests for campaign and category management.
 * Delegates business logic to the Campaign Service and formats API responses.
 *
 * Key Features:
 * - Category CRUD endpoints
 * - Input validation and error handling
 * - Consistent API response formatting
 * - Authentication and authorization
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import * as categoryService from "./category.service.js";
import { ResponseFactory } from "../../../utils/response.utils.js";
import logger from "../../../utils/logger.js";

/**
 * Create a new category
 * @route POST /api/v1/campaigns/categories
 * @access Private (Admin only)
 */
export const createCategory = async (req, res, next) => {
  const category = await categoryService.createCategory(req.body);
  ResponseFactory.created(res, "Category created successfully", category);
};

/**
 * Get all categories (no filtering - returns all for client-side processing)
 * @route GET /api/v1/campaigns/categories
 * @access Private (Admin only)
 */
export const getCategories = async (req, res, next) => {
  const result = await categoryService.getCategories();
  ResponseFactory.ok(res, "Categories fetched successfully", result);
};

/**
 * Get a category by ID
 * @route GET /api/v1/campaigns/categories/:categoryId
 * @access Private (Admin only)
 */
export const getCategoryById = async (req, res, next) => {
  const category = await categoryService.getCategoryById(
    req.params.categoryId
  );
  ResponseFactory.ok(res, "Category fetched successfully", category);
};

/**
 * Update a category by ID
 * @route PUT /api/v1/campaigns/categories/:categoryId
 * @access Private (Admin only)
 */
export const updateCategory = async (req, res, next) => {
  const updatedCategory = await categoryService.updateCategory(
    req.params.categoryId,
    req.body
  );
  ResponseFactory.ok(res, "Category updated successfully", updatedCategory);
};

/**
 * Get category statistics
 * @route GET /api/v1/campaigns/categories/stats
 * @access Private (Admin only)
 */
export const getCategoryStats = async (req, res, next) => {
  const stats = await categoryService.getCategoryStats();
  ResponseFactory.ok(res, "Category statistics fetched successfully", stats);
};
