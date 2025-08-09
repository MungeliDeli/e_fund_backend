/**
 * Notification Service (v1 simple)
 */

import notificationRepository from "./notification.repository.js";
import { sendGenericEmail } from "../../utils/email.utils.js";
import logger from "../../utils/logger.js";
import { query } from "../../db/index.js";

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
      await query(
        `UPDATE notifications SET delivery_status = 'delivered' WHERE notification_id = $1`,
        [row.notification_id]
      );
      return { ...row, delivery_status: "delivered" };
    }

    if (type === "email") {
      try {
        // minimal: fetch recipient email from users table
        const { rows } = await query(
          `SELECT email FROM users WHERE user_id = $1`,
          [userId]
        );
        const to = rows[0]?.email;
        if (!to) throw new Error("Recipient email not found");

        const subject = title;
        const html = `<p>${message}</p>`;
        await sendGenericEmail(to, subject, html);
        await query(
          `UPDATE notifications SET delivery_status = 'sent', sent_at = NOW() WHERE notification_id = $1`,
          [row.notification_id]
        );
        return { ...row, delivery_status: "sent" };
      } catch (err) {
        logger.error("Failed to send notification email", {
          notificationId: row.notification_id,
          error: err.message,
        });
        await query(
          `UPDATE notifications SET delivery_status = 'failed', attempts = attempts + 1, last_error = $2 WHERE notification_id = $1`,
          [row.notification_id, err.message]
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
}

export default new NotificationService();
