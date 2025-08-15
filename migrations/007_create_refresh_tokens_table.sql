-- Up Migration: Create refresh_tokens table

CREATE TABLE "refreshTokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "tokenHash" VARCHAR(255) NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Down Migration: Drop refresh_tokens table
DROP TABLE IF EXISTS "refreshTokens"; 