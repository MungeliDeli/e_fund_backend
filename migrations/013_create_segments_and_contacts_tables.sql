-- Migration: Create segments and contacts tables for outreach module
-- Description: Creates tables for managing contact lists and segments for email campaigns

-- Create segments table
CREATE TABLE IF NOT EXISTS "segments" (
    "segmentId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "organizerId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_segments_organizer_id 
        FOREIGN KEY ("organizerId") 
        REFERENCES "users"("userId") 
        ON DELETE CASCADE,
    
    -- Unique constraint for organizer and segment name
    CONSTRAINT uk_segments_organizer_name 
        UNIQUE ("organizerId", "name")
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS "contacts" (
    "contactId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "segmentId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "emailsOpened" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_contacts_segment_id 
        FOREIGN KEY ("segmentId") 
        REFERENCES "segments"("segmentId") 
        ON DELETE CASCADE,
    
    -- Unique constraint for email within a segment
    CONSTRAINT uk_contacts_segment_email 
        UNIQUE ("segmentId", "email")
);

-- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_segments_organizerId ON "segments"("organizerId");
CREATE INDEX IF NOT EXISTS idx_contacts_segmentId ON "contacts"("segmentId");
CREATE INDEX IF NOT EXISTS idx_contacts_email ON "contacts"("email");

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to segments table
CREATE TRIGGER update_segments_updated_at 
    BEFORE UPDATE ON "segments" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to contacts table
CREATE TRIGGER update_contacts_updated_at 
    BEFORE UPDATE ON "contacts" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 