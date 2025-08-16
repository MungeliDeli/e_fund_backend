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
import { logCampaignEvent } from "../../audit/audit.utils.js";
import { CAMPAIGN_ACTIONS } from "../../audit/audit.constants.js";

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

    // Log audit event for campaign creation
    if (global.req) {
      let actionType = CAMPAIGN_ACTIONS.CAMPAIGN_CREATED;

      // Determine the appropriate action type based on status
      if (result.status === "pendingApproval") {
        actionType = CAMPAIGN_ACTIONS.CAMPAIGN_SUBMITTED;
      } else if (result.status === "active") {
        actionType = CAMPAIGN_ACTIONS.CAMPAIGN_PUBLISHED;
      }

      await logCampaignEvent(global.req, actionType, result.campaignId, {
        organizerId,
        title: campaignData.title,
        status: result.status,
        categoryCount: categoryIds.length,
      });
    }

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
        (updateData.status === "pendingStart" ||
          updateData.status === "active" ||
          updateData.status === "rejected")
      ) {
        updatePayload.approvedByUserId = organizerId;
        updatePayload.approvedAt = new Date();
      }

      // Handle status transition logic
      if (isAdminActor && updateData.status === "pendingStart") {
        // When admin approves, check if campaign should be active or pendingStart
        const currentCampaign = await campaignRepository.findCampaignById(
          campaignId
        );
        const now = new Date();
        const startDate = new Date(currentCampaign.startDate);

        // If start date is in the past or today, make it active immediately
        if (startDate <= now) {
          updatePayload.status = "active";
        }
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

    // Simple notification triggers for status changes
    try {
      if (updateData.status === "pendingStart") {
        const titleInApp = "Campaign approved";
        const messageInApp = `Your campaign "${
          completeCampaign.title
        }" has been approved and will start on ${new Date(
          completeCampaign.startDate
        ).toLocaleDateString()}.`;
        await notificationService.createAndDispatch({
          userId: completeCampaign.organizerId,
          type: "inApp",
          category: "campaign",
          priority: "high",
          title: titleInApp,
          message: messageInApp,
          data: { campaignId, status: "pendingStart" },
          relatedEntityType: "campaign",
          relatedEntityId: campaignId,
          templateId: "campaign.approved.v1",
        });

        const titleEmail = "Your campaign has been approved";
        const messageEmail = `Hi, your campaign \"${
          completeCampaign.title
        }\" has been approved and will start on ${new Date(
          completeCampaign.startDate
        ).toLocaleDateString()}.`;
        await notificationService.createAndDispatch({
          userId: completeCampaign.organizerId,
          type: "email",
          category: "campaign",
          priority: "high",
          title: titleEmail,
          message: messageEmail,
          data: { campaignId, status: "pendingStart" },
          relatedEntityType: "campaign",
          relatedEntityId: campaignId,
          templateId: "campaign.approved.v1",
        });
      } else if (updateData.status === "active") {
        const titleInApp = "Campaign is now live";
        const messageInApp = `Your campaign "${completeCampaign.title}" is now active and accepting donations.`;
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

        const titleEmail = "Your campaign is now live";
        const messageEmail = `Hi, your campaign \"${completeCampaign.title}\" is now active and accepting donations.`;
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

    // Log audit event for campaign update
    if (global.req) {
      let actionType = CAMPAIGN_ACTIONS.CAMPAIGN_UPDATED;

      // Determine specific action type based on status change
      if (updateData.status === "active") {
        actionType = CAMPAIGN_ACTIONS.CAMPAIGN_APPROVED;
      } else if (updateData.status === "rejected") {
        actionType = CAMPAIGN_ACTIONS.CAMPAIGN_REJECTED;
      } else if (updateData.status === "published") {
        actionType = CAMPAIGN_ACTIONS.CAMPAIGN_PUBLISHED;
      } else if (updateData.status === "paused") {
        actionType = CAMPAIGN_ACTIONS.CAMPAIGN_PAUSED;
      } else if (updateData.status === "draft") {
        actionType = CAMPAIGN_ACTIONS.CAMPAIGN_RESUMED;
      }

      await logCampaignEvent(global.req, actionType, campaignId, {
        organizerId,
        actorUserType,
        previousStatus: completeCampaign.status,
        newStatus: updateData.status,
        isAdminAction: isAdminActor,
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

/**
 * Process pendingStart campaigns and transition them to active if start date is reached
 * This function should be called periodically (e.g., via cron job)
 * @returns {Promise<number>} Number of campaigns transitioned
 */
export const processPendingStartCampaigns = async () => {
  try {
    const now = new Date();
    const pendingStartCampaigns =
      await campaignRepository.findCampaignsByStatus("pendingStart");

    let transitionedCount = 0;

    for (const campaign of pendingStartCampaigns) {
      const startDate = new Date(campaign.startDate);
      if (startDate <= now) {
        await campaignRepository.updateCampaign(campaign.campaignId, {
          status: "active",
        });

        // Send notification to organizer
        try {
          const titleInApp = "Campaign is now live";
          const messageInApp = `Your campaign "${campaign.title}" has started and is now active.`;
          await notificationService.createAndDispatch({
            userId: campaign.organizerId,
            type: "inApp",
            category: "campaign",
            priority: "high",
            title: titleInApp,
            message: messageInApp,
            data: { campaignId: campaign.campaignId, status: "active" },
            relatedEntityType: "campaign",
            relatedEntityId: campaign.campaignId,
            templateId: "campaign.started.v1",
          });
        } catch (notificationError) {
          logger.error("Failed to send campaign start notification", {
            error: notificationError.message,
            campaignId: campaign.campaignId,
          });
        }

        transitionedCount++;
      }
    }

    if (transitionedCount > 0) {
      logger.info(
        `Transitioned ${transitionedCount} campaigns from pendingStart to active`
      );
    }

    return transitionedCount;
  } catch (error) {
    logger.error("Failed to process pendingStart campaigns", {
      error: error.message,
    });
    throw new DatabaseError("Failed to process pendingStart campaigns", error);
  }
};

/**
 * Manually publish a pendingStart campaign (for organizers)
 * @param {string} campaignId - Campaign ID
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Object>} Updated campaign
 */
export const publishPendingStartCampaign = async (campaignId, organizerId) => {
  try {
    // Verify ownership
    const isOwner = await campaignRepository.isCampaignOwner(
      campaignId,
      organizerId
    );
    if (!isOwner) {
      throw new AuthorizationError("You can only publish your own campaigns");
    }

    // Get current campaign
    const campaign = await campaignRepository.findCampaignById(campaignId);
    if (campaign.status !== "pendingStart") {
      throw new Error(
        "Campaign must be in pendingStart status to be published"
      );
    }

    // Update status to active
    const updatedCampaign = await campaignRepository.updateCampaign(
      campaignId,
      {
        status: "active",
      }
    );

    // Log audit event for campaign publishing
    if (global.req) {
      await logCampaignEvent(
        global.req,
        CAMPAIGN_ACTIONS.CAMPAIGN_PUBLISHED,
        campaignId,
        {
          organizerId,
          title: campaign.title,
          status: "active",
          action: "manual_publish",
        }
      );
    }

    // Send notification to organizer
    try {
      const titleInApp = "Campaign published";
      const messageInApp = `Your campaign "${campaign.title}" has been published and is now live.`;
      await notificationService.createAndDispatch({
        userId: organizerId,
        type: "inApp",
        category: "campaign",
        priority: "high",
        title: titleInApp,
        message: messageInApp,
        data: { campaignId, status: "active" },
        relatedEntityType: "campaign",
        relatedEntityId: campaignId,
        templateId: "campaign.published.v1",
      });
    } catch (notificationError) {
      logger.error(
        "Failed to send campaign publish notification to organizer",
        {
          error: notificationError.message,
          campaignId,
        }
      );
    }

    // Send notification to admins about campaign publication
    try {
      const adminRoles = [
        "superAdmin",
        "supportAdmin",
        "eventModerator",
        "financialAdmin",
      ];
      const adminUsers = await campaignRepository.findUsersByRoles(adminRoles);

      for (const adminUser of adminUsers) {
        await notificationService.createAndDispatch({
          userId: adminUser.userId,
          type: "inApp",
          category: "campaign",
          priority: "medium",
          title: "Campaign published",
          message: `Campaign "${campaign.title}" has been published by organizer.`,
          data: {
            campaignId,
            status: "active",
            organizerId,
            organizerName: campaign.organizerName || "Unknown Organizer",
          },
          relatedEntityType: "campaign",
          relatedEntityId: campaignId,
          templateId: "admin.campaign.published.v1",
        });
      }
    } catch (adminNotificationError) {
      logger.error("Failed to send campaign publish notification to admins", {
        error: adminNotificationError.message,
        campaignId,
      });
    }

    logger.info("Campaign published successfully", { campaignId, organizerId });
    return updatedCampaign;
  } catch (error) {
    logger.error("Failed to publish pendingStart campaign", {
      error: error.message,
      campaignId,
      organizerId,
    });
    throw error;
  }
};
