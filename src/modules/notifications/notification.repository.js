/**
 * Notification Repository
 * Minimal data access for notifications v1
 */

import { query } from "../../db/index.js";

export const createNotification = async (notification) => {
  const {
    userId,
    type,
    category,
    priority = "medium",
    title,
    message,
    data = null,
    templateId = null,
    relatedEntityType = null,
    relatedEntityId = null,
  } = notification;

  const text = `
    INSERT INTO notifications (
      user_id, type, category, priority, title, message, data,
      template_id, related_entity_type, related_entity_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *
  `;

  const values = [
    userId,
    type,
    category,
    priority,
    title,
    message,
    data ? JSON.stringify(data) : null,
    templateId,
    relatedEntityType,
    relatedEntityId,
  ];

  const res = await query(text, values);
  return res.rows[0];
};

export const markAsRead = async (notificationId, userId) => {
  const text = `
    UPDATE notifications
    SET read_at = NOW()
    WHERE notification_id = $1 AND user_id = $2 AND read_at IS NULL
    RETURNING *
  `;
  const res = await query(text, [notificationId, userId]);
  return res.rows[0] || null;
};

export const listForUser = async (
  userId,
  { unreadOnly = false, limit = 50, offset = 0 } = {}
) => {
  const where = ["user_id = $1"];
  const values = [userId];
  let idx = 2;
  if (unreadOnly) {
    where.push("read_at IS NULL");
  }
  const text = `
    SELECT *
    FROM notifications
    WHERE ${where.join(" AND ")}
    ORDER BY created_at DESC
    LIMIT $${idx++} OFFSET $${idx}
  `;
  values.push(limit, offset);
  const res = await query(text, values);
  return res.rows;
};

export default {
  createNotification,
  markAsRead,
  listForUser,
};
