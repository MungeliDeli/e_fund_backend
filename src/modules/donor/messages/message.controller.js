import * as messageService from "./message.service.js";
import { ResponseFactory } from "../../../utils/response.utils.js";

export const getMessagesByCampaign = async (req, res) => {
  const { campaignId } = req.params;
  const { status, limit = 50, offset = 0 } = req.query;

  const messages = await messageService.getMessagesByCampaign(
    campaignId,
    status,
    parseInt(limit),
    parseInt(offset)
  );

  return ResponseFactory.ok(res, "Messages retrieved successfully", messages);
};

export const getMessageById = async (req, res) => {
  const { messageId } = req.params;

  const message = await messageService.getMessageById(messageId);

  return ResponseFactory.ok(res, "Message retrieved successfully", message);
};

export const moderateMessage = async (req, res) => {
  const { messageId } = req.params;
  const { status, isFeatured = false } = req.body;
  const moderatedByUserId = req.user.userId;

  const updatedMessage = await messageService.moderateMessage(
    messageId,
    status,
    moderatedByUserId,
    isFeatured
  );

  return ResponseFactory.ok(
    res,
    "Message moderated successfully",
    updatedMessage
  );
};

export const getPendingMessagesCount = async (req, res) => {
  const { campaignId } = req.params;

  const count = await messageService.getPendingMessagesCount(campaignId);

  return ResponseFactory.ok(
    res,
    "Pending messages count retrieved successfully",
    { pendingCount: count }
  );
};

export const getFeaturedMessages = async (req, res) => {
  const { campaignId } = req.params;
  const { limit = 10 } = req.query;

  const messages = await messageService.getFeaturedMessages(
    campaignId,
    parseInt(limit)
  );

  return ResponseFactory.ok(
    res,
    "Featured messages retrieved successfully",
    messages
  );
};

export const getMessagesByUser = async (req, res) => {
  const { userId } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  const messages = await messageService.getMessagesByUser(
    userId,
    parseInt(limit),
    parseInt(offset)
  );

  return ResponseFactory.ok(
    res,
    "User messages retrieved successfully",
    messages
  );
};

export const toggleFeaturedStatus = async (req, res) => {
  const { messageId } = req.params;
  const moderatedByUserId = req.user.userId;

  const updatedMessage = await messageService.toggleFeaturedStatus(
    messageId,
    moderatedByUserId
  );

  return ResponseFactory.ok(
    res,
    "Message featured status toggled successfully",
    updatedMessage
  );
};

/**
 * Get messages by campaign for organizers (with permission check)
 */
export const getMessagesByCampaignForOrganizer = async (req, res) => {
  const { campaignId } = req.params;
  const { status, limit = 50, offset = 0 } = req.query;
  const organizerId = req.user.userId;

  const messages = await messageService.getMessagesByCampaignForOrganizer(
    campaignId,
    organizerId,
    { status, limit: parseInt(limit), offset: parseInt(offset) }
  );

  return ResponseFactory.ok(
    res,
    "Messages retrieved successfully for organizer",
    messages
  );
};

/**
 * Get pending messages count for organizers (with permission check)
 */
export const getPendingMessagesCountForOrganizer = async (req, res) => {
  const { campaignId } = req.params;
  const organizerId = req.user.userId;

  const count = await messageService.getPendingMessagesCountForOrganizer(
    campaignId,
    organizerId
  );

  return ResponseFactory.ok(
    res,
    "Pending messages count retrieved successfully for organizer",
    { pendingCount: count }
  );
};

/**
 * Moderate message for organizers (with permission check)
 */
export const moderateMessageForOrganizer = async (req, res) => {
  const { messageId } = req.params;
  const { status, isFeatured = false } = req.body;
  const organizerId = req.user.userId;

  const updatedMessage = await messageService.moderateMessageForOrganizer(
    messageId,
    status,
    organizerId,
    isFeatured
  );

  return ResponseFactory.ok(
    res,
    "Message moderated successfully by organizer",
    updatedMessage
  );
};

/**
 * Bulk approve all pending messages for a campaign
 */
export const bulkApproveAllMessages = async (req, res) => {
  const { campaignId } = req.params;
  const organizerId = req.user.userId;

  const result = await messageService.bulkApproveAllMessages(
    campaignId,
    organizerId
  );

  return ResponseFactory.ok(
    res,
    `Successfully approved ${result.updatedCount} pending messages`,
    result
  );
};

/**
 * Bulk reject all pending messages for a campaign
 */
export const bulkRejectAllMessages = async (req, res) => {
  const { campaignId } = req.params;
  const organizerId = req.user.userId;

  const result = await messageService.bulkRejectAllMessages(
    campaignId,
    organizerId
  );

  return ResponseFactory.ok(
    res,
    `Successfully rejected ${result.updatedCount} pending messages`,
    result
  );
};

/**
 * Toggle featured status for organizers (with permission check)
 */
export const toggleFeaturedStatusForOrganizer = async (req, res) => {
  const { messageId } = req.params;
  const organizerId = req.user.userId;

  const updatedMessage = await messageService.toggleFeaturedStatusForOrganizer(
    messageId,
    organizerId
  );

  return ResponseFactory.ok(
    res,
    "Message featured status toggled successfully by organizer",
    updatedMessage
  );
};

/**
 * Get campaign message statistics for organizers
 */
export const getCampaignMessageStats = async (req, res) => {
  const { campaignId } = req.params;
  const organizerId = req.user.userId;

  const stats = await messageService.getCampaignMessageStats(
    campaignId,
    organizerId
  );

  return ResponseFactory.ok(
    res,
    "Campaign message statistics retrieved successfully",
    stats
  );
};
