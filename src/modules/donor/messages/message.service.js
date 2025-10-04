import * as messageRepository from "./message.repository.js";
import { AppError } from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";
import { isCampaignOwner } from "../../campaign/campaigns/campaign.repository.js";

export const getMessagesByCampaign = async (
  campaignId,
  status = null,
  limit = 50,
  offset = 0
) => {
  const messages = await messageRepository.getMessagesByCampaign(
    campaignId,
    status,
    limit,
    offset
  );

  return messages;
};

export const getMessageById = async (messageId) => {
  const message = await messageRepository.getMessageById(messageId);

  if (!message) {
    throw new AppError("Message not found", 404);
  }

  return message;
};

export const moderateMessage = async (
  messageId,
  status,
  moderatedByUserId,
  isFeatured = false
) => {
  // Validate message exists
  const existingMessage = await messageRepository.getMessageById(messageId);
  if (!existingMessage) {
    throw new AppError("Message not found", 404);
  }

  // Validate status transition
  if (
    existingMessage.status === "approved" ||
    existingMessage.status === "rejected"
  ) {
    throw new AppError("Message has already been moderated", 400);
  }

  // Only approved messages can be featured
  if (isFeatured && status !== "approved") {
    throw new AppError("Only approved messages can be featured", 400);
  }

  const updatedMessage = await messageRepository.updateMessageStatus(
    messageId,
    status,
    moderatedByUserId,
    isFeatured
  );

  logger.info(`Message moderated`, {
    messageId,
    status,
    moderatedBy: moderatedByUserId,
    isFeatured,
  });

  return updatedMessage;
};

export const getPendingMessagesCount = async (campaignId) => {
  const count = await messageRepository.getPendingMessagesCount(campaignId);
  return count;
};

export const getFeaturedMessages = async (campaignId, limit = 10) => {
  const messages = await messageRepository.getFeaturedMessages(
    campaignId,
    limit
  );
  return messages;
};

export const getMessagesByUser = async (userId, limit = 50, offset = 0) => {
  const messages = await messageRepository.getMessagesByUser(
    userId,
    limit,
    offset
  );

  return messages;
};

export const toggleFeaturedStatus = async (messageId, moderatedByUserId) => {
  const message = await messageRepository.getMessageById(messageId);

  if (!message) {
    throw new AppError("Message not found", 404);
  }

  if (message.status !== "approved") {
    throw new AppError("Only approved messages can be featured", 400);
  }

  const newFeaturedStatus = !message.isFeatured;

  const updatedMessage = await messageRepository.updateMessageStatus(
    messageId,
    message.status,
    moderatedByUserId,
    newFeaturedStatus
  );

  logger.info(`Message featured status toggled`, {
    messageId,
    isFeatured: newFeaturedStatus,
    moderatedBy: moderatedByUserId,
  });

  return updatedMessage;
};

export const createMessage = async (messageData, client = null) => {
  try {
    // Validate required fields
    if (!messageData.campaignId) {
      throw new AppError("Campaign ID is required", 400);
    }
    if (!messageData.messageText || !messageData.messageText.trim()) {
      throw new AppError("Message text is required", 400);
    }

    // Validate message length
    const trimmedMessage = messageData.messageText.trim();
    if (trimmedMessage.length > 1000) {
      throw new AppError("Message cannot exceed 1000 characters", 400);
    }

    // Check for potentially harmful content
    const harmfulPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /data:text\/html/gi,
    ];

    for (const pattern of harmfulPatterns) {
      if (pattern.test(trimmedMessage)) {
        throw new AppError("Message contains potentially harmful content", 400);
      }
    }

    // Create message payload
    const messagePayload = {
      campaignId: messageData.campaignId,
      donorUserId: messageData.donorUserId || null,
      messageText: trimmedMessage,
      status: messageData.status || "pendingModeration",
      isAnonymous: messageData.isAnonymous || false,
    };

    const message = await messageRepository.createMessage(
      messagePayload,
      client
    );

    logger.info("Donation message created successfully", {
      messageId: message.messageId,
      campaignId: messageData.campaignId,
      isAnonymous: messageData.isAnonymous || false,
      messageLength: trimmedMessage.length,
    });

    return message;
  } catch (error) {
    logger.error("Error creating donation message:", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Failed to create donation message", 500);
  }
};

export const deleteMessage = async (messageId, client = null) => {
  try {
    if (!messageId) {
      throw new AppError("Message ID is required", 400);
    }

    const deleted = await messageRepository.deleteMessageById(
      messageId,
      client
    );

    if (!deleted) {
      // Already deleted or not found; treat as no-op
      return null;
    }

    logger.info("Donation message deleted", { messageId });
    return deleted;
  } catch (error) {
    logger.error("Error deleting donation message:", error);
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to delete donation message", 500);
  }
};

/**
 * Get messages by campaign for organizers with permission verification
 * @param {string} campaignId - Campaign ID
 * @param {string} organizerId - Organizer ID (for permission check)
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Messages for the campaign
 */
export const getMessagesByCampaignForOrganizer = async (
  campaignId,
  organizerId,
  options = {}
) => {
  // Verify organizer owns the campaign
  const isOwner = await isCampaignOwner(campaignId, organizerId);
  if (!isOwner) {
    throw new AppError(
      "Access denied. You can only view messages for your own campaigns.",
      403
    );
  }

  const { status, limit = 50, offset = 0 } = options;
  const messages = await messageRepository.getMessagesByCampaign(
    campaignId,
    status,
    limit,
    offset
  );

  return messages;
};

/**
 * Get pending messages count for organizers with permission verification
 * @param {string} campaignId - Campaign ID
 * @param {string} organizerId - Organizer ID (for permission check)
 * @returns {Promise<number>} Count of pending messages
 */
export const getPendingMessagesCountForOrganizer = async (
  campaignId,
  organizerId
) => {
  // Verify organizer owns the campaign
  const isOwner = await isCampaignOwner(campaignId, organizerId);
  if (!isOwner) {
    throw new AppError(
      "Access denied. You can only view messages for your own campaigns.",
      403
    );
  }

  const count = await messageRepository.getPendingMessagesCount(campaignId);
  return count;
};

/**
 * Moderate message for organizers with permission verification
 * @param {string} messageId - Message ID
 * @param {string} status - New status (approved/rejected)
 * @param {string} organizerId - Organizer ID (for permission check)
 * @param {boolean} isFeatured - Whether to feature the message
 * @returns {Promise<Object>} Updated message
 */
export const moderateMessageForOrganizer = async (
  messageId,
  status,
  organizerId,
  isFeatured = false
) => {
  // Get the message to verify campaign ownership
  const existingMessage = await messageRepository.getMessageById(messageId);
  if (!existingMessage) {
    throw new AppError("Message not found", 404);
  }

  // Verify organizer owns the campaign
  const isOwner = await isCampaignOwner(
    existingMessage.campaignId,
    organizerId
  );
  if (!isOwner) {
    throw new AppError(
      "Access denied. You can only moderate messages for your own campaigns.",
      403
    );
  }

  // Validate status transition
  if (
    existingMessage.status === "approved" ||
    existingMessage.status === "rejected"
  ) {
    throw new AppError("Message has already been moderated", 400);
  }

  // Only approved messages can be featured
  if (isFeatured && status !== "approved") {
    throw new AppError("Only approved messages can be featured", 400);
  }

  const updatedMessage = await messageRepository.updateMessageStatus(
    messageId,
    status,
    organizerId,
    isFeatured
  );

  logger.info(`Message moderated by organizer`, {
    messageId,
    campaignId: existingMessage.campaignId,
    status,
    moderatedBy: organizerId,
    isFeatured,
  });

  return updatedMessage;
};

/**
 * Bulk approve all pending messages for a campaign
 * @param {string} campaignId - Campaign ID
 * @param {string} organizerId - Organizer ID (for permission check)
 * @returns {Promise<Object>} Result of bulk operation
 */
export const bulkApproveAllMessages = async (campaignId, organizerId) => {
  // Verify organizer owns the campaign
  const isOwner = await isCampaignOwner(campaignId, organizerId);
  if (!isOwner) {
    throw new AppError(
      "Access denied. You can only moderate messages for your own campaigns.",
      403
    );
  }

  const result = await messageRepository.bulkUpdateMessageStatus(
    campaignId,
    "approved",
    organizerId,
    false // isFeatured remains false for bulk approve
  );

  logger.info(`Bulk approved all pending messages`, {
    campaignId,
    moderatedBy: organizerId,
    updatedCount: result.updatedCount,
  });

  return result;
};

/**
 * Bulk reject all pending messages for a campaign
 * @param {string} campaignId - Campaign ID
 * @param {string} organizerId - Organizer ID (for permission check)
 * @returns {Promise<Object>} Result of bulk operation
 */
export const bulkRejectAllMessages = async (campaignId, organizerId) => {
  // Verify organizer owns the campaign
  const isOwner = await isCampaignOwner(campaignId, organizerId);
  if (!isOwner) {
    throw new AppError(
      "Access denied. You can only moderate messages for your own campaigns.",
      403
    );
  }

  const result = await messageRepository.bulkUpdateMessageStatus(
    campaignId,
    "rejected",
    organizerId,
    false // isFeatured remains false for bulk reject
  );

  logger.info(`Bulk rejected all pending messages`, {
    campaignId,
    moderatedBy: organizerId,
    updatedCount: result.updatedCount,
  });

  return result;
};

/**
 * Toggle featured status for organizers with permission verification
 * @param {string} messageId - Message ID
 * @param {string} organizerId - Organizer ID (for permission check)
 * @returns {Promise<Object>} Updated message
 */
export const toggleFeaturedStatusForOrganizer = async (
  messageId,
  organizerId
) => {
  const message = await messageRepository.getMessageById(messageId);

  if (!message) {
    throw new AppError("Message not found", 404);
  }

  // Verify organizer owns the campaign
  const isOwner = await isCampaignOwner(message.campaignId, organizerId);
  if (!isOwner) {
    throw new AppError(
      "Access denied. You can only manage messages for your own campaigns.",
      403
    );
  }

  if (message.status !== "approved") {
    throw new AppError("Only approved messages can be featured", 400);
  }

  const newFeaturedStatus = !message.isFeatured;

  const updatedMessage = await messageRepository.updateMessageStatus(
    messageId,
    message.status,
    organizerId,
    newFeaturedStatus
  );

  logger.info(`Message featured status toggled by organizer`, {
    messageId,
    campaignId: message.campaignId,
    isFeatured: newFeaturedStatus,
    moderatedBy: organizerId,
  });

  return updatedMessage;
};

/**
 * Get campaign message statistics for organizers
 * @param {string} campaignId - Campaign ID
 * @param {string} organizerId - Organizer ID (for permission check)
 * @returns {Promise<Object>} Message statistics
 */
export const getCampaignMessageStats = async (campaignId, organizerId) => {
  // Verify organizer owns the campaign
  const isOwner = await isCampaignOwner(campaignId, organizerId);
  if (!isOwner) {
    throw new AppError(
      "Access denied. You can only view statistics for your own campaigns.",
      403
    );
  }

  const stats = await messageRepository.getCampaignMessageStats(campaignId);
  return stats;
};
