-- Up Migration: Remove affiliatedSchoolsNames and affiliatedDepartmentNames columns from organizationProfiles table
ALTER TABLE "organizationProfiles" 
DROP COLUMN IF EXISTS "affiliatedSchoolsNames",
DROP COLUMN IF EXISTS "affiliatedDepartmentNames";

-- Down Migration: Add back the columns (if needed for rollback)
ALTER TABLE "organizationProfiles" 
ADD COLUMN "affiliatedSchoolsNames" TEXT,
ADD COLUMN "affiliatedDepartmentNames" TEXT;
