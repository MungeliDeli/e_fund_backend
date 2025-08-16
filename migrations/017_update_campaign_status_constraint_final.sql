-- Migration: Update campaign status constraint to include new statuses
-- Purpose: Add pendingApproval and pendingStart statuses to the constraint

-- Drop the existing constraint
ALTER TABLE "campaigns" DROP CONSTRAINT IF EXISTS "campaigns_status_check";

-- Add the new constraint with updated statuses
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_status_check" 
CHECK (status IN ('draft', 'pendingApproval', 'pendingStart', 'active', 'successful', 'closed', 'cancelled', 'rejected'));

-- Update the column comment to reflect the new status meanings
COMMENT ON COLUMN campaigns.status IS 'Campaign status: draft=being created, pendingApproval=awaiting admin review, pendingStart=approved but not yet started, active=live and accepting donations, successful=closed and met goal, closed=reached end date, cancelled=stopped prematurely, rejected=not approved'; 