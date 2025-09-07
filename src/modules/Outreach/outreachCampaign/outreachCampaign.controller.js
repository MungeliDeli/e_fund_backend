import {
  createOutreachCampaign,
  listOutreachCampaigns,
  getOutreachCampaign,
  updateOutreachCampaign,
  archiveOutreachCampaign,
} from "./outreachCampaign.service.js";
import {
  sendOutreachInvitations,
  sendOutreachUpdates,
  sendOutreachThanks,
} from "../outreach.service.js";
import {
  addRecipientsBySegments,
  addRecipientsAllContacts,
  resendFailedInvitations,
} from "./outreachCampaignRecipients.service.js";
import {
  getOutreachCampaignStats,
  getOutreachCampaignEvents,
} from "./outreachCampaignAnalytics.service.js";
import { getRecipientsByCampaign } from "./outreachCampaignRecipients.repository.js";

export const createOutreachCampaignController = async (req, res) => {
  const { campaignId } = req.params;
  const organizerId = req.user.userId;
  const result = await createOutreachCampaign(
    campaignId,
    organizerId,
    req.body
  );
  res.status(201).json({ data: result });
};

export const listOutreachCampaignsController = async (req, res) => {
  const { campaignId } = req.params;
  const organizerId = req.user.userId;
  const result = await listOutreachCampaigns(campaignId, organizerId);
  res.status(200).json({ data: result });
};

export const getOutreachCampaignController = async (req, res) => {
  const { outreachCampaignId } = req.params;
  const organizerId = req.user.userId;
  const result = await getOutreachCampaignStats(
    outreachCampaignId,
    organizerId
  );
  // Attach recipients from recipients table for detail view
  const recipients = await getRecipientsByCampaign(outreachCampaignId);
  res.status(200).json({ data: { ...result, recipients } });
};

export const updateOutreachCampaignController = async (req, res) => {
  const { outreachCampaignId } = req.params;
  const organizerId = req.user.userId;
  const result = await updateOutreachCampaign(
    outreachCampaignId,
    organizerId,
    req.body
  );
  res.status(200).json({ data: result });
};

export const archiveOutreachCampaignController = async (req, res) => {
  const { outreachCampaignId } = req.params;
  const organizerId = req.user.userId;
  const result = await archiveOutreachCampaign(outreachCampaignId, organizerId);
  res.status(200).json({ data: result });
};

export const sendOutreachInvitationsController = async (req, res) => {
  const { outreachCampaignId } = req.params;
  const organizerId = req.user.userId;
  const result = await sendOutreachInvitations(
    req.body,
    outreachCampaignId,
    organizerId
  );
  res.status(200).json({ data: result });
};

export const getOutreachCampaignEventsController = async (req, res) => {
  const { outreachCampaignId } = req.params;
  const organizerId = req.user.userId;
  const { page, limit, type } = req.query;
  const result = await getOutreachCampaignEvents(
    outreachCampaignId,
    organizerId,
    {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      type,
    }
  );
  res.status(200).json({ data: result });
};

export const sendOutreachUpdatesController = async (req, res) => {
  const { outreachCampaignId } = req.params;
  const organizerId = req.user.userId;
  const result = await sendOutreachUpdates(
    req.body,
    outreachCampaignId,
    organizerId
  );
  res.status(200).json({ data: result });
};

export const sendOutreachThanksController = async (req, res) => {
  const { outreachCampaignId } = req.params;
  const organizerId = req.user.userId;
  const result = await sendOutreachThanks(
    req.body,
    outreachCampaignId,
    organizerId
  );
  res.status(200).json({ data: result });
};

export const addRecipientsController = async (req, res) => {
  const { outreachCampaignId } = req.params;
  const organizerId = req.user.userId;
  const { segmentIds, all } = req.body;
  let result;
  if (all) {
    result = await addRecipientsAllContacts(outreachCampaignId, organizerId);
  } else {
    result = await addRecipientsBySegments(
      outreachCampaignId,
      organizerId,
      segmentIds
    );
  }
  res.status(201).json({ data: result });
};

export const resendFailedInvitationsController = async (req, res) => {
  const { outreachCampaignId } = req.params;
  const organizerId = req.user.userId;
  const result = await resendFailedInvitations(outreachCampaignId, organizerId);
  res.status(200).json({ data: result });
};
