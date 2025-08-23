import messageService from "./message.service.js";
import { ResponseFactory } from "../../../utils/response.utils.js";

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

    return ResponseFactory.ok(res, "Messages retrieved successfully", messages);
  }

  async getMessageById(req, res) {
    const { messageId } = req.params;

    const message = await messageService.getMessageById(messageId);

    return ResponseFactory.ok(res, "Message retrieved successfully", message);
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

    return ResponseFactory.ok(
      res,
      "Message moderated successfully",
      updatedMessage
    );
  }

  async getPendingMessagesCount(req, res) {
    const { campaignId } = req.params;

    const count = await messageService.getPendingMessagesCount(campaignId);

    return ResponseFactory.ok(
      res,
      "Pending messages count retrieved successfully",
      { pendingCount: count }
    );
  }

  async getFeaturedMessages(req, res) {
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
  }

  async getMessagesByUser(req, res) {
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
  }

  async toggleFeaturedStatus(req, res) {
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
  }
}

export default new MessageController();
