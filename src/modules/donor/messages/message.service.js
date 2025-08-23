import messageRepository from "./message.repository.js";
import { AppError } from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";

class MessageService {
  async getMessagesByCampaign(
    campaignId,
    status = null,
    limit = 50,
    offset = 0
  ) {
    const messages = await messageRepository.getMessagesByCampaign(
      campaignId,
      status,
      limit,
      offset
    );

    return messages;
  }

  async getMessageById(messageId) {
    const message = await messageRepository.getMessageById(messageId);

    if (!message) {
      throw new AppError("Message not found", 404);
    }

    return message;
  }

  async moderateMessage(
    messageId,
    status,
    moderatedByUserId,
    isFeatured = false
  ) {
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
  }

  async getPendingMessagesCount(campaignId) {
    const count = await messageRepository.getPendingMessagesCount(campaignId);
    return count;
  }

  async getFeaturedMessages(campaignId, limit = 10) {
    const messages = await messageRepository.getFeaturedMessages(
      campaignId,
      limit
    );
    return messages;
  }

  async getMessagesByUser(userId, limit = 50, offset = 0) {
    const messages = await messageRepository.getMessagesByUser(
      userId,
      limit,
      offset
    );

    return messages;
  }

  async toggleFeaturedStatus(messageId, moderatedByUserId) {
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
  }
}

export default new MessageService();
