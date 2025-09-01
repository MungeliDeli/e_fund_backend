-- Migration: Create notifications table
-- Purpose: Store in-app and email notifications per user

CREATE TABLE "notifications" (
    "notificationId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
    "type" VARCHAR(20) NOT NULL CHECK (type IN ('email', 'in_app')),
    "category" VARCHAR(50) NOT NULL,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMP WITH TIME ZONE,
    "sentAt" TIMESTAMP WITH TIME ZONE,
    "deliveryStatus" VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK ("deliveryStatus" IN ('pending','sent','failed','delivered')),
    "templateId" VARCHAR(100),
    "relatedEntityType" VARCHAR(50),
    "relatedEntityId" UUID,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Helpful indexes
    CREATE INDEX IF NOT EXISTS idx_notifications_userId ON "notifications"("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_deliveryStatus ON "notifications"("deliveryStatus");
CREATE INDEX IF NOT EXISTS idx_notifications_createdAt ON "notifications"("createdAt");
CREATE INDEX IF NOT EXISTS idx_notifications_readAt ON "notifications"("readAt");

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notifications_updated_at
    BEFORE UPDATE ON "notifications"
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

