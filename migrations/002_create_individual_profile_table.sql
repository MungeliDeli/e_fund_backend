-- Up Migration: Create individual_profiles table
CREATE TABLE individual_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) UNIQUE,
  gender VARCHAR(10),
  date_of_birth DATE,
  country VARCHAR(100),
  city VARCHAR(100),
  address VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);  

-- Trigger for individual_profiles
CREATE TRIGGER trigger_update_individual_profiles
BEFORE UPDATE ON individual_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();  

-- Down Migration
DROP TRIGGER IF EXISTS trigger_update_individual_profiles ON individual_profiles;
DROP TABLE IF EXISTS individual_profiles CASCADE;