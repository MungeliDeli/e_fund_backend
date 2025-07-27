/**
 * Campaign Repository
 *
 * Handles all database operations for campaign and category management.
 * Provides a data access layer for the Campaign Service, abstracting SQL queries
 * and transactions for category CRUD operations.
 *
 * Key Features:
 * - Category CRUD operations
 * - Search and filtering capabilities
 * - Pagination support
 * - Error handling and logging
 * - Transaction management
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { query, transaction } from "../../../db/index.js";
import { DatabaseError, NotFoundError } from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";

/**
 * Create a new category
 * @param {Object} categoryData - Category data
 * @param {Object} [client] - Optional DB client for transaction
 * @returns {Promise<Object>} Created category
 */
export const createCategory = async (categoryData, client) => {
  try {
    const executor = client || { query };
    const { name, description, isActive } = categoryData;

    const queryText = `
      INSERT INTO categories (name, description, is_active)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await executor.query(queryText, [
      name,
      description,
      isActive,
    ]);

    if (result.rowCount === 0) {
      throw new DatabaseError("Failed to create category");
    }

    const category = result.rows[0];
    logger.info("Category created successfully", {
      categoryId: category.category_id,
      name: category.name,
    });

    return {
      categoryId: category.category_id,
      name: category.name,
      description: category.description,
      isActive: category.is_active,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
    };
  } catch (error) {
    logger.error("Failed to create category", {
      error: error.message,
      categoryData,
    });

    if (error.code === "23505") {
      // Unique constraint violation
      throw new DatabaseError("Category name already exists");
    }

    throw new DatabaseError("Failed to create category", error);
  }
};

/**
 * Get a category by ID
 * @param {string} categoryId - Category ID
 * @returns {Promise<Object|null>} Category object or null if not found
 */
export const getCategoryById = async (categoryId) => {
  try {
    const queryText = `
      SELECT category_id, name, description, is_active, created_at, updated_at
      FROM categories
      WHERE category_id = $1
    `;

    const result = await query(queryText, [categoryId]);

    if (result.rowCount === 0) {
      return null;
    }

    const category = result.rows[0];
    return {
      categoryId: category.category_id,
      name: category.name,
      description: category.description,
      isActive: category.is_active,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
    };
  } catch (error) {
    logger.error("Failed to get category by ID", {
      error: error.message,
      categoryId,
    });
    throw new DatabaseError("Failed to get category", error);
  }
};

/**
 * Get all categories (no filtering - for client-side processing)
 * @returns {Promise<Object>} All categories
 */
export const getCategories = async () => {
  try {
    const queryText = `
      SELECT category_id, name, description, is_active, created_at, updated_at
      FROM categories
      ORDER BY name ASC
    `;

    const result = await query(queryText);

    const categories = result.rows.map((category) => ({
      categoryId: category.category_id,
      name: category.name,
      description: category.description,
      isActive: category.is_active,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
    }));

    return {
      categories,
      pagination: {
        page: 1,
        limit: categories.length,
        total: categories.length,
        totalPages: 1,
      },
    };
  } catch (error) {
    logger.error("Failed to get categories", {
      error: error.message,
    });
    throw new DatabaseError("Failed to get categories", error);
  }
};

/**
 * Update a category by ID
 * @param {string} categoryId - Category ID
 * @param {Object} updateData - Data to update
 * @param {Object} [client] - Optional DB client for transaction
 * @returns {Promise<Object>} Updated category
 */
export const updateCategory = async (categoryId, updateData, client) => {
  try {
    const executor = client || { query };
    const { name, description, isActive } = updateData;

    const setClauses = [];
    const values = [];
    let valueIndex = 1;

    if (name !== undefined) {
      setClauses.push(`name = $${valueIndex++}`);
      values.push(name);
    }

    if (description !== undefined) {
      setClauses.push(`description = $${valueIndex++}`);
      values.push(description);
    }

    if (isActive !== undefined) {
      setClauses.push(`is_active = $${valueIndex++}`);
      values.push(isActive);
    }

    if (setClauses.length === 0) {
      throw new DatabaseError("No fields to update");
    }

    values.push(categoryId);
    const queryText = `
      UPDATE categories
      SET ${setClauses.join(", ")}
      WHERE category_id = $${valueIndex}
      RETURNING *
    `;

    const result = await executor.query(queryText, values);

    if (result.rowCount === 0) {
      throw new NotFoundError("Category not found");
    }

    const category = result.rows[0];
    logger.info("Category updated successfully", {
      categoryId,
      updatedFields: Object.keys(updateData),
    });

    return {
      categoryId: category.category_id,
      name: category.name,
      description: category.description,
      isActive: category.is_active,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
    };
  } catch (error) {
    logger.error("Failed to update category", {
      error: error.message,
      categoryId,
      updateData,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    if (error.code === "23505") {
      // Unique constraint violation
      throw new DatabaseError("Category name already exists");
    }

    throw new DatabaseError("Failed to update category", error);
  }
};

/**
 * Check if a category name already exists
 * @param {string} name - Category name
 * @param {string} [excludeCategoryId] - Category ID to exclude from check
 * @returns {Promise<boolean>} True if name exists
 */
export const categoryNameExists = async (name, excludeCategoryId = null) => {
  try {
    let queryText = `
      SELECT category_id
      FROM categories
      WHERE name = $1
    `;
    let values = [name];

    if (excludeCategoryId) {
      queryText += ` AND category_id != $2`;
      values.push(excludeCategoryId);
    }

    const result = await query(queryText, values);
    return result.rowCount > 0;
  } catch (error) {
    logger.error("Failed to check category name existence", {
      error: error.message,
      name,
    });
    throw new DatabaseError("Failed to check category name", error);
  }
};
