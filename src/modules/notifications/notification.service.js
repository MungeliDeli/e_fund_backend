/**
 * Notification Service (v1 simple)
 */

import notificationRepository from "./notification.repository.js";
import { sendGenericEmail } from "../../utils/email.utils.js";
import logger from "../../utils/logger.js";
import { getSocketIO } from "../../config/socket.config.js";

class NotificationService {
  async createAndDispatch({
    userId,
    type, // 'email' | 'inApp'
    category,
    priority = "medium",
    title,
    message,
    data = null,
    templateId = null,
    relatedEntityType = null,
    relatedEntityId = null,
  }) {
    try {
      const row = await notificationRepository.createNotification({
        userId,
        type,
        category,
        priority,
        title,
        message,
        data,
        templateId,
        relatedEntityType,
        relatedEntityId,
      });

      if (type === "inApp") {
        try {
          logger.info("Setting in-app notification as delivered", {
            notificationId: row.notificationId,
            userId: row.userId,
            type: row.type,
          });
          await notificationRepository.setDelivered(row.notificationId);

          // Send real-time notification via Socket.IO
          this.sendRealtimeNotification(row);

          logger.info("Successfully set in-app notification as delivered", {
            notificationId: row.notificationId,
          });
          return { ...row, deliveryStatus: "delivered" };
        } catch (err) {
          logger.error("Failed to set in-app notification as delivered", {
            notificationId: row.notificationId,
            error: err.message,
            stack: err.stack,
          });
          // Don't throw error for in-app notifications, just return with failed status
          return { ...row, deliveryStatus: "failed", error: err.message };
        }
      }

      if (type === "email") {
        try {
          // minimal: fetch recipient email from users table
          const to = await notificationRepository.selectEmailByUserId(userId);
          if (!to) throw new Error("Recipient email not found");

          const subject = title;
          const html = `<p>${message}</p>`;
          await sendGenericEmail(to, subject, html);
          console.log("Email sent", {
            notificationId: row.notificationId,
            to,
            subject,
            html,
          });
          await notificationRepository.setSent(row.notificationId);
          return { ...row, deliveryStatus: "sent" };
        } catch (err) {
          logger.error("Failed to send notification email", {
            notificationId: row.notificationId,
            error: err.message,
          });
          await notificationRepository.setFailedWithError(
            row.notificationId,
            err.message
          );
          return { ...row, deliveryStatus: "failed" };
        }
      }
    } catch (err) {
      logger.error("Failed to create notification", {
        userId,
        type,
        error: err.message,
      });
      throw err;
    }
  }

  async listForUser(
    userId,
    { unreadOnly = false, limit = 50, offset = 0 } = {}
  ) {
    return notificationRepository.listForUser(userId, {
      unreadOnly,
      limit,
      offset,
    });
  }

  async markAsRead(notificationId, userId) {
    return notificationRepository.markAsRead(notificationId, userId);
  }

  // Retry pending/failed email notifications up to 3 times
  async retryFailedEmails({ batchSize = 20 } = {}) {
    const rows = await notificationRepository.selectEmailRetryBatch({
      batchSize,
    });

    for (const row of rows) {
      try {
        const to = await notificationRepository.selectEmailByUserId(row.userId);
        if (!to) throw new Error("Recipient email not found");

        await sendGenericEmail(to, row.title, `<p>${row.message}</p>`);
        await notificationRepository.setSent(row.notificationId);
      } catch (err) {
        logger.warn("Email retry failed", {
          notificationId: row.notificationId,
          error: err.message,
        });
        await notificationRepository.setFailedWithError(
          row.notificationId,
          err.message
        );
      }
    }
  }

  // Send real-time notification via Socket.IO
  sendRealtimeNotification(notification) {
    try {
      const io = getSocketIO();
      if (!io) {
        logger.warn("Socket.IO not available, skipping real-time notification");
        return;
      }

      const notificationData = {
        id: notification.notificationId,
        title: notification.title,
        message: notification.message,
        category: notification.category,
        priority: notification.priority,
        data: notification.data,
        createdAt: notification.createdAt,
        readAt: notification.readAt,
      };

      // Send to specific user
      io.to(`user:${notification.userId}`).emit(
        "notification:new",
        notificationData
      );

      logger.info("Real-time notification sent", {
        notificationId: notification.notificationId,
        userId: notification.userId,
      });
    } catch (error) {
      logger.error("Failed to send real-time notification", {
        notificationId: notification.notificationId,
        error: error.message,
      });
    }
  }

  // Broadcast notification to multiple users (for organizers)
  async broadcastToSubscribers({
    organizerId,
    category,
    priority = "medium",
    title,
    message,
    data = null,
    relatedEntityType = null,
    relatedEntityId = null,
  }) {
    try {
      // Get all subscribers for the organizer
      const subscribers = await notificationRepository.getSubscribers(
        organizerId
      );

      if (subscribers.length === 0) {
        logger.info("No subscribers found for organizer", { organizerId });
        return { sent: 0, failed: 0 };
      }

      let sent = 0;
      let failed = 0;

      // Create notifications for each subscriber
      for (const subscriber of subscribers) {
        try {
          const notification = await this.createAndDispatch({
            userId: subscriber.userId,
            type: "inApp",
            category,
            priority,
            title,
            message,
            data,
            relatedEntityType,
            relatedEntityId,
          });

          if (notification.deliveryStatus === "delivered") {
            sent++;
          } else {
            failed++;
          }
        } catch (error) {
          logger.error("Failed to create notification for subscriber", {
            subscriberId: subscriber.userId,
            organizerId,
            error: error.message,
          });
          failed++;
        }
      }

      logger.info("Broadcast notification completed", {
        organizerId,
        totalSubscribers: subscribers.length,
        sent,
        failed,
      });

      return { sent, failed };
    } catch (error) {
      logger.error("Failed to broadcast notification", {
        organizerId,
        error: error.message,
      });
      throw error;
    }
  }

  // Update unread count for user
  async updateUnreadCount(userId) {
    try {
      const count = await notificationRepository.getUnreadCount(userId);
      const io = getSocketIO();

      if (io) {
        // Send updated count to user
        io.to(`user:${userId}`).emit("notification:count", { count });
      }

      return count;
    } catch (error) {
      logger.error("Failed to update unread count", {
        userId,
        error: error.message,
      });
      throw error;
    }
  }
}

export default new NotificationService();
