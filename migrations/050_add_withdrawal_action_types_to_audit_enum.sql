-- Migration: Add withdrawal action types to audit enum
-- Purpose: Add withdrawal-specific action types to the auditActionType enum

-- Add withdrawal action types to the existing enum
ALTER TYPE "auditActionType" ADD VALUE 'WITHDRAWAL_REQUESTED';
ALTER TYPE "auditActionType" ADD VALUE 'WITHDRAWAL_APPROVED';
ALTER TYPE "auditActionType" ADD VALUE 'WITHDRAWAL_REJECTED';
ALTER TYPE "auditActionType" ADD VALUE 'WITHDRAWAL_PROCESSING';
ALTER TYPE "auditActionType" ADD VALUE 'WITHDRAWAL_COMPLETED';
ALTER TYPE "auditActionType" ADD VALUE 'WITHDRAWAL_FAILED';

-- Down Migration
-- Note: PostgreSQL doesn't support removing enum values directly
-- To rollback, you would need to recreate the enum without these values
-- and update all existing records that use these values


