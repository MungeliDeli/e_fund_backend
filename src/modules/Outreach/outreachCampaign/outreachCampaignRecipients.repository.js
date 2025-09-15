import { query } from "../../../db/index.js";
import { DatabaseError } from "../../../utils/appError.js";

export const addRecipientsForSegments = async (
  outreachCampaignId,
  organizerId,
  segmentIds
) => {
  try {
    const sql = `
      INSERT INTO "outreachCampaignRecipients" ("outreachCampaignId", "contactId", "email")
      SELECT $1, c."contactId", c."email"
      FROM "contacts" c
      JOIN "segments" s ON c."segmentId" = s."segmentId"
      WHERE s."organizerId" = $2
        AND c."segmentId" = ANY($3::uuid[])
        AND c."email" IS NOT NULL AND c."email" <> ''
      ON CONFLICT ("outreachCampaignId", "contactId") DO NOTHING
      RETURNING *;
    `;
    const res = await query(sql, [outreachCampaignId, organizerId, segmentIds]);
    return { added: res.rowCount };
  } catch (error) {
    throw new DatabaseError("Failed to add recipients by segments", error);
  }
};

export const addRecipientsForAllContacts = async (
  outreachCampaignId,
  organizerId
) => {
  try {
    const sql = `
      INSERT INTO "outreachCampaignRecipients" ("outreachCampaignId", "contactId", "email")
      SELECT $1, c."contactId", c."email"
      FROM "contacts" c
      WHERE c."organizerId" = $2 AND c."email" IS NOT NULL AND c."email" <> ''
      ON CONFLICT ("outreachCampaignId", "contactId") DO NOTHING
      RETURNING *;
    `;
    const res = await query(sql, [outreachCampaignId, organizerId]);
    return { added: res.rowCount };
  } catch (error) {
    throw new DatabaseError("Failed to add recipients for all contacts", error);
  }
};

export const getFailedRecipientsByCampaign = async (outreachCampaignId) => {
  const sql = `
    SELECT * FROM "outreachCampaignRecipients"
    WHERE "outreachCampaignId" = $1 AND "status" = 'failed'
  `;
  const res = await query(sql, [outreachCampaignId]);
  return res.rows;
};

export const markRecipientSendResult = async (
  recipientId,
  { status, failureReason }
) => {
  const sql = `
    UPDATE "outreachCampaignRecipients"
    SET "status" = $2, "failureReason" = $3, "lastSendAt" = NOW(), "updatedAt" = NOW()
    WHERE "recipientId" = $1
  `;
  await query(sql, [recipientId, status, failureReason || null]);
};

export const getRecipientsByCampaign = async (outreachCampaignId) => {
  const sql = `
    SELECT "recipientId", "contactId", "email", "status", "opened", "clicked", "donated", "donatedAmount", "lastSendAt", "failureReason"
    FROM "outreachCampaignRecipients"
    WHERE "outreachCampaignId" = $1
    ORDER BY "createdAt" DESC
  `;
  const res = await query(sql, [outreachCampaignId]);
  return res.rows;
};

export const markRecipientOpenedByLinkToken = async (
  linkTokenId,
  contactId
) => {
  const sql = `
    UPDATE "outreachCampaignRecipients" r
    SET "opened" = TRUE, "updatedAt" = NOW()
    FROM "linkTokens" lt
    WHERE lt."linkTokenId" = $1
      AND r."contactId" = $2
      AND r."outreachCampaignId" = lt."outreachCampaignId"
  `;
  await query(sql, [linkTokenId, contactId]);
};

export const markRecipientClickedByLinkToken = async (
  linkTokenId,
  contactId
) => {
  const sql = `
    UPDATE "outreachCampaignRecipients" r
    SET "clicked" = TRUE, "updatedAt" = NOW()
    FROM "linkTokens" lt
    WHERE lt."linkTokenId" = $1
      AND r."contactId" = $2
      AND r."outreachCampaignId" = lt."outreachCampaignId"
  `;
  await query(sql, [linkTokenId, contactId]);
};

export const getDonationAggregatesByOutreachCampaign = async (
  outreachCampaignId
) => {
  const sql = `
    SELECT 
      COUNT(*) FILTER (WHERE "donated" = TRUE) AS "donations",
      COALESCE(SUM("donatedAmount"), 0) AS "totalAmount"
    FROM "outreachCampaignRecipients"
    WHERE "outreachCampaignId" = $1
  `;
  const res = await query(sql, [outreachCampaignId]);
  const row = res.rows[0] || {};
  return {
    donations: Number(row.donations || 0),
    totalAmount: Number(row.totalAmount || 0),
  };
};

export const markRecipientSendResultByCampaignContact = async (
  outreachCampaignId,
  contactId,
  { status, failureReason }
) => {
  const sql = `
    UPDATE "outreachCampaignRecipients"
    SET "status" = $3, "failureReason" = $4, "lastSendAt" = NOW(), "updatedAt" = NOW()
    WHERE "outreachCampaignId" = $1 AND "contactId" = $2
    RETURNING "recipientId"
  `;
  const res = await query(sql, [
    outreachCampaignId,
    contactId,
    status,
    failureReason || null,
  ]);
  return res.rows[0]?.recipientId || null;
};
