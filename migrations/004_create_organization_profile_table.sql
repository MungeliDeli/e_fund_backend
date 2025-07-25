-- Up Migration: create organization_profiles table
CREATE TABLE organization_profiles(
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    organization_name VARCHAR(255) NOT NULL,
    organization_short_name VARCHAR(50),
    organization_type VARCHAR(50) NOT NULL,
    official_email VARCHAR(255) UNIQUE,
    official_website_url VARCHAR(255),
    profile_picture_media_id UUID NULL,
    cover_picture_media_id UUID NULL,
    address VARCHAR(255),
    mission_description TEXT,
    establishment_date DATE,
    campus_affiliation_scope VARCHAR(50),
    affiliated_schools_names TEXT,
    affiliated_department_names TEXT,
    primary_contact_person_name VARCHAR(255),
    primary_contact_person_email VARCHAR(255),
    primary_contact_person_phone VARCHAR(20),
    created_by_admin_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_profile_picture_media_id_org FOREIGN KEY (profile_picture_media_id) REFERENCES media(media_id) ON DELETE SET NULL,
    CONSTRAINT fk_cover_picture_media_id_org FOREIGN KEY (cover_picture_media_id) REFERENCES media(media_id) ON DELETE SET NULL
);

-- Trigger for organization_profiles
CREATE TRIGGER trigger_update_organization_profiles
BEFORE UPDATE ON organization_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();  

-- Down Migration
DROP TRIGGER IF EXISTS trigger_update_organization_profiles ON organization_profiles;
DROP TABLE IF EXISTS organization_profiles CASCADE;