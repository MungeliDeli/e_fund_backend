-- Up Migration: create media table
CREATE TABLE "media" (
    "mediaId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" UUID,
    "mediaType" VARCHAR(50) NOT NULL,
    "fileName" VARCHAR(255),
    "fileSize" INTEGER,
    "description" TEXT,
    "altText" TEXT,
    "uploadedByUserId" UUID REFERENCES "users"("userId") ON DELETE SET NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Down Migration
DROP TABLE IF EXISTS "media" CASCADE; 