/**
 * Campaign Controller
 *
 * Handles HTTP requests for campaign management, including creating, updating,
 * and fetching campaigns. Delegates business logic to the Campaign Service
 * and formats API responses.
 *
 * Key Features:
 * - Campaign creation and updates
 * - Draft saving and submission for approval
 * - Campaign listing with filters
 * - Consistent API response formatting
 * - Error handling and validation
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import * as campaignService from "./campaign.service.js";
import { ResponseFactory } from "../../../utils/response.utils.js";

import { NotFoundError } from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";

/**
 * Create a new campaign
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const createCampaign = async (req, res) => {
  const organizerId = req.user.userId;
  const { categoryIds, ...campaignData } = req.body;

  const campaign = await campaignService.createCampaign(
    organizerId,
    campaignData,
    categoryIds || []
  );

  const message =
    campaignData.status === "pendingApproval"
      ? "Campaign submitted for approval successfully"
      : campaignData.status === "draft"
      ? "Campaign draft saved successfully"
      : "Campaign created successfully";

  ResponseFactory.created(res, message, campaign);
};

/**
 * Update an existing campaign
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const updateCampaign = async (req, res) => {
  const { campaignId } = req.params;
  const organizerId = req.user.userId;
  const actorUserType = req.user.userType;
  const { categoryIds, ...updateData } = req.body;

  const campaign = await campaignService.updateCampaign(
    campaignId,
    organizerId,
    updateData,
    categoryIds,
    actorUserType
  );

  const message =
    updateData.status === "pendingApproval"
      ? "Campaign submitted for approval successfully"
      : updateData.status === "pendingStart"
      ? "Campaign approved and scheduled for start"
      : "Campaign updated successfully";

  ResponseFactory.ok(res, message, campaign);
};

/**
 * Get a campaign by ID
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const getCampaignById = async (req, res) => {
  const { campaignId } = req.params;
  const campaign = await campaignService.getCampaignById(campaignId);

  ResponseFactory.ok(res, "Campaign fetched successfully", campaign);
};

/**
 * Get campaigns by organizer with optional filters
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const getCampaignsByOrganizer = async (req, res) => {
  const organizerId = req.user.userId;
  const campaigns = await campaignService.getCampaignsByOrganizer(
    organizerId,
    req.query
  );

  ResponseFactory.ok(res, "Campaigns fetched successfully", campaigns);
};

/**
 * Get all campaigns with optional filters (for admin)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const getAllCampaigns = async (req, res) => {
  const campaigns = await campaignService.getAllCampaigns(req.query);

  ResponseFactory.ok(res, "All campaigns fetched successfully", campaigns);
};

// Draft functionality removed during demolition

/**
 * Check if user can edit campaign
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const canEditCampaign = async (req, res) => {
  const { campaignId } = req.params;
  const organizerId = req.user.userId;

  const canEdit = await campaignService.canEditCampaign(
    campaignId,
    organizerId
  );

  ResponseFactory.ok(res, "Campaign edit permission checked", { canEdit });
};

/**
 * Get campaign by share link (public endpoint)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const getCampaignByShareLink = async (req, res) => {
  const { shareLink } = req.params;

  if (!shareLink) {
    return ResponseFactory.badRequest(res, "Share link is required");
  }

  try {
    // This would need to be implemented in the service/repository
    // For now, we'll return a placeholder response
    logger.info("Getting campaign by share link", { shareLink });

    ResponseFactory.ok(res, "Campaign fetched successfully", {
      shareLink,
      message: "Public campaign endpoint - implementation needed",
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return ResponseFactory.notFound(res, "Campaign not found");
    }
    throw error;
  }
};

/**
 * Process pendingStart campaigns and transition them to active (admin endpoint)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const processPendingStartCampaigns = async (req, res) => {
  const transitionedCount =
    await campaignService.processPendingStartCampaigns();

  ResponseFactory.ok(res, "Pending start campaigns processed successfully", {
    transitionedCount,
  });
};

/**
 * Manually publish a pendingStart campaign (organizer endpoint)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export const publishPendingStartCampaign = async (req, res) => {
  const { campaignId } = req.params;
  const organizerId = req.user.userId;

  const campaign = await campaignService.publishPendingStartCampaign(
    campaignId,
    organizerId
  );

  ResponseFactory.ok(res, "Campaign published successfully", campaign);
};
