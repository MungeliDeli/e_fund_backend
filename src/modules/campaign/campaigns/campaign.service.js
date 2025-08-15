/**
 * Campaign Service
 *
 * Contains business logic for campaign management, including creating, updating,
 * and fetching campaigns. Handles campaign-category relationships and provides
 * formatted data for API responses.
 *
 * Key Features:
 * - Campaign creation and updates
 * - Campaign-category relationship management
 * - Campaign data formatting for API responses
 * - Transaction management for atomic operations
 * - Error handling and logging
 * - Image metadata handling for campaign images
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import campaignRepository from "./campaign.repository.js";
import {
  NotFoundError,
  DatabaseError,
  AuthorizationError,
} from "../../../utils/appError.js";
import { transaction } from "../../../db/index.js";
import logger from "../../../utils/logger.js";
import { v4 as uuidv4 } from "uuid";
import notificationService from "../../notifications/notification.service.js";

/**
 * Format campaign data for API response
 * @param {Object} campaign - Raw campaign data from database
 * @returns {Object} Formatted campaign object
 */
function formatCampaign(campaign) {
  return {
    campaignId: campaign.campaignId,
    organizerId: campaign.organizerId,
    title: campaign.title,
    description: campaign.description,
    goalAmount: parseFloat(campaign.goalAmount),
    currentRaisedAmount: parseFloat(campaign.currentRaisedAmount),
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    status: campaign.status,
    mainMediaId: campaign.mainMediaId,
    campaignLogoMediaId: campaign.campaignLogoMediaId,
    customPageSettings: campaign.customPageSettings,
    shareLink: campaign.shareLink,
    approvedByUserId: campaign.approvedByUserId,
    approvedAt: campaign.approvedAt,
    templateId: campaign.templateId,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    // Related data
    organizerEmail: campaign.organizerEmail,
    organizerType: campaign.organizerType,
    organizerName: campaign.organizerName,
    mainMediaFileName: campaign.mainMediaFileName,
    logoMediaFileName: campaign.logoMediaFileName,
  };
}

/**
 * Generate a unique share link for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {string} Share link
 */
function generateShareLink(campaignId) {
  const shortId = campaignId.substring(0, 8);
  return `FR-CO-${shortId.toUpperCase()}`;
}

/**
 * Create media records for campaign images
 * @param {Object} imageMetadata - Image metadata from frontend
 * @param {string} campaignId - Campaign ID
 * @param {string} organizerId - Organizer ID
 * @param {Object} client - Database client for transaction
 * @returns {Promise<Object>} Created media records
 */
async function createCampaignMediaRecords(
  imageMetadata,
  campaignId,
  organizerId,
  client
) {
  const mediaRecords = {};

  for (const [field, metadata] of Object.entries(imageMetadata)) {
    if (metadata && metadata.key) {
      const mediaId = uuidv4();

      // Determine entity type based on field
      let entityType = "campaign";
      let description = metadata.description || `${field} for campaign`;

      // Create media record
      const mediaRecord = {
        mediaId,
        entityType,
        entityId: campaignId,
        mediaType: "image",
        fileName: metadata.key,
        fileSize: metadata.fileSize,
        description,
        altText: metadata.altText || "",
        uploadedByUserId: organizerId,
      };

      await campaignRepository.createMediaRecord(mediaRecord, client);
      mediaRecords[field] = mediaId;

      logger.info("Campaign media record created", {
        mediaId,
        field,
        campaignId,
        fileName: metadata.key,
      });
    }
  }

  return mediaRecords;
}

/**
 * Create a new campaign
 * @param {string} organizerId - Organizer ID
 * @param {Object} campaignData - Campaign data
 * @param {Array<string>} categoryIds - Array of category IDs
 * @returns {Promise<Object>} Created campaign
 */
export const createCampaign = async (
  organizerId,
  campaignData,
  categoryIds = []
) => {
  try {
    logger.info("Creating new campaign", {
      organizerId,
      title: campaignData.title,
      status: campaignData.status,
    });

    // Generate share link
    const shareLink = generateShareLink(uuidv4());

    const campaignRecord = {
      ...campaignData,
      organizerId,
      shareLink,
      status: campaignData.status || "draft",
    };

    // Use transaction for atomic operation
    const result = await transaction(async (client) => {
      // Create campaign
      const campaign = await campaignRepository.createCampaign(
        campaignRecord,
        client
      );

      // Add categories if provided
      if (categoryIds.length > 0) {
        await campaignRepository.addCampaignCategories(
          campaign.campaignId,
          categoryIds,
          client
        );
      }

      return campaign;
    });

    // Fetch complete campaign data with categories
    const completeCampaign = await getCampaignById(result.campaignId);

    logger.info("Campaign created successfully", {
      campaignId: result.campaignId,
      organizerId,
      status: result.status,
    });

    return completeCampaign;
  } catch (error) {
    logger.error("Failed to create campaign", {
      error: error.message,
      organizerId,
    });
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError("Failed to create campaign", error);
  }
};

/**
 * Update an existing campaign
 * @param {string} campaignId - Campaign ID
 * @param {string} organizerId - Organizer ID (for ownership verification)
 * @param {Object} updateData - Data to update
 * @param {Array<string>} categoryIds - Array of category IDs (optional)
 * @returns {Promise<Object>} Updated campaign
 */
export const updateCampaign = async (
  campaignId,
  organizerId,
  updateData,
  categoryIds = null,
  actorUserType = null
) => {
  try {
    logger.info("Updating campaign", {
      campaignId,
      organizerId,
      actorUserType,
    });

    const ADMIN_ROLES = [
      "superAdmin",
      "supportAdmin",
      "eventModerator",
      "financialAdmin",
    ];
    const isAdminActor = ADMIN_ROLES.includes(actorUserType);

    // Verify ownership unless admin actor
    if (!isAdminActor) {
      const isOwner = await campaignRepository.isCampaignOwner(
        campaignId,
        organizerId
      );
      if (!isOwner) {
        throw new AuthorizationError("You can only update your own campaigns");
      }
    }

    // Use transaction for atomic operation
    const result = await transaction(async (client) => {
      // If admin is approving/rejecting, stamp approver fields
      const updatePayload = { ...updateData };
      if (
        isAdminActor &&
        (updateData.status === "active" || updateData.status === "rejected")
      ) {
        updatePayload.approvedByUserId = organizerId;
        updatePayload.approvedAt = new Date();
      }

      const campaign = await campaignRepository.updateCampaign(
        campaignId,
        updatePayload,
        client
      );

      // Update categories if provided
      if (categoryIds !== null) {
        await campaignRepository.removeCampaignCategories(campaignId, client);
        if (categoryIds.length > 0) {
          await campaignRepository.addCampaignCategories(
            campaignId,
            categoryIds,
            client
          );
        }
      }

      return campaign;
    });

    // Fetch complete campaign data with categories
    const completeCampaign = await getCampaignById(campaignId);

    logger.info("Campaign updated successfully", { campaignId, organizerId });

    console.log(updateData.status);

    // Simple notification triggers for status changes
    try {
      if (updateData.status === "active") {
        const titleInApp = "Campaign approved";
        const messageInApp = `Your campaign "${completeCampaign.title}" has been approved and is now active.`;
        await notificationService.createAndDispatch({
          userId: completeCampaign.organizerId,
          type: "inApp",
          category: "campaign",
          priority: "high",
          title: titleInApp,
          message: messageInApp,
          data: { campaignId, status: "active" },
          relatedEntityType: "campaign",
          relatedEntityId: campaignId,
          templateId: "campaign.approved.v1",
        });

        const titleEmail = "Your campaign has been approved";
        const messageEmail = `Hi, your campaign \"${completeCampaign.title}\" has been approved and is now live.`;
        await notificationService.createAndDispatch({
          userId: completeCampaign.organizerId,
          type: "email",
          category: "campaign",
          priority: "high",
          title: titleEmail,
          message: messageEmail,
          data: { campaignId, status: "active" },
          relatedEntityType: "campaign",
          relatedEntityId: campaignId,
          templateId: "campaign.approved.v1",
        });
      } else if (updateData.status === "rejected") {
        const titleInApp = "Campaign rejected";
        const messageInApp = `Your campaign "${completeCampaign.title}" was rejected.`;
        await notificationService.createAndDispatch({
          userId: completeCampaign.organizerId,
          type: "inApp",
          category: "campaign",
          priority: "high",
          title: titleInApp,
          message: messageInApp,
          data: { campaignId, status: "rejected" },
          relatedEntityType: "campaign",
          relatedEntityId: campaignId,
          templateId: "campaign.rejected.v1",
        });

        const titleEmail = "Your campaign was rejected";
        const messageEmail = `Hi, your campaign \"${completeCampaign.title}\" was rejected.`;
        await notificationService.createAndDispatch({
          userId: completeCampaign.organizerId,
          type: "email",
          category: "campaign",
          priority: "high",
          title: titleEmail,
          message: messageEmail,
          data: { campaignId, status: "rejected" },
          relatedEntityType: "campaign",
          relatedEntityId: campaignId,
          templateId: "campaign.rejected.v1",
        });
      }
    } catch (notifyError) {
      logger.warn("Campaign status notification failed", {
        campaignId,
        organizerId,
        error: notifyError.message,
      });
    }
    return completeCampaign;
  } catch (error) {
    logger.error("Failed to update campaign", {
      error: error.message,
      campaignId,
      organizerId,
    });
    if (error instanceof AuthorizationError || error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to update campaign", error);
  }
};

/**
 * Get a campaign by ID with categories
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Object>} Campaign with categories
 */
export const getCampaignById = async (campaignId) => {
  try {
    const campaign = await campaignRepository.findCampaignById(campaignId);
    const categories = await campaignRepository.getCampaignCategories(
      campaignId
    );

    const formattedCampaign = formatCampaign(campaign);
    formattedCampaign.categories = categories.map((cat) => ({
      categoryId: cat.categoryId,
      name: cat.name,
      description: cat.description,
    }));

    return formattedCampaign;
  } catch (error) {
    logger.error("Failed to get campaign by ID", {
      error: error.message,
      campaignId,
    });
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to get campaign", error);
  }
};

/**
 * Get campaigns by organizer with optional filters
 * @param {string} organizerId - Organizer ID
 * @param {Object} filters - Optional filters (status, limit, offset)
 * @returns {Promise<Array>} List of campaigns
 */
export const getCampaignsByOrganizer = async (organizerId, filters = {}) => {
  try {
    const campaigns = await campaignRepository.findCampaignsByOrganizer(
      organizerId,
      filters
    );

    // Get categories for each campaign
    const campaignsWithCategories = await Promise.all(
      campaigns.map(async (campaign) => {
        const categories = await campaignRepository.getCampaignCategories(
          campaign.campaignId
        );
        const formattedCampaign = formatCampaign(campaign);
        formattedCampaign.categories = categories.map((cat) => ({
          categoryId: cat.categoryId,
          name: cat.name,
          description: cat.description,
        }));
        // Add categoryName for backward compatibility
        formattedCampaign.categoryName =
          categories.length > 0 ? categories[0].name : "No category";
        return formattedCampaign;
      })
    );

    return campaignsWithCategories;
  } catch (error) {
    logger.error("Failed to get campaigns by organizer", {
      error: error.message,
      organizerId,
    });
    throw new DatabaseError("Failed to get campaigns", error);
  }
};

/**
 * Save campaign as draft (create or update)
 * @param {string} organizerId - Organizer ID
 * @param {Object} campaignData - Campaign data including customPageSettings and imageMetadata
 * @param {string} [campaignId] - Existing campaign ID for updates
 * @returns {Promise<Object>} Saved campaign
 */
export const saveCampaignDraft = async (
  organizerId,
  campaignData,
  campaignId = null
) => {
  try {
    const { categoryIds = [], ...campaignFields } = campaignData;

    if (campaignId) {
      // Update existing draft
      return await updateCampaign(
        campaignId,
        organizerId,
        {
          ...campaignFields,
          status: "draft",
        },
        categoryIds
      );
    } else {
      // Create new draft
      return await createCampaign(
        organizerId,
        {
          ...campaignFields,
          status: "draft",
        },
        categoryIds
      );
    }
  } catch (error) {
    logger.error("Failed to save campaign draft", {
      error: error.message,
      organizerId,
      campaignId,
    });
    throw error;
  }
};

/**
 * Get all campaigns with optional filters (for admin)
 * @param {Object} filters - Optional filters (status, search, limit, offset)
 * @returns {Promise<Array>} List of campaigns
 */
export const getAllCampaigns = async (filters = {}) => {
  try {
    const campaigns = await campaignRepository.findAllCampaigns(filters);

    // Get categories for each campaign
    const campaignsWithCategories = await Promise.all(
      campaigns.map(async (campaign) => {
        const categories = await campaignRepository.getCampaignCategories(
          campaign.campaignId
        );
        const formattedCampaign = formatCampaign(campaign);
        formattedCampaign.categories = categories.map((cat) => ({
          categoryId: cat.categoryId,
          name: cat.name,
          description: cat.description,
        }));
        // Add categoryName for backward compatibility
        formattedCampaign.categoryName =
          categories.length > 0 ? categories[0].name : "No category";
        return formattedCampaign;
      })
    );

    return campaignsWithCategories;
  } catch (error) {
    logger.error("Failed to get all campaigns", {
      error: error.message,
    });
    throw new DatabaseError("Failed to get campaigns", error);
  }
};

/**
 * Check if user can edit campaign
 * @param {string} campaignId - Campaign ID
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<boolean>} True if user can edit
 */
export const canEditCampaign = async (campaignId, organizerId) => {
  try {
    const isOwner = await campaignRepository.isCampaignOwner(
      campaignId,
      organizerId
    );
    if (!isOwner) return false;

    // Check if campaign is in editable state
    const campaign = await campaignRepository.findCampaignById(campaignId);
    const editableStatuses = ["draft", "rejected"];
    return editableStatuses.includes(campaign.status);
  } catch (error) {
    logger.error("Failed to check campaign edit permission", {
      error: error.message,
      campaignId,
      organizerId,
    });
    return false;
  }
};
