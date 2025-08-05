-- Migration: Update campaign status constraint
-- Purpose: Refine campaign statuses to remove redundant ones and align with business logic


-- Now drop the old constraint and add the new one
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;

ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check 
CHECK (status IN ('draft', 'pending', 'active', 'successful', 'closed', 'cancelled', 'rejected'));

-- Add comment to document the status meanings
COMMENT ON COLUMN campaigns.status IS 'Campaign status: draft=being created, pending=awaiting review, active=live and accepting donations, successful=closed and met goal, closed=reached end date, cancelled=stopped prematurely, rejected=not approved'; 