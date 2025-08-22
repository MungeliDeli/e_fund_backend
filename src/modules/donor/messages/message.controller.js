import messageService from "./message.service.js";
import { successResponse } from "../../../utils/response.utils.js";

class MessageController {
  async getMessagesByCampaign(req, res) {
    const { campaignId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    const messages = await messageService.getMessagesByCampaign(
      campaignId,
      status,
      parseInt(limit),
      parseInt(offset)
    );

    return successResponse(res, {
      message: "Messages retrieved successfully",
      data: messages,
    });
  }

  async getMessageById(req, res) {
    const { messageId } = req.params;

    const message = await messageService.getMessageById(messageId);

    return successResponse(res, {
      message: "Message retrieved successfully",
      data: message,
    });
  }

  async moderateMessage(req, res) {
    const { messageId } = req.params;
    const { status, isFeatured = false } = req.body;
    const moderatedByUserId = req.user.userId;

    const updatedMessage = await messageService.moderateMessage(
      messageId,
      status,
      moderatedByUserId,
      isFeatured
    );

    return successResponse(res, {
      message: "Message moderated successfully",
      data: updatedMessage,
    });
  }

  async getPendingMessagesCount(req, res) {
    const { campaignId } = req.params;

    const count = await messageService.getPendingMessagesCount(campaignId);

    return successResponse(res, {
      message: "Pending messages count retrieved successfully",
      data: { pendingCount: count },
    });
  }

  async getFeaturedMessages(req, res) {
    const { campaignId } = req.params;
    const { limit = 10 } = req.query;

    const messages = await messageService.getFeaturedMessages(
      campaignId,
      parseInt(limit)
    );

    return successResponse(res, {
      message: "Featured messages retrieved successfully",
      data: messages,
    });
  }

  async getMessagesByUser(req, res) {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await messageService.getMessagesByUser(
      userId,
      parseInt(limit),
      parseInt(offset)
    );

    return successResponse(res, {
      message: "User messages retrieved successfully",
      data: messages,
    });
  }

  async toggleFeaturedStatus(req, res) {
    const { messageId } = req.params;
    const moderatedByUserId = req.user.userId;

    const updatedMessage = await messageService.toggleFeaturedStatus(
      messageId,
      moderatedByUserId
    );

    return successResponse(res, {
      message: "Message featured status toggled successfully",
      data: updatedMessage,
    });
  }
}

export default new MessageController();
