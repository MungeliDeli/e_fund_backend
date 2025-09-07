import {
  createOutreachCampaign as repoCreate,
  listOutreachCampaigns as repoList,
  getOutreachCampaignById as repoGet,
  updateOutreachCampaign as repoUpdate,
  archiveOutreachCampaign as repoArchive,
} from "./outreachCampaign.repository.js";

export const createOutreachCampaign = async (campaignId, organizerId, data) => {
  return await repoCreate(campaignId, organizerId, data);
};

export const listOutreachCampaigns = async (campaignId, organizerId) => {
  return await repoList(campaignId, organizerId);
};

export const getOutreachCampaign = async (outreachCampaignId, organizerId) => {
  return await repoGet(outreachCampaignId, organizerId);
};

export const updateOutreachCampaign = async (
  outreachCampaignId,
  organizerId,
  data
) => {
  return await repoUpdate(outreachCampaignId, organizerId, data);
};

export const archiveOutreachCampaign = async (
  outreachCampaignId,
  organizerId
) => {
  return await repoArchive(outreachCampaignId, organizerId);
};
