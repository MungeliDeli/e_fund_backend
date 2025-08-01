-- Migration: Create campaigns table
-- Purpose: Stores details of each fundraising campaign

CREATE TABLE IF NOT EXISTS campaigns (
    campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255),
    description TEXT,
    goal_amount NUMERIC(12, 2) NOT NULL,
    current_raised_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pendingApproval', 'active', 'successful', 'closed', 'cancelled', 'rejected')),
    main_media_id UUID REFERENCES media(media_id) ON DELETE SET NULL,
    campaign_logo_media_id UUID REFERENCES media(media_id) ON DELETE SET NULL,
    custom_page_settings JSONB,
    share_link TEXT UNIQUE,
    approved_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    template_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_campaigns_organizer_id ON campaigns(organizer_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_template_id ON campaigns(template_id);
CREATE INDEX idx_campaigns_share_link ON campaigns(share_link);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_campaigns_updated_at();

-- Create campaign_categories bridge table for many-to-many relationship
CREATE TABLE IF NOT EXISTS campaign_categories (
    campaign_id UUID NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (campaign_id, category_id)
);

-- Create indexes for campaign_categories
CREATE INDEX idx_campaign_categories_campaign_id ON campaign_categories(campaign_id);
CREATE INDEX idx_campaign_categories_category_id ON campaign_categories(category_id); 