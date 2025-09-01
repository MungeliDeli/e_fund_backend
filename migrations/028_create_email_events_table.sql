-- Migration: Create email_events table for outreach tracking
-- Purpose: Records email events (sent, open, click) for analytics and attribution

CREATE TABLE "emailEvents" (
    "emailEventId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "linkTokenId" UUID NOT NULL,
    "contactId" UUID,
    "type" VARCHAR(20) NOT NULL CHECK ("type" IN ('sent', 'open', 'click')),
    "userAgent" TEXT,
    "ipAddress" INET,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT "fk_emailEvents_linkTokenId" 
        FOREIGN KEY ("linkTokenId") 
        REFERENCES "linkTokens"("linkTokenId") 
        ON DELETE CASCADE,
    
    CONSTRAINT "fk_emailEvents_contactId" 
        FOREIGN KEY ("contactId") 
        REFERENCES "contacts"("contactId") 
        ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX "idx_emailEvents_linkTokenId" ON "emailEvents"("linkTokenId");
CREATE INDEX "idx_emailEvents_contactId" ON "emailEvents"("contactId");
CREATE INDEX "idx_emailEvents_type" ON "emailEvents"("type");
CREATE INDEX "idx_emailEvents_createdAt" ON "emailEvents"("createdAt");

-- Create composite index for common queries
CREATE INDEX "idx_emailEvents_linkToken_type" ON "emailEvents"("linkTokenId", "type");

-- Create index for IP address queries (useful for analytics)
CREATE INDEX "idx_emailEvents_ipAddress" ON "emailEvents"("ipAddress"); 