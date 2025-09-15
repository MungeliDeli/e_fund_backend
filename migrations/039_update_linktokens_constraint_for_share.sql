-- Allow share link tokens without contactId or segmentId
-- Update the existing constraint "chk_linkTokens_contact_or_segment" on "linkTokens"

ALTER TABLE "linkTokens"
DROP CONSTRAINT IF EXISTS "chk_linkTokens_contact_or_segment";

ALTER TABLE "linkTokens"
ADD CONSTRAINT "chk_linkTokens_contact_or_segment"
CHECK (
  (
    "contactId" IS NOT NULL OR "segmentId" IS NOT NULL
  )
  OR (
    "type" = 'share'
  )
);

