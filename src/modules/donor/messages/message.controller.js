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
