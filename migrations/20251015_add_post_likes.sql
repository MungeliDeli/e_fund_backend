-- Add likes support for feed posts
-- 1) Add likesCount to posts
ALTER TABLE "posts"
  ADD COLUMN IF NOT EXISTS "likesCount" INTEGER NOT NULL DEFAULT 0;

-- 2) Create postLikes table to track unique user likes
CREATE TABLE IF NOT EXISTS "postLikes" (
  "postId" UUID NOT NULL REFERENCES "posts"("postId") ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT postLikes_unique UNIQUE ("postId", "userId")
);

-- Helpful index for listing who liked a post
CREATE INDEX IF NOT EXISTS idx_postLikes_postId ON "postLikes" ("postId");
CREATE INDEX IF NOT EXISTS idx_postLikes_userId ON "postLikes" ("userId");

