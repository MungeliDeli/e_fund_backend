-- Migration: Create withdrawalRequests table
-- Purpose: Tracks organizer withdrawal requests and links to transactions

BEGIN;

CREATE TABLE "withdrawalRequests" (
    "withdrawalRequestId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL REFERENCES "campaigns"("campaignId") ON DELETE CASCADE,
    "organizerId" UUID NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
    "amount" NUMERIC(12, 2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ZMW',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending','approved','rejected','processing','paid','failed')),
    "destinationType" VARCHAR(20) NOT NULL CHECK ("destinationType" IN ('mobile_money','bank')),
    "destination" JSONB NOT NULL,
    "notes" TEXT,
    "approvedByUserId" UUID REFERENCES "users"("userId"),
    "approvedAt" TIMESTAMP WITH TIME ZONE,
    "transactionId" UUID REFERENCES "transactions"("transactionId"),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_withdrawalRequests_campaignId ON "withdrawalRequests"("campaignId");
CREATE INDEX IF NOT EXISTS idx_withdrawalRequests_organizerId ON "withdrawalRequests"("organizerId");
CREATE INDEX IF NOT EXISTS idx_withdrawalRequests_status ON "withdrawalRequests"("status");
CREATE INDEX IF NOT EXISTS idx_withdrawalRequests_createdAt ON "withdrawalRequests"("createdAt");

-- Trigger to maintain updatedAt timestamp
CREATE OR REPLACE FUNCTION update_withdrawalRequests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_withdrawalRequests_updated_at
    BEFORE UPDATE ON "withdrawalRequests"
    FOR EACH ROW
    EXECUTE FUNCTION update_withdrawalRequests_updated_at();

COMMIT;


