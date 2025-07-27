/**
 * Campaign Service
 *
 * Contains business logic for campaign and category management.
 * Handles category CRUD operations, validation, and data formatting.
 * Used by the Campaign Controller and other modules for campaign-related operations.
 *
 * Key Features:
 * - Category CRUD operations
 * - Input validation and sanitization
 * - Error handling and logging
 * - Data formatting for API responses
 * - Business rule enforcement
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import * as categoryRepository from "./category.repository.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";

/**
 * Create a new category
 * @param {Object} categoryData - Category data
 * @returns {Promise<Object>} Created category
 */
export const createCategory = async (categoryData) => {
  try {
    logger.info("Creating new category", { categoryData });

    // Check if category name already exists
    const nameExists = await categoryRepository.categoryNameExists(
      categoryData.name
    );
    if (nameExists) {
      throw new ValidationError("Category name already exists");
    }

    const category = await categoryRepository.createCategory(categoryData);

    logger.info("Category created successfully", {
      categoryId: category.categoryId,
      name: category.name,
    });

    return category;
  } catch (error) {
    logger.error("Failed to create category in service", {
      error: error.message,
      categoryData,
    });

    if (error instanceof ValidationError) {
      throw error;
    }

    throw new DatabaseError("Failed to create category", error);
  }
};

/**
 * Get a category by ID
 * @param {string} categoryId - Category ID
 * @returns {Promise<Object>} Category object
 */
export const getCategoryById = async (categoryId) => {
  try {
    logger.info("Getting category by ID", { categoryId });

    const category = await categoryRepository.getCategoryById(categoryId);

    if (!category) {
      throw new NotFoundError("Category not found");
    }

    logger.info("Category retrieved successfully", { categoryId });
    return category;
  } catch (error) {
    logger.error("Failed to get category by ID in service", {
      error: error.message,
      categoryId,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new DatabaseError("Failed to get category", error);
  }
};

/**
 * Get all categories (no filtering - for client-side processing)
 * @returns {Promise<Object>} All categories
 */
export const getCategories = async () => {
  try {
    const result = await categoryRepository.getCategories();

    logger.info("Categories retrieved successfully", {
      count: result.categories.length,
      total: result.pagination.total,
    });

    return result;
  } catch (error) {
    logger.error("Failed to get categories in service", {
      error: error.message,
    });

    throw new DatabaseError("Failed to get categories", error);
  }
};

/**
 * Update a category by ID
 * @param {string} categoryId - Category ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated category
 */
export const updateCategory = async (categoryId, updateData) => {
  try {
    logger.info("Updating category", { categoryId, updateData });

    // Check if category exists
    const existingCategory = await categoryRepository.getCategoryById(
      categoryId
    );
    if (!existingCategory) {
      throw new NotFoundError("Category not found");
    }

    // Check if new name conflicts with existing category (excluding current)
    if (updateData.name && updateData.name !== existingCategory.name) {
      const nameExists = await categoryRepository.categoryNameExists(
        updateData.name,
        categoryId
      );
      if (nameExists) {
        throw new ValidationError("Category name already exists");
      }
    }

    const updatedCategory = await categoryRepository.updateCategory(
      categoryId,
      updateData
    );

    logger.info("Category updated successfully", {
      categoryId,
      updatedFields: Object.keys(updateData),
    });

    return updatedCategory;
  } catch (error) {
    logger.error("Failed to update category in service", {
      error: error.message,
      categoryId,
      updateData,
    });

    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }

    throw new DatabaseError("Failed to update category", error);
  }
};

/**
 * Get category statistics
 * @returns {Promise<Object>} Category statistics
 */
export const getCategoryStats = async () => {
  try {
    logger.info("Getting category statistics");

    // Get all categories for stats
    const { categories } = await categoryRepository.getCategories({});

    const stats = {
      total: categories.length,
      active: categories.filter((cat) => cat.isActive).length,
      inactive: categories.filter((cat) => !cat.isActive).length,
    };

    logger.info("Category statistics retrieved successfully", { stats });
    return stats;
  } catch (error) {
    logger.error("Failed to get category statistics in service", {
      error: error.message,
    });

    throw new DatabaseError("Failed to get category statistics", error);
  }
};
