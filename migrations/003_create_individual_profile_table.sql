-- Up Migration: create individual_profiles table
CREATE TABLE "individualProfiles"(
    "userId" UUID PRIMARY KEY REFERENCES "users"("userId") ON DELETE CASCADE,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "phoneNumber" VARCHAR(20) UNIQUE,
    "profilePictureMediaId" UUID NULL,
    "coverPictureMediaId" UUID NULL,
    "gender" VARCHAR(10),
    "dateOfBirth" DATE,
    "country" VARCHAR(100),
    "city" VARCHAR(100),
    "address" VARCHAR(255),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_profilePictureMediaId FOREIGN KEY ("profilePictureMediaId") REFERENCES "media"("mediaId") ON DELETE SET NULL,
    CONSTRAINT fk_coverPictureMediaId FOREIGN KEY ("coverPictureMediaId") REFERENCES "media"("mediaId") ON DELETE SET NULL
);

-- Trigger for individual_profiles
CREATE TRIGGER trigger_update_individual_profiles
BEFORE UPDATE ON "individualProfiles"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();  

-- Down Migration
DROP TRIGGER IF EXISTS trigger_update_individual_profiles ON "individualProfiles";
DROP TABLE IF EXISTS "individualProfiles" CASCADE;