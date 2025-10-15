-- Add campaign post type to posts table
-- This allows posts that are automatically created when campaigns are published

-- Update the type constraint to include 'campaign'
ALTER TABLE "posts" DROP CONSTRAINT "posts_type_check";
ALTER TABLE "posts" ADD CONSTRAINT "posts_type_check" 
CHECK ("type" IN ('update', 'success_story', 'thank_you', 'standalone', 'campaign'));

-- Add comment to clarify the new post type
COMMENT ON COLUMN "posts"."type" IS 'Post type: update, success_story, thank_you (campaign-related), standalone (general posts), or campaign (auto-generated campaign posts)';

-- Update existing indexes to include the new type
-- The existing indexes will automatically include the new 'campaign' type
