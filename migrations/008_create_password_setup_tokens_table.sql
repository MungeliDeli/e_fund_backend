-- Up Migration: Create password_setup_tokens table for organizational user activation

CREATE TABLE "passwordSetupTokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "tokenHash" VARCHAR(255) NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Down Migration: Drop password_setup_tokens table
DROP TABLE IF EXISTS "passwordSetupTokens"; 