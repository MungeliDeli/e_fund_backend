/**
 * Notification Service (v1 simple)
 */

import notificationRepository from "./notification.repository.js";
import { sendGenericEmail } from "../../utils/email.utils.js";
import logger from "../../utils/logger.js";

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
      await notificationRepository.setDelivered(row.notificationId);
      return { ...row, deliveryStatus: "delivered" };
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
}

export default new NotificationService();
