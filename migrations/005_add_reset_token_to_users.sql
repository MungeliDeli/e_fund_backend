-- Up Migration: Add password reset columns to users table
ALTER TABLE users
  ADD COLUMN reset_token TEXT,
  ADD COLUMN reset_token_expires TIMESTAMPTZ;

-- Down Migration: Remove password reset columns
ALTER TABLE users
  DROP COLUMN IF EXISTS reset_token,
  DROP COLUMN IF EXISTS reset_token_expires; 