-- Up Migration: add emeail verification token to the user table

ALTER TABLE users 
    ADD COLUMN verification_token VARCHAR(255),
    ADD COLUMN verification_token_expires TIMESTAMP;



-- Down Migration: remove colum 
ALTER TABLE users 
    DROP COLUMN IF EXISTS verification_token,
    DROP COLUMN IF EXISTS verification_token_expires;

