-- Migration: Create audit logs table
-- Purpose: Records significant user actions and system events for auditing and security

-- Create audit action type enum
CREATE TYPE "auditActionType" AS ENUM(
    -- Authentication Actions
    'USER_LOGIN',
    'USER_LOGOUT',
    'USER_REGISTERED',
    'PASSWORD_CHANGED',
    'PASSWORD_RESET_REQUESTED',
    'PASSWORD_RESET_COMPLETED',
    'EMAIL_VERIFIED',
    'ACCOUNT_SUSPENDED',
    'ACCOUNT_ACTIVATED',
    
    -- Campaign Actions
    'CAMPAIGN_CREATED',
    'CAMPAIGN_UPDATED',
    'CAMPAIGN_DELETED',
    'CAMPAIGN_SUBMITTED',
    'CAMPAIGN_APPROVED',
    'CAMPAIGN_REJECTED',
    'CAMPAIGN_PUBLISHED',
    'CAMPAIGN_PAUSED',
    'CAMPAIGN_RESUMED',
    
    -- User Management Actions
    'USER_PROFILE_UPDATED',
    'USER_ROLE_CHANGED',
    'USER_PERMISSIONS_UPDATED',
    'ORGANIZATION_CREATED',
    'ORGANIZATION_UPDATED',
    
    -- Donation Actions
    'DONATION_MADE',
    'DONATION_REFUNDED',
    'DONATION_CANCELLED',
    
    -- System Actions
    'SYSTEM_BACKUP',
    'SYSTEM_MAINTENANCE',
    'CONFIGURATION_CHANGED',
    'SECURITY_ALERT',
    
    -- Outreach Actions
    'CONTACT_CREATED',
    'CONTACT_UPDATED',
    'CONTACT_DELETED',
    'SEGMENT_CREATED',
    'SEGMENT_UPDATED',
    'SEGMENT_DELETED',
    
    -- Notification Actions
    'NOTIFICATION_SENT',
    'NOTIFICATION_READ',
    'EMAIL_SENT',
    'SMS_SENT'
);

-- Create audit logs table
CREATE TABLE "auditLogs" (
    "logId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NULL REFERENCES "users"("userId") ON DELETE SET NULL,
    "actionType" "auditActionType" NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" UUID NULL,
    "details" JSONB NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" VARCHAR(45) NULL,
    "userAgent" VARCHAR(500) NULL,
    "sessionId" VARCHAR(255) NULL
);

-- Create indexes for performance
CREATE INDEX "idx_auditLogs_userId" ON "auditLogs"("userId");
CREATE INDEX "idx_auditLogs_actionType" ON "auditLogs"("actionType");
CREATE INDEX "idx_auditLogs_entityType" ON "auditLogs"("entityType");
CREATE INDEX "idx_auditLogs_timestamp" ON "auditLogs"("timestamp");
CREATE INDEX "idx_auditLogs_entityId" ON "auditLogs"("entityId");
CREATE INDEX "idx_auditLogs_userId_timestamp" ON "auditLogs"("userId", "timestamp");
CREATE INDEX "idx_auditLogs_entityType_entityId" ON "auditLogs"("entityType", "entityId");

-- Create composite index for common query patterns
CREATE INDEX "idx_auditLogs_actionType_timestamp" ON "auditLogs"("actionType", "timestamp");

-- Down Migration
-- DROP INDEX IF EXISTS "idx_auditLogs_actionType_timestamp";
-- DROP INDEX IF EXISTS "idx_auditLogs_entityType_entityId";
-- DROP INDEX IF EXISTS "idx_auditLogs_userId_timestamp";
-- DROP INDEX IF EXISTS "idx_auditLogs_entityId";
-- DROP INDEX IF EXISTS "idx_auditLogs_timestamp";
-- DROP INDEX IF EXISTS "idx_auditLogs_entityType";
-- DROP INDEX IF EXISTS "idx_auditLogs_actionType";
-- DROP INDEX IF EXISTS "idx_auditLogs_userId";
-- DROP TABLE IF EXISTS "auditLogs";
-- DROP TYPE IF EXISTS "auditActionType"; 