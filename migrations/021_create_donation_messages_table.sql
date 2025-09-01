-- Migration: Create donation messages table
-- Purpose: Stores messages left by donors on campaign pages

CREATE TABLE "donationMessages" (
    "messageId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL REFERENCES "campaigns"("campaignId") ON DELETE CASCADE,
    "donorUserId" UUID REFERENCES "users"("userId") ON DELETE SET NULL,
    "messageText" TEXT NOT NULL,
    "postedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pendingModeration' CHECK (status IN ('pendingModeration', 'approved', 'rejected')),
    "moderatedByUserId" UUID REFERENCES "users"("userId") ON DELETE SET NULL,
    "moderatedAt" TIMESTAMP WITH TIME ZONE,
    "isFeatured" BOOLEAN NOT NULL DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX idx_donationMessages_campaignId ON "donationMessages"("campaignId");
CREATE INDEX idx_donationMessages_donorUserId ON "donationMessages"("donorUserId");
CREATE INDEX idx_donationMessages_status ON "donationMessages"("status");
CREATE INDEX idx_donationMessages_postedAt ON "donationMessages"("postedAt");
CREATE INDEX idx_donationMessages_moderatedByUserId ON "donationMessages"("moderatedByUserId");
CREATE INDEX idx_donationMessages_isFeatured ON "donationMessages"("isFeatured"); 