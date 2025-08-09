/**
 * Campaign Repository
 *
 * Handles all database operations for campaign management, including creating,
 * updating, and fetching campaign data. Provides a data access layer for the
 * Campaign Service, abstracting SQL queries and transactions.
 *
 * Key Features:
 * - Create and update campaign records
 * - Fetch campaigns with filters and pagination
 * - Manage campaign-category relationships
 * - Handle campaign status updates
 * - Error handling and logging
 * - Media record management for campaign images
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { query, transaction } from "../../../db/index.js";
import { DatabaseError, NotFoundError } from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";

/**
 * Create a new campaign record
 * @param {Object} campaignData - Campaign data
 * @param {Object} [client] - Optional DB client for transaction
 * @returns {Promise<Object>} Created campaign record
 */
export const createCampaign = async (campaignData, client) => {
  const executor = client || { query };

  const {
    organizerId,
    title,
    description,
    goalAmount,
    startDate,
    endDate,
    status = "draft",
    customPageSettings,
    shareLink,
    templateId,
  } = campaignData;

  // Set default goal amount for drafts if not provided
  const finalGoalAmount = goalAmount || 0.0;

  try {
    const queryText = `
      INSERT INTO campaigns (
        organizer_id, title, description, goal_amount, start_date, end_date,
        status, custom_page_settings, share_link, template_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      organizerId,
      title,
      description,
      finalGoalAmount,
      startDate,
      endDate,
      status,
      // Handle JSON field - stringify if it's an object
      customPageSettings && typeof customPageSettings === "object"
        ? JSON.stringify(customPageSettings)
        : customPageSettings,
      shareLink,
      templateId,
    ];

    const result = await executor.query(queryText, values);

    const createdCampaign = result.rows[0];

    // Parse JSON fields if they exist and are strings
    if (
      createdCampaign.custom_page_settings &&
      typeof createdCampaign.custom_page_settings === "string"
    ) {
      try {
        createdCampaign.custom_page_settings = JSON.parse(
          createdCampaign.custom_page_settings
        );
      } catch (parseError) {
        logger.warn(
          "Failed to parse custom_page_settings JSON in create result",
          {
            campaignId: createdCampaign.campaign_id,
            error: parseError.message,
          }
        );
      }
    }

    logger.info("Campaign created successfully", {
      campaignId: createdCampaign.campaign_id,
      organizerId,
      status,
    });

    return createdCampaign;
  } catch (error) {
    logger.error("Failed to create campaign", {
      error: error.message,
      organizerId,
    });
    throw new DatabaseError("Failed to create campaign", error);
  }
};

/**
 * Update an existing campaign record
 * @param {string} campaignId - Campaign ID
 * @param {Object} updateData - Data to update
 * @param {Object} [client] - Optional DB client for transaction
 * @returns {Promise<Object>} Updated campaign record
 */
export const updateCampaign = async (campaignId, updateData, client) => {
  const executor = client || { query };

  const allowedFields = {
    title: "title",
    description: "description",
    goalAmount: "goal_amount",
    startDate: "start_date",
    endDate: "end_date",
    status: "status",
    customPageSettings: "custom_page_settings",
    shareLink: "share_link",
    templateId: "template_id",
    approvedByUserId: "approved_by_user_id",
    approvedAt: "approved_at",
  };

  const setClauses = [];
  const values = [];
  let valueIndex = 1;

  for (const [key, value] of Object.entries(updateData)) {
    const dbColumnName = allowedFields[key];

    if (dbColumnName && value !== undefined) {
      setClauses.push(`${dbColumnName} = $${valueIndex++}`);

      // Handle JSON fields that need to be stringified
      if (
        key === "customPageSettings" &&
        typeof value === "object" &&
        value !== null
      ) {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }
  }

  if (setClauses.length === 0) {
    throw new Error("No valid fields to update");
    logger.error("No valid fields to update", {
      campaignId,
      updateData,
    });
  }

  values.push(campaignId);
  const queryText = `
    UPDATE campaigns
    SET ${setClauses.join(", ")}
    WHERE campaign_id = $${valueIndex}
    RETURNING *
  `;

  try {
    const result = await executor.query(queryText, values);

    if (result.rowCount === 0) {
      throw new NotFoundError("Campaign not found");
    }

    const updatedCampaign = result.rows[0];

    // Parse JSON fields if they exist and are strings
    if (
      updatedCampaign.custom_page_settings &&
      typeof updatedCampaign.custom_page_settings === "string"
    ) {
      try {
        updatedCampaign.custom_page_settings = JSON.parse(
          updatedCampaign.custom_page_settings
        );
      } catch (parseError) {
        logger.warn(
          "Failed to parse custom_page_settings JSON in update result",
          {
            campaignId,
            error: parseError.message,
          }
        );
      }
    }

    logger.info("Campaign updated successfully", { campaignId });
    return updatedCampaign;
  } catch (error) {
    logger.error("Failed to update campaign", {
      error: error.message,
      campaignId,
    });
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to update campaign", error);
  }
};

/**
 * Find a campaign by ID with organizer and media information
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Object>} Campaign record with related data
 */
export const findCampaignById = async (campaignId) => {
  try {
    const queryText = `
      SELECT 
        c.*,
        u.email as organizer_email,
        u.user_type as organizer_type,
        op.organization_name as organizer_name,
        m1.file_name as main_media_file_name,
        m2.file_name as logo_media_file_name
      FROM campaigns c
      JOIN users u ON c.organizer_id = u.user_id
      LEFT JOIN organization_profiles op ON u.user_id = op.user_id
      LEFT JOIN media m1 ON c.main_media_id = m1.media_id
      LEFT JOIN media m2 ON c.campaign_logo_media_id = m2.media_id
      WHERE c.campaign_id = $1
    `;

    const result = await query(queryText, [campaignId]);

    if (result.rowCount === 0) {
      throw new NotFoundError("Campaign not found");
    }

    const campaign = result.rows[0];

    // Parse JSON fields if they exist and are strings
    if (
      campaign.custom_page_settings &&
      typeof campaign.custom_page_settings === "string"
    ) {
      try {
        campaign.custom_page_settings = JSON.parse(
          campaign.custom_page_settings
        );
      } catch (parseError) {
        logger.warn("Failed to parse custom_page_settings JSON", {
          campaignId,
          error: parseError.message,
        });
      }
    }

    return campaign;
  } catch (error) {
    logger.error("Failed to find campaign by ID", {
      error: error.message,
      campaignId,
    });
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to find campaign", error);
  }
};

/**
 * Find campaigns by organizer ID with optional filters
 * @param {string} organizerId - Organizer ID
 * @param {Object} filters - Optional filters (status, search, limit, offset)
 * @returns {Promise<Array>} List of campaigns
 */
export const findCampaignsByOrganizer = async (organizerId, filters = {}) => {
  try {
    let whereClauses = ["c.organizer_id = $1"];
    let values = [organizerId];
    let valueIndex = 2;

    // Status filter
    if (filters.status) {
      whereClauses.push(`c.status = $${valueIndex++}`);
      values.push(filters.status);
    }

    // Search filter - search in title and description
    if (filters.search && filters.search.trim()) {
      whereClauses.push(`(
        c.title ILIKE $${valueIndex} OR 
        c.description ILIKE $${valueIndex}
      )`);
      values.push(`%${filters.search.trim()}%`);
      valueIndex++;
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const queryText = `
      SELECT 
        c.*,
        u.email as organizer_email,
        op.organization_name as organizer_name
      FROM campaigns c
      JOIN users u ON c.organizer_id = u.user_id
      LEFT JOIN organization_profiles op ON u.user_id = op.user_id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY c.created_at DESC
      LIMIT $${valueIndex++} OFFSET $${valueIndex++}
    `;

    values.push(limit, offset);
    const result = await query(queryText, values);

    // Parse JSON fields for each campaign
    const campaigns = result.rows.map((campaign) => {
      if (
        campaign.custom_page_settings &&
        typeof campaign.custom_page_settings === "string"
      ) {
        try {
          campaign.custom_page_settings = JSON.parse(
            campaign.custom_page_settings
          );
        } catch (parseError) {
          logger.warn("Failed to parse custom_page_settings JSON", {
            campaignId: campaign.campaign_id,
            error: parseError.message,
          });
        }
      }
      return campaign;
    });

    return campaigns;
  } catch (error) {
    logger.error("Failed to find campaigns by organizer", {
      error: error.message,
      organizerId,
    });
    throw new DatabaseError("Failed to find campaigns", error);
  }
};

/**
 * Add categories to a campaign
 * @param {string} campaignId - Campaign ID
 * @param {Array<string>} categoryIds - Array of category IDs
 * @param {Object} [client] - Optional DB client for transaction
 * @returns {Promise<void>}
 */
export const addCampaignCategories = async (
  campaignId,
  categoryIds,
  client
) => {
  const executor = client || { query };

  try {
    if (categoryIds.length === 0) return;

    const values = categoryIds
      .map((categoryId, index) => `($1, $${index + 2})`)
      .join(", ");

    const queryText = `
      INSERT INTO campaign_categories (campaign_id, category_id)
      VALUES ${values}
      ON CONFLICT (campaign_id, category_id) DO NOTHING
    `;

    await executor.query(queryText, [campaignId, ...categoryIds]);

    logger.info("Campaign categories added successfully", {
      campaignId,
      categoryIds,
    });
  } catch (error) {
    logger.error("Failed to add campaign categories", {
      error: error.message,
      campaignId,
    });
    throw new DatabaseError("Failed to add campaign categories", error);
  }
};

/**
 * Remove all categories from a campaign
 * @param {string} campaignId - Campaign ID
 * @param {Object} [client] - Optional DB client for transaction
 * @returns {Promise<void>}
 */
export const removeCampaignCategories = async (campaignId, client) => {
  const executor = client || { query };

  try {
    const queryText = `
      DELETE FROM campaign_categories WHERE campaign_id = $1
    `;

    await executor.query(queryText, [campaignId]);

    logger.info("Campaign categories removed successfully", { campaignId });
  } catch (error) {
    logger.error("Failed to remove campaign categories", {
      error: error.message,
      campaignId,
    });
    throw new DatabaseError("Failed to remove campaign categories", error);
  }
};

/**
 * Get categories for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Array>} List of categories
 */
export const getCampaignCategories = async (campaignId) => {
  try {
    const queryText = `
      SELECT c.*
      FROM categories c
      JOIN campaign_categories cc ON c.category_id = cc.category_id
      WHERE cc.campaign_id = $1
      ORDER BY c.name
    `;

    const result = await query(queryText, [campaignId]);
    return result.rows;
  } catch (error) {
    logger.error("Failed to get campaign categories", {
      error: error.message,
      campaignId,
    });
    throw new DatabaseError("Failed to get campaign categories", error);
  }
};

/**
 * Check if campaign belongs to organizer
 * @param {string} campaignId - Campaign ID
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<boolean>} True if campaign belongs to organizer
 */
export const isCampaignOwner = async (campaignId, organizerId) => {
  try {
    const queryText = `
      SELECT 1 FROM campaigns 
      WHERE campaign_id = $1 AND organizer_id = $2
    `;

    const result = await query(queryText, [campaignId, organizerId]);
    return result.rowCount > 0;
  } catch (error) {
    logger.error("Failed to check campaign ownership", {
      error: error.message,
      campaignId,
      organizerId,
    });
    throw new DatabaseError("Failed to check campaign ownership", error);
  }
};

/**
 * Find all campaigns with optional filters (for admin)
 * @param {Object} filters - Optional filters (status, search, limit, offset)
 * @returns {Promise<Array>} List of campaigns
 */
export const findAllCampaigns = async (filters = {}) => {
  try {
    let whereClauses = [];
    let values = [];
    let valueIndex = 1;

    // Status filter
    if (filters.status) {
      whereClauses.push(`c.status = $${valueIndex++}`);
      values.push(filters.status);
    }

    // Search filter - search in title and description
    if (filters.search && filters.search.trim()) {
      whereClauses.push(`(
        c.title ILIKE $${valueIndex} OR 
        c.description ILIKE $${valueIndex}
      )`);
      values.push(`%${filters.search.trim()}%`);
      valueIndex++;
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const whereClause =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const queryText = `
      SELECT 
        c.*,
        u.email as organizer_email,
        op.organization_name as organizer_name
      FROM campaigns c
      JOIN users u ON c.organizer_id = u.user_id
      LEFT JOIN organization_profiles op ON u.user_id = op.user_id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${valueIndex++} OFFSET $${valueIndex++}
    `;

    values.push(limit, offset);
    const result = await query(queryText, values);

    // Parse JSON fields for each campaign
    const campaigns = result.rows.map((campaign) => {
      if (
        campaign.custom_page_settings &&
        typeof campaign.custom_page_settings === "string"
      ) {
        try {
          campaign.custom_page_settings = JSON.parse(
            campaign.custom_page_settings
          );
        } catch (parseError) {
          logger.warn("Failed to parse custom_page_settings JSON", {
            campaignId: campaign.campaign_id,
            error: parseError.message,
          });
        }
      }
      return campaign;
    });

    return campaigns;
  } catch (error) {
    logger.error("Failed to find all campaigns", {
      error: error.message,
    });
    throw new DatabaseError("Failed to find campaigns", error);
  }
};

export default {
  createCampaign,
  updateCampaign,
  findCampaignById,
  findCampaignsByOrganizer,
  findAllCampaigns,
  addCampaignCategories,
  removeCampaignCategories,
  getCampaignCategories,
  isCampaignOwner,
};
