-- Migration: Cleanup campaigns table
-- Purpose: Rename title to name, remove media ID columns, remove draft status, and remove templateId

-- Drop the existing status constraint
ALTER TABLE "campaigns" DROP CONSTRAINT IF EXISTS "campaigns_status_check";

-- Add the new constraint without 'draft' status
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_status_check" 
CHECK (status IN ('pendingApproval', 'pendingStart', 'active', 'successful', 'closed', 'cancelled', 'rejected'));

-- Update any existing draft campaigns to pendingApproval
UPDATE "campaigns" SET status = 'pendingApproval' WHERE status = 'draft';

-- Rename title column to name
ALTER TABLE "campaigns" RENAME COLUMN "title" TO "name";

-- Remove the templateId column
ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "templateId";

-- Remove the media ID columns (we'll store media URLs in customPageSettings JSON instead)
ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "mainMediaId";
ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "campaignLogoMediaId";

-- Drop the templateId index if it exists
DROP INDEX IF EXISTS idx_campaigns_templateId;

-- Update the column comment to reflect the new status meanings
COMMENT ON COLUMN "campaigns".status IS 'Campaign status: pendingApproval=awaiting admin review, pendingStart=approved but not yet started, active=live and accepting donations, successful=closed and met goal, closed=reached end date, cancelled=stopped prematurely, rejected=not approved';

-- Update the default status for new campaigns
ALTER TABLE "campaigns" ALTER COLUMN status SET DEFAULT 'pendingApproval';
