import { db } from "../../db/index.js";

class PostRepository {
  async createPost(postData) {
    const {
      organizerId,
      type,
      title,
      body,
      campaignId,
      isPinnedToCampaign,
      media,
    } = postData;

    const query = `
      INSERT INTO "posts" (
        "organizerId",
        "type",
        "title",
        "body",
        "campaignId",
        "isPinnedToCampaign",
        "media",
        "status",
        "createdAt",
        "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'published', NOW(), NOW())
      RETURNING *
    `;

    const values = [
      organizerId,
      type,
      title || null,
      body || null,
      campaignId || null,
      isPinnedToCampaign || false,
      JSON.stringify(media || []),
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  async getPostById(postId) {
    const query = `
      SELECT 
        p.*,
        u."email",
        u."userType",
        COALESCE(ip."firstName", op."primaryContactPersonName") as "firstName",
        COALESCE(ip."lastName", '') as "lastName",
        op."organizationName",
        c."name" as "campaignTitle",
        c."shareLink" as "campaignShareLink",
        COALESCE(ip."profilePictureMediaId", op."profilePictureMediaId") as "profilePictureMediaId",
        COALESCE(pp."fileName", opp."fileName") as "profilePictureFileName"
      FROM "posts" p
      LEFT JOIN "users" u ON p."organizerId" = u."userId"
      LEFT JOIN "individualProfiles" ip ON u."userId" = ip."userId" AND u."userType" = 'individualUser'
      LEFT JOIN "organizationProfiles" op ON u."userId" = op."userId" AND u."userType" = 'organizationUser'
      LEFT JOIN "campaigns" c ON p."campaignId" = c."campaignId"
      LEFT JOIN "media" pp ON ip."profilePictureMediaId" = pp."mediaId"
      LEFT JOIN "media" opp ON op."profilePictureMediaId" = opp."mediaId"
      WHERE p."postId" = $1 AND p."isSoftDeleted" = false
    `;

    const result = await db.query(query, [postId]);
    return result.rows[0];
  }

  async updatePostMedia(postId, mediaJson) {
    const query = `
      UPDATE "posts" 
      SET "media" = $1, "updatedAt" = NOW()
      WHERE "postId" = $2
      RETURNING *
    `;

    const result = await db.query(query, [JSON.stringify(mediaJson), postId]);
    return result.rows[0];
  }

  async getPostsByCampaign(campaignId, options = {}) {
    const { type, status = "published", limit = 20, cursor } = options;

    let query = `
      SELECT 
        p.*,
        u."email",
        u."userType",
        COALESCE(ip."firstName", op."primaryContactPersonName") as "firstName",
        COALESCE(ip."lastName", '') as "lastName",
        op."organizationName",
        c."name" as "campaignTitle",
        c."shareLink" as "campaignShareLink",
        COALESCE(ip."profilePictureMediaId", op."profilePictureMediaId") as "profilePictureMediaId",
        COALESCE(pp."fileName", opp."fileName") as "profilePictureFileName"
      FROM "posts" p
      LEFT JOIN "users" u ON p."organizerId" = u."userId"
      LEFT JOIN "individualProfiles" ip ON u."userId" = ip."userId" AND u."userType" = 'individualUser'
      LEFT JOIN "organizationProfiles" op ON u."userId" = op."userId" AND u."userType" = 'organizationUser'
      LEFT JOIN "campaigns" c ON p."campaignId" = c."campaignId"
      LEFT JOIN "media" pp ON ip."profilePictureMediaId" = pp."mediaId"
      LEFT JOIN "media" opp ON op."profilePictureMediaId" = opp."mediaId"
      WHERE p."campaignId" = $1 
        AND p."isSoftDeleted" = false
        AND p."status" = $2
    `;

    const values = [campaignId, status];
    let paramIndex = 3;

    if (type) {
      query += ` AND p."type" = $${paramIndex}`;
      values.push(type);
      paramIndex++;
    }

    if (cursor) {
      query += ` AND p."createdAt" < $${paramIndex}`;
      values.push(cursor);
      paramIndex++;
    }

    query += ` ORDER BY p."isPinnedToCampaign" DESC, p."createdAt" DESC LIMIT $${paramIndex}`;
    values.push(limit);

    const result = await db.query(query, values);
    return result.rows;
  }

  async getPostsByOrganizer(organizerId, options = {}) {
    const { status = "published", limit = 20, cursor } = options;

    let query = `
      SELECT 
        p.*,
        u."email",
        u."userType",
        COALESCE(ip."firstName", op."primaryContactPersonName") as "firstName",
        COALESCE(ip."lastName", '') as "lastName",
        op."organizationName",
        c."name" as "campaignTitle",
        c."shareLink" as "campaignShareLink",
        COALESCE(ip."profilePictureMediaId", op."profilePictureMediaId") as "profilePictureMediaId",
        COALESCE(pp."fileName", opp."fileName") as "profilePictureFileName"
      FROM "posts" p
      LEFT JOIN "users" u ON p."organizerId" = u."userId"
      LEFT JOIN "individualProfiles" ip ON u."userId" = ip."userId" AND u."userType" = 'individualUser'
      LEFT JOIN "organizationProfiles" op ON u."userId" = op."userId" AND u."userType" = 'organizationUser'
      LEFT JOIN "campaigns" c ON p."campaignId" = c."campaignId"
      LEFT JOIN "media" pp ON ip."profilePictureMediaId" = pp."mediaId"
      LEFT JOIN "media" opp ON op."profilePictureMediaId" = opp."mediaId"
      WHERE p."organizerId" = $1 
        AND p."isSoftDeleted" = false
        AND p."status" = $2
    `;

    const values = [organizerId, status];
    let paramIndex = 3;

    if (cursor) {
      query += ` AND p."createdAt" < $${paramIndex}`;
      values.push(cursor);
      paramIndex++;
    }

    query += ` ORDER BY p."isPinnedToCampaign" DESC, p."createdAt" DESC LIMIT $${paramIndex}`;
    values.push(limit);

    const result = await db.query(query, values);
    return result.rows;
  }

  async getAllPosts(options = {}) {
    const { status = "published", limit = 20, cursor } = options;

    let query = `
      SELECT 
        p.*,
        u."email",
        u."userType",
        COALESCE(ip."firstName", op."primaryContactPersonName") as "firstName",
        COALESCE(ip."lastName", '') as "lastName",
        op."organizationName",
        c."name" as "campaignTitle",
        c."shareLink" as "campaignShareLink",
        COALESCE(ip."profilePictureMediaId", op."profilePictureMediaId") as "profilePictureMediaId",
        COALESCE(pp."fileName", opp."fileName") as "profilePictureFileName"
      FROM "posts" p
      LEFT JOIN "users" u ON p."organizerId" = u."userId"
      LEFT JOIN "individualProfiles" ip ON u."userId" = ip."userId" AND u."userType" = 'individualUser'
      LEFT JOIN "organizationProfiles" op ON u."userId" = op."userId" AND u."userType" = 'organizationUser'
      LEFT JOIN "campaigns" c ON p."campaignId" = c."campaignId"
      LEFT JOIN "media" pp ON ip."profilePictureMediaId" = pp."mediaId"
      LEFT JOIN "media" opp ON op."profilePictureMediaId" = opp."mediaId"
      WHERE p."isSoftDeleted" = false
        AND p."status" = $1
    `;

    const values = [status];
    let paramIndex = 2;

    if (cursor) {
      query += ` AND p."createdAt" < $${paramIndex}`;
      values.push(cursor);
      paramIndex++;
    }

    query += ` ORDER BY p."isPinnedToCampaign" DESC, p."createdAt" DESC LIMIT $${paramIndex}`;
    values.push(limit);

    const result = await db.query(query, values);
    return result.rows;
  }

  async checkCampaignOwnership(campaignId, organizerId) {
    const query = `
      SELECT "campaignId"
      FROM "campaigns"
      WHERE "campaignId" = $1 AND "organizerId" = $2
    `;

    const result = await db.query(query, [campaignId, organizerId]);
    return result.rows.length > 0;
  }

  async createCampaignPost(campaignData) {
    const {
      campaignId,
      organizerId,
      title,
      body,
      media,
      status = "published",
    } = campaignData;

    const query = `
      INSERT INTO "posts" (
        "organizerId",
        "type",
        "title",
        "body",
        "campaignId",
        "isPinnedToCampaign",
        "media",
        "status",
        "createdAt",
        "updatedAt"
      ) VALUES ($1, 'campaign', $2, $3, $4, true, $5, $6, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      organizerId,
      title || null,
      body || null,
      campaignId,
      JSON.stringify(media || []),
      status,
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  async getCampaignPostByCampaignId(campaignId) {
    const query = `
      SELECT 
        p.*,
        u."email",
        u."userType",
        COALESCE(ip."firstName", op."primaryContactPersonName") as "firstName",
        COALESCE(ip."lastName", '') as "lastName",
        op."organizationName",
        c."name" as "campaignTitle",
        c."shareLink" as "campaignShareLink",
        COALESCE(ip."profilePictureMediaId", op."profilePictureMediaId") as "profilePictureMediaId",
        COALESCE(pp."fileName", opp."fileName") as "profilePictureFileName"
      FROM "posts" p
      LEFT JOIN "users" u ON p."organizerId" = u."userId"
      LEFT JOIN "individualProfiles" ip ON u."userId" = ip."userId" AND u."userType" = 'individualUser'
      LEFT JOIN "organizationProfiles" op ON u."userId" = op."userId" AND u."userType" = 'organizationUser'
      LEFT JOIN "campaigns" c ON p."campaignId" = c."campaignId"
      LEFT JOIN "media" pp ON ip."profilePictureMediaId" = pp."mediaId"
      LEFT JOIN "media" opp ON op."profilePictureMediaId" = opp."mediaId"
      WHERE p."campaignId" = $1 
        AND p."type" = 'campaign'
        AND p."isSoftDeleted" = false
    `;

    const result = await db.query(query, [campaignId]);
    return result.rows[0];
  }

  async updateCampaignPostStatus(campaignId, status) {
    const query = `
      UPDATE "posts" 
      SET "status" = $1, "updatedAt" = NOW()
      WHERE "campaignId" = $2 AND "type" = 'campaign'
      RETURNING *
    `;

    const result = await db.query(query, [status, campaignId]);
    return result.rows[0];
  }
}

export default new PostRepository();
