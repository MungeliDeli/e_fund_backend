-- Up Migration: create users table and userType
CREATE TYPE userType AS ENUM(
    'individualUser',
    'organizationUser',
    'superAdmin',
    'supportAdmin',
    'eventModerator',
    'financialAdmin'
);  

CREATE TABLE "users"(
    "userId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "userType" userType NOT NULL,
    "isEmailVerified" BOOLEAN DEFAULT FALSE,
    "isActive" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMPTZ NULL -- Added for tracking last login
);  

-- Trigger function for updated_at 
CREATE OR REPLACE FUNCTION update_updated_at_column() 
RETURNS TRIGGER AS $$ 
BEGIN 
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;  

-- Trigger for users table 
CREATE TRIGGER trigger_update_users_updated_at
BEFORE UPDATE ON "users" 
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();  

-- Down Migration
DROP TRIGGER IF EXISTS trigger_update_users_updated_at ON "users";
DROP FUNCTION IF EXISTS update_updated_at_column;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TYPE IF EXISTS userType;