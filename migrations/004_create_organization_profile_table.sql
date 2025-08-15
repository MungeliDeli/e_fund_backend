-- Up Migration: create organization_profiles table
CREATE TABLE "organizationProfiles"(
    "userId" UUID PRIMARY KEY REFERENCES "users"("userId") ON DELETE CASCADE,
    "organizationName" VARCHAR(255) NOT NULL,
    "organizationShortName" VARCHAR(50),
    "organizationType" VARCHAR(50) NOT NULL,
    "officialEmail" VARCHAR(255) UNIQUE,
    "officialWebsiteUrl" VARCHAR(255),
    "profilePictureMediaId" UUID NULL,
    "coverPictureMediaId" UUID NULL,
    "address" VARCHAR(255),
    "missionDescription" TEXT,
    "establishmentDate" DATE,
    "campusAffiliationScope" VARCHAR(50),
    "affiliatedSchoolsNames" TEXT,
    "affiliatedDepartmentNames" TEXT,
    "primaryContactPersonName" VARCHAR(255),
    "primaryContactPersonEmail" VARCHAR(255),
    "primaryContactPersonPhone" VARCHAR(20),
    "createdByAdminId" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_profilePictureMediaIdOrg FOREIGN KEY ("profilePictureMediaId") REFERENCES "media"("mediaId") ON DELETE SET NULL,
    CONSTRAINT fk_coverPictureMediaIdOrg FOREIGN KEY ("coverPictureMediaId") REFERENCES "media"("mediaId") ON DELETE SET NULL
);

-- Trigger for organization_profiles
CREATE TRIGGER trigger_update_organization_profiles
BEFORE UPDATE ON "organizationProfiles"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();  

-- Down Migration
DROP TRIGGER IF EXISTS trigger_update_organization_profiles ON "organizationProfiles";
DROP TABLE IF EXISTS "organizationProfiles" CASCADE;