-- Migration: Remove unique constraints from link_tokens table
-- Purpose: Allow multiple link tokens for the same campaign-contact-type combination
-- This enables organizers to send multiple outreach emails to the same contact

-- Drop the unique constraints that prevent multiple link tokens
DROP INDEX IF EXISTS "idx_linkTokens_campaign_contact_type";
DROP INDEX IF EXISTS "idx_linkTokens_campaign_segment_type";

-- Note: We still maintain the regular indexes for performance
-- The unique constraints are removed to allow multiple outreach emails
-- to the same contact for the same campaign and type