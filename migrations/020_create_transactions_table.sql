-- Migration: Create transactions table
-- Purpose: A unified log for all financial transactions processed through the system

CREATE TABLE "transactions" (
    "transactionId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID REFERENCES "users"("userId") ON DELETE SET NULL,
    "campaignId" UUID NOT NULL REFERENCES "campaigns"("campaignId") ON DELETE CASCADE,
    "amount" NUMERIC(12, 2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "gatewayTransactionId" VARCHAR(255) UNIQUE NOT NULL,
    "gatewayUsed" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending', 'refunded')),
    "transactionTimestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feesAmount" NUMERIC(12, 2),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactionType" VARCHAR(50) NOT NULL CHECK (transactionType IN ('donation_in', 'withdrawal_out', 'platform_fee'))
);

-- Create indexes for better performance
CREATE INDEX idx_transactions_userId ON "transactions"("userId");
CREATE INDEX idx_transactions_campaignId ON "transactions"("campaignId");
CREATE INDEX idx_transactions_status ON "transactions"("status");
CREATE INDEX idx_transactions_gatewayTransactionId ON "transactions"("gatewayTransactionId");
CREATE INDEX idx_transactions_transactionTimestamp ON "transactions"("transactionTimestamp");
CREATE INDEX idx_transactions_transactionType ON "transactions"("transactionType");

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transactions_updated_at
    BEFORE UPDATE ON "transactions"
    FOR EACH ROW
    EXECUTE FUNCTION update_transactions_updated_at(); 