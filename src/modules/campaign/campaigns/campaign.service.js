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
import {
  uploadCampaignMediaToS3,
  getPublicS3Url,
} from "../../../utils/s3.utils.js";
import postService from "../../feed/post.service.js";

/**
 * Format campaign data for API response
 * @param {Object} campaign - Raw campaign data from database
 * @returns {Object} Formatted campaign object
 */
function formatCampaign(campaign) {
  return {
    campaignId: campaign.campaignId,
    organizerId: campaign.organizerId,
    name: campaign.name, // Use name instead of title
    description: campaign.description,
    goalAmount: parseFloat(campaign.goalAmount),
    currentRaisedAmount: parseFloat(campaign.currentRaisedAmount),
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    status: campaign.status,
    statusReason: campaign.statusReason || null,
    customPageSettings: campaign.customPageSettings,
    shareLink: campaign.shareLink,
    approvedByUserId: campaign.approvedByUserId,
    approvedAt: campaign.approvedAt,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    // Related data
    organizerEmail: campaign.organizerEmail,
    organizerType: campaign.organizerType,
    organizerName: campaign.organizerName,
    // Newly exposed aggregated data
    donationCount:
      typeof campaign.donationCount === "number"
        ? campaign.donationCount
        : campaign.donationCount != null
        ? parseInt(campaign.donationCount, 10)
        : 0,
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
 * Upload campaign media files to S3 and return URLs with metadata
 * @param {string} campaignId - Campaign ID
 * @param {string} organizerId - Organizer ID
 * @param {Object} mediaFiles - Object containing media files
 * @returns {Promise<Object>} Object containing media URLs and metadata
 */
async function uploadCampaignMedia(campaignId, organizerId, mediaFiles) {
  const mediaData = {};

  try {
    // Handle main media (image or video)
    if (mediaFiles.mainMedia && mediaFiles.mainMedia[0]) {
      const mainFile = mediaFiles.mainMedia[0];
      const mediaType = "main";

      // Create S3 key with campaign ID prefix
      const s3Key = await uploadCampaignMediaToS3({
        fileBuffer: mainFile.buffer,
        fileName: mainFile.originalname,
        mimeType: mainFile.mimetype,
        campaignId,
        mediaType,
      });

      // Get public URL and store with metadata
      const publicUrl = getPublicS3Url(s3Key);
      mediaData.mainMedia = {
        url: publicUrl,
        type: mainFile.mimetype.startsWith("video/") ? "video" : "image",
        fileName: mainFile.originalname,
        fileSize: mainFile.size,
        mimeType: mainFile.mimetype,
        s3Key: s3Key,
        uploadedAt: new Date().toISOString(),
      };

      logger.info("Main media uploaded successfully", {
        campaignId,
        s3Key,
        mediaType: mediaData.mainMedia.type,
      });
    }

    // Handle secondary images (sec1 and sec2)
    const secondaryImageKeys = Object.keys(mediaFiles).filter((key) =>
      key.startsWith("secondaryImage")
    );

    if (secondaryImageKeys.length > 0) {
      mediaData.secondaryImages = [];
    }

    for (let i = 0; i < secondaryImageKeys.length; i++) {
      const key = secondaryImageKeys[i];
      const fileArray = mediaFiles[key];

      if (fileArray && fileArray[0]) {
        const file = fileArray[0];
        const mediaType = `sec${i + 1}`; // sec1, sec2

        // Upload to S3 with campaign ID prefix
        const s3Key = await uploadCampaignMediaToS3({
          fileBuffer: file.buffer,
          fileName: file.originalname,
          mimeType: file.mimetype,
          campaignId,
          mediaType,
        });

        // Get public URL and store with metadata
        const publicUrl = getPublicS3Url(s3Key);
        mediaData.secondaryImages.push({
          url: publicUrl,
          type: "image",
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          s3Key: s3Key,
          uploadedAt: new Date().toISOString(),
        });

        logger.info("Secondary image uploaded successfully", {
          campaignId,
          s3Key,
          index: i + 1,
        });
      }
    }

    return mediaData;
  } catch (error) {
    logger.error("Failed to upload campaign media", {
      error: error.message,
      campaignId,
      organizerId,
    });
    throw new DatabaseError("Failed to upload campaign media", error);
  }
}

/**
 * Create a new campaign with media uploads
 * @param {string} organizerId - Organizer ID
 * @param {Object} campaignData - Campaign data
 * @param {Object} mediaFiles - Object containing media files
 * @returns {Promise<Object>} Created campaign
 */
export const createCampaign = async (
  organizerId,
  campaignData,
  mediaFiles = {}
) => {
  try {
    logger.info("Creating new campaign", {
      organizerId,
      name: campaignData.name,
      status: campaignData.status,
    });

    // Generate share link
    const shareLink = generateShareLink(uuidv4());

    // Separate campaign table data from campaign settings
    const {
      name,
      description,
      goalAmount,
      startDate,
      endDate,
      status = "pendingApproval",
      categoryIds, // Changed from categoryId to categoryIds array
      campaignSettings, // This comes as JSON string from frontend
      ...otherData
    } = campaignData;

    // Parse categoryIds if it's a string
    let parsedCategoryIds = [];
    if (categoryIds) {
      try {
        parsedCategoryIds =
          typeof categoryIds === "string"
            ? JSON.parse(categoryIds)
            : categoryIds;
      } catch (parseError) {
        logger.warn("Failed to parse categoryIds JSON, using empty array", {
          categoryIds,
          error: parseError.message,
        });
        parsedCategoryIds = [];
      }
    }

    // Validate categoryIds
    if (!Array.isArray(parsedCategoryIds) || parsedCategoryIds.length === 0) {
      throw new Error("At least one category is required");
    }
    if (parsedCategoryIds.length > 3) {
      throw new Error("Maximum 3 categories allowed");
    }

    // Parse campaignSettings if it's a string
    let parsedCampaignSettings = {};
    if (campaignSettings) {
      try {
        parsedCampaignSettings =
          typeof campaignSettings === "string"
            ? JSON.parse(campaignSettings)
            : campaignSettings;
      } catch (parseError) {
        logger.warn("Failed to parse campaignSettings JSON, using defaults", {
          campaignSettings,
          error: parseError.message,
        });
        // Fallback to defaults
        parsedCampaignSettings = {
          title: name,
          message: description,
          predefinedAmounts: ["25", "50", "100", "200"],
          themeColor: "#10B981",
        };
      }
    } else {
      // Fallback to defaults if no campaignSettings provided
      parsedCampaignSettings = {
        title: name,
        message: description,
        predefinedAmounts: ["25", "50", "100", "200"],
        themeColor: "#10B981",
      };
    }

    // Build initial custom page settings object (without media)
    const customPageSettings = {
      ...parsedCampaignSettings,
      // Media data will be added after S3 upload
    };

    const campaignRecord = {
      organizerId,
      name, // Use name directly since we renamed the column
      description,
      goalAmount: parseFloat(goalAmount),
      startDate: startDate || null,
      endDate: endDate || null,
      status,
      customPageSettings,
      shareLink,
    };

    // Use transaction for atomic operation
    const result = await transaction(async (client) => {
      // Step 1: Create campaign first to get campaignId
      const campaign = await campaignRepository.createCampaign(
        campaignRecord,
        client
      );
      const campaignId = campaign.campaignId;

      // Step 2: Upload media files to S3 and get URLs with metadata
      const mediaData = await uploadCampaignMedia(
        campaignId,
        organizerId,
        mediaFiles
      );

      // Step 3: Update custom page settings with media data
      const updatedCustomPageSettings = {
        ...customPageSettings,
        ...mediaData, // Spread media data directly into settings
      };

      // Step 4: Update campaign with media URLs in custom page settings
      const updatedCampaign = await campaignRepository.updateCampaign(
        campaignId,
        { customPageSettings: updatedCustomPageSettings },
        client
      );

      // Step 5: Add category if provided
      if (parsedCategoryIds.length > 0) {
        await campaignRepository.addCampaignCategories(
          campaignId,
          parsedCategoryIds,
          client
        );
      }

      return updatedCampaign;
    });

    // Fetch complete campaign data with categories
    const completeCampaign = await getCampaignById(result.campaignId);

    // Create campaign post if campaign is in a published state
    try {
      const publishedStatuses = ["active", "successful", "closed"];
      if (publishedStatuses.includes(result.status)) {
        await postService.createCampaignPost({
          campaignId: result.campaignId,
          organizerId,
          customPageSettings: updatedCustomPageSettings,
          status: result.status,
        });
        logger.info("Campaign post created automatically", {
          campaignId: result.campaignId,
          organizerId,
        });
      }
    } catch (postError) {
      logger.error("Failed to create campaign post", {
        error: postError.message,
        campaignId: result.campaignId,
        organizerId,
      });
      // Don't throw error - campaign creation should still succeed
    }

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
        title: campaignData.name,
        status: result.status,
        categoryCount: parsedCategoryIds.length,
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
        const startDateRaw = currentCampaign.startDate;
        const startDate = startDateRaw ? new Date(startDateRaw) : null;

        // Only auto-activate if there is a valid start date and it's due
        if (startDate && !isNaN(startDate.getTime()) && startDate <= now) {
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

    // Handle campaign post creation/update based on status changes
    try {
      console.log("we are here");

      if (updateData.status) {
        const publishedStatuses = ["active", "successful", "closed"];
        const archivedStatuses = [
          "pendingApproval",
          "pendingStart",
          "cancelled",
          "rejected",
        ];

        // Check if campaign post exists
        const existingPost = await postService.getCampaignPostByCampaignId(
          campaignId
        );

        if (publishedStatuses.includes(updateData.status)) {
          if (existingPost) {
            // Update existing post status to published
            await postService.updateCampaignPostStatus(
              campaignId,
              updateData.status
            );
            logger.info("Campaign post status updated to published", {
              campaignId,
              organizerId,
            });
          } else {
            // Create new campaign post
            await postService.createCampaignPost({
              campaignId,
              organizerId,
              customPageSettings: completeCampaign.customPageSettings,
              status: updateData.status,
            });
            logger.info("Campaign post created automatically", {
              campaignId,
              organizerId,
            });
          }
        } else if (archivedStatuses.includes(updateData.status)) {
          if (existingPost) {
            // Update existing post status to archived
            await postService.updateCampaignPostStatus(
              campaignId,
              updateData.status
            );
            logger.info("Campaign post status updated to archived", {
              campaignId,
              organizerId,
            });
          }
        }
      }
    } catch (postError) {
      logger.error("Failed to handle campaign post", {
        error: postError.message,
        campaignId,
        organizerId,
      });
      // Don't throw error - campaign update should still succeed
    }

    logger.info("Campaign updated successfully", { campaignId, organizerId });

    // Simple notification triggers for status changes
    try {
      if (updateData.status === "pendingStart") {
        const titleInApp = "Campaign approved";
        const messageInApp = `Your campaign "${completeCampaign.name}" has been approved.`;
        const fullLink = buildCampaignLink(campaignId);
        await notificationService.createAndDispatch({
          userId: completeCampaign.organizerId,
          type: "inApp",
          category: "campaign",
          priority: "high",
          title: titleInApp,
          message: messageInApp,
          data: {
            campaignId,
            status: "pendingStart",
            route: `/campaigns/${campaignId}`,
            linkText: "View campaign",
          },
          relatedEntityType: "campaign",
          relatedEntityId: campaignId,
          templateId: "campaign.approved.v1",
        });

        const titleEmail = "Your campaign has been approved";
        const messageEmail = `Hi, your campaign \"${completeCampaign.name}\" has been approved. <br/><a href="${fullLink}">View campaign</a>`;
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
        const messageInApp = `Your campaign "${completeCampaign.name}" is now active and accepting donations.`;
        const fullLink = buildCampaignLink(campaignId);
        await notificationService.createAndDispatch({
          userId: completeCampaign.organizerId,
          type: "inApp",
          category: "campaign",
          priority: "high",
          title: titleInApp,
          message: messageInApp,
          data: {
            campaignId,
            status: "active",
            route: `/campaigns/${campaignId}`,
            linkText: "View campaign",
          },
          relatedEntityType: "campaign",
          relatedEntityId: campaignId,
          templateId: "campaign.approved.v1",
        });

        const titleEmail = "Your campaign is now live";
        const messageEmail = `Hi, your campaign \"${completeCampaign.name}\" is now active and accepting donations. <br/><a href="${fullLink}">View campaign</a>`;
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
        const messageInApp = `Your campaign \"${completeCampaign.name}\" was rejected.`;
        const fullLink = buildCampaignLink(campaignId);
        await notificationService.createAndDispatch({
          userId: completeCampaign.organizerId,
          type: "inApp",
          category: "campaign",
          priority: "high",
          title: titleInApp,
          message: messageInApp,
          data: {
            campaignId,
            status: "rejected",
            route: `/campaigns/${campaignId}`,
            linkText: "See reason here",
            reason: updateData.statusReason || null,
          },
          relatedEntityType: "campaign",
          relatedEntityId: campaignId,
          templateId: "campaign.rejected.v1",
        });

        const titleEmail = "Your campaign was rejected";
        const messageEmail = `Hi, your campaign \"${
          completeCampaign.name
        }\" was rejected.${
          updateData.statusReason ? ` Reason: ${updateData.statusReason}` : ""
        } <br/><a href="${fullLink}">See reason here</a>`;
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
      } else if (updateData.status === "cancelled") {
        const titleInApp = "Campaign cancelled";
        const messageInApp = `Your campaign \"${completeCampaign.name}\" was cancelled.`;
        const fullLink = buildCampaignLink(campaignId);
        await notificationService.createAndDispatch({
          userId: completeCampaign.organizerId,
          type: "inApp",
          category: "campaign",
          priority: "high",
          title: titleInApp,
          message: messageInApp,
          data: {
            campaignId,
            status: "cancelled",
            route: `/campaigns/${campaignId}`,
            linkText: "See reason here",
            reason: updateData.statusReason || null,
          },
          relatedEntityType: "campaign",
          relatedEntityId: campaignId,
          templateId: "campaign.cancelled.v1",
        });

        const titleEmail = "Your campaign was cancelled";
        const messageEmail = `Hi, your campaign \"${
          completeCampaign.name
        }\" was cancelled.${
          updateData.statusReason ? ` Reason: ${updateData.statusReason}` : ""
        } <br/><a href="${fullLink}">See reason here</a>`;
        await notificationService.createAndDispatch({
          userId: completeCampaign.organizerId,
          type: "email",
          category: "campaign",
          priority: "high",
          title: titleEmail,
          message: messageEmail,
          data: { campaignId, status: "cancelled" },
          relatedEntityType: "campaign",
          relatedEntityId: campaignId,
          templateId: "campaign.cancelled.v1",
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

      // Map status transitions to specific audit actions
      if (updateData.status === "pendingStart") {
        // Admin approved but campaign not yet live
        actionType = CAMPAIGN_ACTIONS.CAMPAIGN_APPROVED;
      } else if (updateData.status === "active") {
        // Campaign is now live
        actionType = CAMPAIGN_ACTIONS.CAMPAIGN_PUBLISHED;
      } else if (updateData.status === "rejected") {
        actionType = CAMPAIGN_ACTIONS.CAMPAIGN_REJECTED;
      } else if (updateData.status === "cancelled") {
        actionType = CAMPAIGN_ACTIONS.CAMPAIGN_CANCELLED;
      } else if (updateData.status === "pendingApproval") {
        actionType = CAMPAIGN_ACTIONS.CAMPAIGN_SUBMITTED;
      }

      await logCampaignEvent(global.req, actionType, campaignId, {
        organizerId,
        actorUserType,
        previousStatus: completeCampaign.status,
        newStatus: updateData.status,
        isAdminAction: isAdminActor,
        statusReason: updateData.statusReason || null,
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
 * Get a campaign by share link (public)
 * Only returns if campaign is publicly viewable (active or successful or closed)
 * and not in pendingApproval, pendingStart, rejected, or cancelled
 * @param {string} shareLink - Public share link
 * @returns {Promise<Object>} Campaign with categories
 */
export const getCampaignByShareLink = async (shareLink) => {
  try {
    const campaign = await campaignRepository.findCampaignByShareLink(
      shareLink
    );

    // Enforce public visibility rules
    const nonPublicStatuses = [
      "pendingApproval",
      "pendingStart",
      "rejected",
      "cancelled",
      "draft",
    ];
    if (nonPublicStatuses.includes(campaign.status)) {
      throw new NotFoundError("Campaign not publicly available");
    }

    const categories = await campaignRepository.getCampaignCategories(
      campaign.campaignId
    );

    const formattedCampaign = formatCampaign(campaign);
    formattedCampaign.categories = categories.map((cat) => ({
      categoryId: cat.categoryId,
      name: cat.name,
      description: cat.description,
    }));

    return formattedCampaign;
  } catch (error) {
    logger.error("Failed to get campaign by share link", {
      error: error.message,
      shareLink,
    });
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to get campaign by share link", error);
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

// Draft functionality removed during demolition

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
    const editableStatuses = ["rejected"];
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
      const startDateRaw = campaign.startDate;
      const startDate = startDateRaw ? new Date(startDateRaw) : null;
      if (startDate && !isNaN(startDate.getTime()) && startDate <= now) {
        await campaignRepository.updateCampaign(campaign.campaignId, {
          status: "active",
        });

        // Send notification to organizer
        try {
          const titleInApp = "Campaign is now live";
          const messageInApp = `Your campaign "${campaign.name}" has started and is now active.`;
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

    // Create campaign post when manually publishing
    try {
      const completeCampaign = await getCampaignById(campaignId);
      await postService.createCampaignPost({
        campaignId,
        organizerId,
        customPageSettings: completeCampaign.customPageSettings,
        status: "active",
      });
      logger.info("Campaign post created on manual publish", {
        campaignId,
        organizerId,
      });
    } catch (postError) {
      logger.error("Failed to create campaign post on manual publish", {
        error: postError.message,
        campaignId,
        organizerId,
      });
      // Don't throw error - campaign publishing should still succeed
    }

    // Build public link and title slug
    const titleSlug = (campaign.name || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 80);
    const publicRoute = `/campaign/${campaign.shareLink}-${titleSlug}`;
    const base =
      process.env.FRONTEND_BASE_URL ||
      process.env.APP_BASE_URL ||
      process.env.CORS_ORIGIN ||
      "";
    const fullPublicLink =
      typeof base === "string" &&
      (base.startsWith("http://") || base.startsWith("https://"))
        ? base.replace(/\/+$/, "") + publicRoute
        : publicRoute;

    // Log audit event for campaign publishing
    if (global.req) {
      await logCampaignEvent(
        global.req,
        CAMPAIGN_ACTIONS.CAMPAIGN_PUBLISHED,
        campaignId,
        {
          organizerId,
          title: campaign.name,
          status: "active",
          action: "manual_publish",
          shareLink: campaign.shareLink,
          titleSlug,
          publicLink: publicRoute,
        }
      );
    }

    // Send notification to organizer
    try {
      const titleInApp = "Campaign published";
      const messageInApp = `Your campaign "${campaign.name}" has been published and is now live.`;
      await notificationService.createAndDispatch({
        userId: organizerId,
        type: "inApp",
        category: "campaign",
        priority: "high",
        title: titleInApp,
        message: messageInApp,
        data: {
          campaignId,
          status: "active",
          shareLink: campaign.shareLink,
          titleSlug,
          publicLink: publicRoute,
        },
        relatedEntityType: "campaign",
        relatedEntityId: campaignId,
        templateId: "campaign.published.v1",
      });

      // Also send email to organizer
      const titleEmail = "Your campaign is live";
      const messageEmail = `Hi, your campaign \"${campaign.name}\" is now live. <br/><a href="${fullPublicLink}">View your campaign</a>`;
      await notificationService.createAndDispatch({
        userId: organizerId,
        type: "email",
        category: "campaign",
        priority: "high",
        title: titleEmail,
        message: messageEmail,
        data: {
          campaignId,
          status: "active",
          shareLink: campaign.shareLink,
          titleSlug,
          publicLink: publicRoute,
        },
        relatedEntityType: "campaign",
        relatedEntityId: campaignId,
        templateId: "campaign.published.email.v1",
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
          message: `Campaign "${campaign.name}" has been published by organizer.`,
          data: {
            campaignId,
            status: "active",
            organizerId,
            organizerName: campaign.organizerName || "Unknown Organizer",
            shareLink: campaign.shareLink,
            titleSlug,
            publicLink: publicRoute,
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

function buildCampaignLink(campaignId) {
  // Prefer public share link if available
  // Fallback to internal organizer view
  const route = `/campaigns/${campaignId}`;
  const base =
    process.env.FRONTEND_BASE_URL ||
    process.env.APP_BASE_URL ||
    process.env.CORS_ORIGIN ||
    "";
  if (
    typeof base === "string" &&
    (base.startsWith("http://") || base.startsWith("https://"))
  ) {
    return base.replace(/\/+$/, "") + route;
  }
  return route;
}
