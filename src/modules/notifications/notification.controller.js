import notificationService from "./notification.service.js";
import { ResponseFactory } from "../../utils/response.utils.js";
import { catchAsync } from "../../middlewares/errorHandler.js";

export const listMyNotifications = catchAsync(async (req, res) => {
  const { unread } = req.query;
  const unreadOnly = String(unread || "false").toLowerCase() === "true";
  const notifications = await notificationService.listForUser(req.user.userId, {
    unreadOnly,
  });
  ResponseFactory.ok(res, "Notifications fetched", notifications);
});

export const markNotificationRead = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updated = await notificationService.markAsRead(id, req.user.userId);
  if (!updated) {
    return ResponseFactory.ok(res, "Already read or not found", null);
  }
  ResponseFactory.ok(res, "Notification marked as read", updated);
});
