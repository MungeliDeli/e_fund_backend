/**
 * Notification Service (v1 simple)
 */

import notificationRepository from "./notification.repository.js";
import { sendGenericEmail } from "../../utils/email.utils.js";
import logger from "../../utils/logger.js";

class NotificationService {
  async createAndDispatch({
    userId,
    type, // 'email' | 'in_app'
    category,
    priority = "medium",
    title,
    message,
    data = null,
    templateId = null,
    relatedEntityType = null,
    relatedEntityId = null,
  }) {
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

    if (type === "in_app") {
      await notificationRepository.setDelivered(row.notification_id);
      return { ...row, delivery_status: "delivered" };
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
          notificationId: row.notification_id,
          to,
          subject,
          html,
        });
        await notificationRepository.setSent(row.notification_id);
        return { ...row, delivery_status: "sent" };
      } catch (err) {
        logger.error("Failed to send notification email", {
          notificationId: row.notification_id,
          error: err.message,
        });
        await notificationRepository.setFailedWithError(
          row.notification_id,
          err.message
        );
        return { ...row, delivery_status: "failed" };
      }
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
        const to = await notificationRepository.selectEmailByUserId(
          row.user_id
        );
        if (!to) throw new Error("Recipient email not found");

        await sendGenericEmail(to, row.title, `<p>${row.message}</p>`);
        await notificationRepository.setSent(row.notification_id);
      } catch (err) {
        logger.warn("Email retry failed", {
          notificationId: row.notification_id,
          error: err.message,
        });
        await notificationRepository.setFailedWithError(
          row.notification_id,
          err.message
        );
      }
    }
  }
}

export default new NotificationService();
