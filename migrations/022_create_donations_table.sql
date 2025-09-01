-- Migration: Create donations table
-- Purpose: Records individual donations made to campaigns

CREATE TABLE "donations" (
    "donationId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL REFERENCES "campaigns"("campaignId") ON DELETE CASCADE,
    "donorUserId" UUID REFERENCES "users"("userId") ON DELETE SET NULL,
    "amount" NUMERIC(12, 2) NOT NULL,
    "donationDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT FALSE,
    "messageId" UUID REFERENCES "donationMessages"("messageId") ON DELETE SET NULL,
    "paymentTransactionId" UUID NOT NULL REFERENCES "transactions"("transactionId") ON DELETE CASCADE,
    "status" VARCHAR(50) NOT NULL CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
    "receiptSent" BOOLEAN NOT NULL DEFAULT FALSE,
    "sourceChannelId" UUID -- Will be added later as Foreign Key to InvitationLink.linkId OR SocialShareLink.linkId
);

-- Create indexes for better performance
CREATE INDEX idx_donations_campaignId ON "donations"("campaignId");
CREATE INDEX idx_donations_donorUserId ON "donations"("donorUserId");
CREATE INDEX idx_donations_donationDate ON "donations"("donationDate");
CREATE INDEX idx_donations_status ON "donations"("status");
CREATE INDEX idx_donations_paymentTransactionId ON "donations"("paymentTransactionId");
CREATE INDEX idx_donations_messageId ON "donations"("messageId");
CREATE INDEX idx_donations_isAnonymous ON "donations"("isAnonymous");

-- Create unique constraint for paymentTransactionId
ALTER TABLE "donations" ADD CONSTRAINT "unique_payment_transaction_id" UNIQUE ("paymentTransactionId"); 