-- Up Migration: Add password reset columns to users table
ALTER TABLE "users"
  ADD COLUMN "resetToken" TEXT,
  ADD COLUMN "resetTokenExpires" TIMESTAMPTZ;

-- Down Migration: Remove password reset columns
ALTER TABLE "users"
  DROP COLUMN IF EXISTS "resetToken",
  DROP COLUMN IF EXISTS "resetTokenExpires"; 