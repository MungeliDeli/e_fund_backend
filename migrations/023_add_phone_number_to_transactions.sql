-- Migration: Add phone number to transactions table
-- Purpose: Store phone number for payment processing and donor contact

ALTER TABLE "transactions" 
ADD COLUMN "phoneNumber" VARCHAR(20);

-- Create index for phone number queries
CREATE INDEX idx_transactions_phoneNumber ON "transactions"("phoneNumber");

-- Add comment to document the field
COMMENT ON COLUMN "transactions"."phoneNumber" IS 'Phone number used for payment processing (e.g., mobile money)'; 