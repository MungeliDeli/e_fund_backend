-- Migration: Create segments and contacts tables for outreach module
-- Description: Creates tables for managing contact lists and segments for email campaigns

-- Create segments table
CREATE TABLE IF NOT EXISTS segments (
    segment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_segments_organizer_id 
        FOREIGN KEY (organizer_id) 
        REFERENCES users(user_id) 
        ON DELETE CASCADE,
    
    -- Unique constraint for organizer and segment name
    CONSTRAINT uk_segments_organizer_name 
        UNIQUE (organizer_id, name)
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segment_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    description TEXT,
    emails_opened INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_contacts_segment_id 
        FOREIGN KEY (segment_id) 
        REFERENCES segments(segment_id) 
        ON DELETE CASCADE,
    
    -- Unique constraint for email within a segment
    CONSTRAINT uk_contacts_segment_email 
        UNIQUE (segment_id, email)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_segments_organizer_id ON segments(organizer_id);
CREATE INDEX IF NOT EXISTS idx_contacts_segment_id ON contacts(segment_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to segments table
CREATE TRIGGER update_segments_updated_at 
    BEFORE UPDATE ON segments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to contacts table
CREATE TRIGGER update_contacts_updated_at 
    BEFORE UPDATE ON contacts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 