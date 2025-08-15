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
    INSERT INTO "notifications" (
      "userId", type, category, priority, title, message, data,
      "templateId", "relatedEntityType", "relatedEntityId"
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
    UPDATE "notifications"
    SET "readAt" = NOW()
    WHERE "notificationId" = $1 AND "userId" = $2 AND "readAt" IS NULL
    RETURNING *
  `;
  const res = await query(text, [notificationId, userId]);
  return res.rows[0] || null;
};

export const listForUser = async (
  userId,
  { unreadOnly = false, limit = 50, offset = 0 } = {}
) => {
  const where = ['"userId" = $1', "type = 'inApp'"];
  const values = [userId];
  let idx = 2;
  if (unreadOnly) {
    where.push('"readAt" IS NULL');
  }
  const text = `
    SELECT *
    FROM "notifications"
    WHERE ${where.join(" AND ")}
    ORDER BY "createdAt" DESC
    LIMIT $${idx++} OFFSET $${idx}
  `;
  values.push(limit, offset);
  const res = await query(text, values);
  return res.rows;
};

// Update delivery status helpers
export const setDelivered = async (notificationId) => {
  const text = `UPDATE "notifications" SET "deliveryStatus" = 'delivered' WHERE "notificationId" = $1 RETURNING *`;
  await query(text, [notificationId]);
};

export const setSent = async (notificationId) => {
  const text = `UPDATE "notifications" SET "deliveryStatus" = 'sent', "sentAt" = NOW() WHERE "notificationId" = $1`;
  await query(text, [notificationId]);
};

export const setFailedWithError = async (notificationId, errorMessage) => {
  const text = `UPDATE "notifications" SET "deliveryStatus" = 'failed', "attempts" = "attempts" + 1, "lastError" = $2 WHERE "notificationId" = $1`;
  await query(text, [notificationId, errorMessage]);
};

export const selectEmailByUserId = async (userId) => {
  const { rows } = await query(
    `SELECT email FROM "users" WHERE "userId" = $1`,
    [userId]
  );
  return rows[0]?.email || null;
};

export const selectEmailRetryBatch = async ({ batchSize = 20 } = {}) => {
  const { rows } = await query(
    `SELECT "notificationId", "userId", title, message
       FROM "notifications" 
       WHERE "type" = 'email'
         AND "deliveryStatus" IN ('failed','pending')
         AND attempts < 3
       ORDER BY "updatedAt" ASC
       LIMIT $1`,
    [batchSize]
  );
  return rows;
};

export default {
  createNotification,
  markAsRead,
  listForUser,
  setDelivered,
  setSent,
  setFailedWithError,
  selectEmailByUserId,
  selectEmailRetryBatch,
};
