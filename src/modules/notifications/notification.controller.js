import notificationService from "./notification.service.js";
import { ResponseFactory } from "../../utils/response.utils.js";

export const listMyNotifications = async (req, res) => {
  const { unread } = req.query;
  const unreadOnly = String(unread || "false").toLowerCase() === "true";
  const notifications = await notificationService.listForUser(req.user.userId, {
    unreadOnly,
  });
  ResponseFactory.ok(res, "Notifications fetched", notifications);
};

export const markNotificationRead = async (req, res) => {
  const { id } = req.params;
  const updated = await notificationService.markAsRead(id, req.user.userId);
  if (!updated) {
    return ResponseFactory.ok(res, "Already read or not found", null);
  }

  // Update unread count after marking as read
  await notificationService.updateUnreadCount(req.user.userId);

  ResponseFactory.ok(res, "Notification marked as read", updated);
};

export const getUnreadCount = async (req, res) => {
  const count = await notificationService.updateUnreadCount(req.user.userId);
  ResponseFactory.ok(res, "Unread count retrieved", { count });
};

export const broadcastNotification = async (req, res) => {
  const {
    title,
    message,
    category,
    priority,
    data,
    relatedEntityType,
    relatedEntityId,
  } = req.body;

  // Only allow organization users to broadcast
  if (req.user.userType !== "organizationUser") {
    return ResponseFactory.forbidden(
      res,
      "Only organization users can broadcast notifications"
    );
  }

  const result = await notificationService.broadcastToSubscribers({
    organizerId: req.user.userId,
    category,
    priority,
    title,
    message,
    data,
    relatedEntityType,
    relatedEntityId,
  });

  ResponseFactory.ok(res, "Notification broadcast completed", result);
};

export const testNotification = async (req, res) => {
  // Create a test notification for the current user
  const notification = await notificationService.createAndDispatch({
    userId: req.user.userId,
    type: "inApp",
    category: "system",
    priority: "medium",
    title: "Test Notification",
    message:
      "This is a test notification to verify the real-time system is working.",
    data: { test: true },
  });

  ResponseFactory.ok(res, "Test notification sent", notification);
};
