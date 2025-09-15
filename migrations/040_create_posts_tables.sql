-- Create posts table
CREATE TABLE "posts" (
    "postId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "organizerId" UUID NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
    "campaignId" UUID REFERENCES "campaigns"("campaignId") ON DELETE SET NULL,
    "type" VARCHAR(20) NOT NULL CHECK ("type" IN ('update', 'success_story', 'thank_you')),
    "status" VARCHAR(20) NOT NULL DEFAULT 'published' CHECK ("status" IN ('published', 'archived')),
    "title" VARCHAR(200),
    "body" TEXT,
    "isPinnedToCampaign" BOOLEAN NOT NULL DEFAULT FALSE,
    "tags" JSONB,
    "shareMeta" JSONB,
    "isSoftDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX "idx_posts_organizerId" ON "posts"("organizerId");
CREATE INDEX "idx_posts_campaignId" ON "posts"("campaignId");
CREATE INDEX "idx_posts_type" ON "posts"("type");
CREATE INDEX "idx_posts_status" ON "posts"("status");
CREATE INDEX "idx_posts_createdAt" ON "posts"("createdAt");
CREATE INDEX "idx_posts_isSoftDeleted" ON "posts"("isSoftDeleted");
CREATE INDEX "idx_posts_isPinnedToCampaign" ON "posts"("isPinnedToCampaign");

-- Create indexes for media table (for posts)
CREATE INDEX "idx_media_post_entity" ON "media"("entityType", "entityId") WHERE "entityType" = 'post';

-- Create composite indexes for common queries
CREATE INDEX "idx_posts_campaign_status_created" ON "posts"("campaignId", "status", "createdAt" DESC) WHERE "isSoftDeleted" = FALSE;
CREATE INDEX "idx_posts_organizer_status_created" ON "posts"("organizerId", "status", "createdAt" DESC) WHERE "isSoftDeleted" = FALSE;
CREATE INDEX "idx_posts_status_created" ON "posts"("status", "createdAt" DESC) WHERE "isSoftDeleted" = FALSE;


