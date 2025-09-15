-- Add standalone post type to posts table
-- This allows posts that are not tied to any specific campaign

-- Update the type constraint to include 'standalone'
ALTER TABLE "posts" DROP CONSTRAINT "posts_type_check";
ALTER TABLE "posts" ADD CONSTRAINT "posts_type_check" 
CHECK ("type" IN ('update', 'success_story', 'thank_you', 'standalone'));

-- Add comment to clarify the new post type
COMMENT ON COLUMN "posts"."type" IS 'Post type: update, success_story, thank_you (campaign-related), or standalone (general posts)';

-- Update existing indexes to include the new type
-- The existing indexes will automatically include the new 'standalone' type
