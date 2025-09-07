import { query, transaction } from "../../../db/index.js";
import {
  NotFoundError,
  ConflictError,
  DatabaseError,
} from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";

export const createOutreachCampaign = async (
  campaignId,
  organizerId,
  { name, description }
) => {
  try {
    const sql = `
      INSERT INTO "outreachCampaigns" ("campaignId", "name", "description")
      SELECT $1, $2, $3
      WHERE EXISTS (
        SELECT 1 FROM "campaigns" WHERE "campaignId" = $1 AND "organizerId" = $4
      )
      RETURNING *
    `;
    const res = await query(sql, [
      campaignId,
      name,
      description || null,
      organizerId,
    ]);
    if (res.rows.length === 0) {
      throw new NotFoundError("Campaign not found");
    }
    logger.info("Outreach campaign created", {
      outreachCampaignId: res.rows[0].outreachCampaignId,
      campaignId,
    });
    return res.rows[0];
  } catch (error) {
    if (error.code === "23505") {
      throw new ConflictError(
        "An outreach campaign with this name already exists for this campaign"
      );
    }
    throw new DatabaseError("Failed to create outreach campaign", error);
  }
};

export const listOutreachCampaigns = async (campaignId, organizerId) => {
  try {
    const sql = `
      SELECT 
        oc.*,
        COALESCE(
          json_build_object(
            'recipients', COALESCE(r."totalRecipients", 0),
            'sends', COALESCE(r."sends", 0),
            'failed', COALESCE(r."failed", 0),
            'uniqueOpens', COALESCE(r."uniqueOpens", 0),
            'uniqueClicks', COALESCE(r."uniqueClicks", 0),
            'donations', COALESCE(r."donations", 0),
            'totalAmount', COALESCE(r."totalAmount", 0)
          ), '{}'
        ) AS totals
      FROM "outreachCampaigns" oc
      LEFT JOIN (
        SELECT 
          "outreachCampaignId",
          COUNT(*) AS "totalRecipients",
          COUNT(*) FILTER (WHERE "status" = 'sent') AS "sends",
          COUNT(*) FILTER (WHERE "status" = 'failed') AS "failed",
          COUNT(*) FILTER (WHERE "opened" = TRUE) AS "uniqueOpens",
          COUNT(*) FILTER (WHERE "clicked" = TRUE) AS "uniqueClicks",
          COUNT(*) FILTER (WHERE "donated" = TRUE) AS "donations",
          COALESCE(SUM("donatedAmount"), 0) AS "totalAmount"
        FROM "outreachCampaignRecipients"
        GROUP BY "outreachCampaignId"
      ) r ON r."outreachCampaignId" = oc."outreachCampaignId"
      WHERE oc."campaignId" = $1 AND EXISTS (
        SELECT 1 FROM "campaigns" WHERE "campaignId" = $1 AND "organizerId" = $2
      )
      ORDER BY oc."createdAt" DESC
    `;
    const res = await query(sql, [campaignId, organizerId]);
    return res.rows;
  } catch (error) {
    throw new DatabaseError("Failed to list outreach campaigns", error);
  }
};

export const getOutreachCampaignById = async (
  outreachCampaignId,
  organizerId
) => {
  try {
    const sql = `
      SELECT oc.* FROM "outreachCampaigns" oc
      JOIN "campaigns" c ON oc."campaignId" = c."campaignId"
      WHERE oc."outreachCampaignId" = $1 AND c."organizerId" = $2
    `;
    const res = await query(sql, [outreachCampaignId, organizerId]);
    if (res.rows.length === 0) {
      throw new NotFoundError("Outreach campaign not found");
    }
    return res.rows[0];
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to get outreach campaign", error);
  }
};

export const updateOutreachCampaign = async (
  outreachCampaignId,
  organizerId,
  { name, description, status }
) => {
  try {
    const sql = `
      UPDATE "outreachCampaigns" oc
      SET 
        "name" = COALESCE($3, oc."name"),
        "description" = COALESCE($4, oc."description"),
        "status" = COALESCE($5, oc."status"),
        "updatedAt" = CURRENT_TIMESTAMP
      FROM "campaigns" c
      WHERE oc."outreachCampaignId" = $1 AND oc."campaignId" = c."campaignId" AND c."organizerId" = $2
      RETURNING oc.*
    `;
    const res = await query(sql, [
      outreachCampaignId,
      organizerId,
      name || null,
      description || null,
      status || null,
    ]);
    if (res.rows.length === 0) {
      throw new NotFoundError("Outreach campaign not found");
    }
    return res.rows[0];
  } catch (error) {
    if (error.code === "23505") {
      throw new ConflictError(
        "An outreach campaign with this name already exists for this campaign"
      );
    }
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to update outreach campaign", error);
  }
};

export const archiveOutreachCampaign = async (
  outreachCampaignId,
  organizerId
) => {
  try {
    const sql = `
      UPDATE "outreachCampaigns" oc
      SET "status" = 'archived', "updatedAt" = CURRENT_TIMESTAMP
      FROM "campaigns" c
      WHERE oc."outreachCampaignId" = $1 AND oc."campaignId" = c."campaignId" AND c."organizerId" = $2
      RETURNING oc.*
    `;
    const res = await query(sql, [outreachCampaignId, organizerId]);
    if (res.rows.length === 0) {
      throw new NotFoundError("Outreach campaign not found");
    }
    return res.rows[0];
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to archive outreach campaign", error);
  }
};
