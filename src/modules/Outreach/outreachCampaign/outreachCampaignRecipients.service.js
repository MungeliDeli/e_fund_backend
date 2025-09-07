import {
  addRecipientsForSegments,
  addRecipientsForAllContacts,
  getFailedRecipientsByCampaign,
  markRecipientSendResult,
} from "./outreachCampaignRecipients.repository.js";
import {
  getContactsBySegment,
  getAllContactsByOrganizer,
} from "../contacts/contact.repository.js";
import { getOutreachCampaignById } from "./outreachCampaign.repository.js";
import { sendOutreachEmail } from "../../../utils/email.utils.js";
import { AppError } from "../../../utils/appError.js";

export const addRecipientsBySegments = async (
  outreachCampaignId,
  organizerId,
  segmentIds
) => {
  if (!Array.isArray(segmentIds) || segmentIds.length === 0) {
    throw new AppError(422, "segmentIds is required");
  }
  // Ensure campaign ownership
  await getOutreachCampaignById(outreachCampaignId, organizerId);
  return await addRecipientsForSegments(
    outreachCampaignId,
    organizerId,
    segmentIds
  );
};

export const addRecipientsAllContacts = async (
  outreachCampaignId,
  organizerId
) => {
  await getOutreachCampaignById(outreachCampaignId, organizerId);
  return await addRecipientsForAllContacts(outreachCampaignId, organizerId);
};

export const resendFailedInvitations = async (
  outreachCampaignId,
  organizerId
) => {
  await getOutreachCampaignById(outreachCampaignId, organizerId);
  const failed = await getFailedRecipientsByCampaign(outreachCampaignId);
  let successful = 0;
  let failedCount = 0;
  for (const r of failed) {
    try {
      // TODO: integrate real email payload/template if needed
      await sendOutreachEmail({ to: r.email, subject: "Invitation", html: "" });
      await markRecipientSendResult(r.recipientId, {
        status: "sent",
        failureReason: null,
      });
      successful += 1;
    } catch (e) {
      await markRecipientSendResult(r.recipientId, {
        status: "failed",
        failureReason: e.message || "Send failed",
      });
      failedCount += 1;
    }
  }
  return { successful, failed: failedCount };
};
