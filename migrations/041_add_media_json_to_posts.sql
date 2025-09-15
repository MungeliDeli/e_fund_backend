-- Migration: Add media JSON column to posts table
-- Purpose: Store media metadata as JSON array instead of separate media table records

-- Add media JSON column to posts table
ALTER TABLE "posts" 
ADD COLUMN "media" JSONB DEFAULT '[]'::jsonb;

-- Add index for media JSON column for better performance
CREATE INDEX "idx_posts_media" ON "posts" USING GIN ("media");

-- Update existing posts to have empty media array if null
UPDATE "posts" SET "media" = '[]'::jsonb WHERE "media" IS NULL;
