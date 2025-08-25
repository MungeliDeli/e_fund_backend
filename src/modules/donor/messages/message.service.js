import * as messageRepository from "./message.repository.js";
import { AppError } from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";

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
