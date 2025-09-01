-- Up Migration: add emeail verification token to the user table

ALTER TABLE "users" 
    ADD COLUMN "verificationToken" VARCHAR(255),
    ADD COLUMN "verificationTokenExpires" TIMESTAMP;



-- Down Migration: remove colum 
ALTER TABLE "users" 
    DROP COLUMN IF EXISTS "verificationToken",
    DROP COLUMN IF EXISTS "verificationTokenExpires";

