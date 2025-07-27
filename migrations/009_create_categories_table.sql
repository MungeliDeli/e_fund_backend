-- Migration: Create Categories Table
-- Purpose: Stores predefined, manageable categories for campaigns (e.g., "Education", "Health", "Community")
-- Implied by FR-CM-001 for better campaign organization and search

CREATE TABLE IF NOT EXISTS categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Create index on is_active for filtering active categories
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some default categories
INSERT INTO categories (name, description) VALUES
    ('Education', 'Campaigns for education initiatives and learning programs'),
    ('Health', 'Health and medical campaigns for community wellness'),
    ('Community', 'Community development and social welfare projects'),
    ('Environment', 'Environmental conservation and sustainability projects'),
    ('Technology', 'Technology and innovation related campaigns'),
    ('Arts & Culture', 'Arts, culture, and creative expression projects'),
    ('Sports', 'Sports and athletic development campaigns'),
    ('Emergency Relief', 'Emergency response and disaster relief campaigns')
ON CONFLICT (name) DO NOTHING; 