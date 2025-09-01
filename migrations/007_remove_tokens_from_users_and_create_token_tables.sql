-- Up Migration: Remove token columns from users and create token tables

ALTER TABLE "users"
  DROP COLUMN IF EXISTS "resetToken",
  DROP COLUMN IF EXISTS "resetTokenExpires",
  DROP COLUMN IF EXISTS "verificationToken",
  DROP COLUMN IF EXISTS "verificationTokenExpires";

CREATE TABLE "passwordResetTokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "tokenHash" VARCHAR(255) NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "emailVerificationTokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "users"("userId") ON DELETE CASCADE,
  "tokenHash" VARCHAR(255) NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Down Migration: Drop token tables and re-add columns to users
DROP TABLE IF EXISTS "passwordResetTokens";
DROP TABLE IF EXISTS "emailVerificationTokens";

ALTER TABLE "users"
  ADD COLUMN "resetToken" TEXT,
  ADD COLUMN "resetTokenExpires" TIMESTAMPTZ,
  ADD COLUMN "verificationToken" VARCHAR(255),
  ADD COLUMN "verificationTokenExpires" TIMESTAMP; 