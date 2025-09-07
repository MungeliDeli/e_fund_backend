-- Create outreachCampaignRecipients table to store recipients per outreach campaign
-- All identifiers use camelCase and are quoted per ENGINEERING_RULES

BEGIN;

CREATE TABLE IF NOT EXISTS "outreachCampaignRecipients" (
  "recipientId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "outreachCampaignId" UUID NOT NULL REFERENCES "outreachCampaigns"("outreachCampaignId") ON DELETE CASCADE,
  "contactId" UUID NOT NULL REFERENCES "contacts"("contactId") ON DELETE RESTRICT,
  "email" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending', -- pending | sent | failed
  "lastSendAt" TIMESTAMP NULL,
  "failureReason" TEXT NULL,
  "opened" BOOLEAN NOT NULL DEFAULT FALSE,
  "clicked" BOOLEAN NOT NULL DEFAULT FALSE,
  "donated" BOOLEAN NOT NULL DEFAULT FALSE,
  "donatedAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ensure a contact is added only once per outreach campaign
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_outreachCampaignRecipients_campaign_contact"
  ON "outreachCampaignRecipients" ("outreachCampaignId", "contactId");

CREATE INDEX IF NOT EXISTS "idx_outreachCampaignRecipients_campaign"
  ON "outreachCampaignRecipients" ("outreachCampaignId");

CREATE INDEX IF NOT EXISTS "idx_outreachCampaignRecipients_status"
  ON "outreachCampaignRecipients" ("status");

-- Trigger to update updatedAt
CREATE OR REPLACE FUNCTION "setTimestampUpdatedAt_outreachCampaignRecipients"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_set_updated_at_outreachCampaignRecipients" ON "outreachCampaignRecipients";
CREATE TRIGGER "trg_set_updated_at_outreachCampaignRecipients"
BEFORE UPDATE ON "outreachCampaignRecipients"
FOR EACH ROW
EXECUTE FUNCTION "setTimestampUpdatedAt_outreachCampaignRecipients"();

COMMIT;

