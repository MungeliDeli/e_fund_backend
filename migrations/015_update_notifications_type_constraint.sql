-- Migration: Update notifications type constraint
-- Purpose: Change the CHECK constraint to use 'inApp' instead of 'in_app' to match frontend usage

-- Drop the existing constraint
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_type_check";

-- Add the new constraint with 'inApp'
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_type_check"
CHECK ("type" IN ('email', 'inApp'));

-- Update any existing 'in_app' values to 'inApp' (if any exist)
UPDATE "notifications" 
SET "type" = 'inApp' 
WHERE "type" = 'in_app';

-- Down Migration
-- ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_type_check";
-- ALTER TABLE "notifications" ADD CONSTRAINT "notifications_type_check"
-- CHECK ("type" IN ('email', 'in_app'));
-- UPDATE "notifications" SET "type" = 'in_app' WHERE "type" = 'inApp'; 