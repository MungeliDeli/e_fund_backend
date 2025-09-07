import { Router } from "express";
import { catchAsync } from "../../../middlewares/errorHandler.js";
import { authenticate } from "../../../middlewares/auth.middleware.js";
import {
  validateCreateOutreachCampaign,
  validateUpdateOutreachCampaign,
  validateOutreachCampaignId,
  validateCampaignIdParam,
  validateSendInvitations,
  validateSendUpdates,
  validateSendThanks,
  validateAddRecipients,
} from "./outreachCampaign.validation.js";
import {
  createOutreachCampaignController,
  listOutreachCampaignsController,
  getOutreachCampaignController,
  updateOutreachCampaignController,
  archiveOutreachCampaignController,
  sendOutreachInvitationsController,
  getOutreachCampaignEventsController,
  sendOutreachUpdatesController,
  sendOutreachThanksController,
  addRecipientsController,
  resendFailedInvitationsController,
} from "./outreachCampaign.controller.js";

const router = Router();

router.use(authenticate);

router.post(
  "/campaigns/:campaignId/outreach-campaigns",
  validateCampaignIdParam,
  validateCreateOutreachCampaign,
  catchAsync(createOutreachCampaignController)
);

router.get(
  "/campaigns/:campaignId/outreach-campaigns",
  validateCampaignIdParam,
  catchAsync(listOutreachCampaignsController)
);

router.get(
  "/outreach-campaigns/:outreachCampaignId",
  validateOutreachCampaignId,
  catchAsync(getOutreachCampaignController)
);

router.patch(
  "/outreach-campaigns/:outreachCampaignId",
  validateOutreachCampaignId,
  validateUpdateOutreachCampaign,
  catchAsync(updateOutreachCampaignController)
);

router.post(
  "/outreach-campaigns/:outreachCampaignId/archive",
  validateOutreachCampaignId,
  catchAsync(archiveOutreachCampaignController)
);

router.post(
  "/outreach-campaigns/:outreachCampaignId/send-invitations",
  validateOutreachCampaignId,
  validateSendInvitations,
  catchAsync(sendOutreachInvitationsController)
);

router.post(
  "/outreach-campaigns/:outreachCampaignId/recipients",
  validateOutreachCampaignId,
  validateAddRecipients,
  catchAsync(addRecipientsController)
);

router.post(
  "/outreach-campaigns/:outreachCampaignId/resend-failed",
  validateOutreachCampaignId,
  catchAsync(resendFailedInvitationsController)
);

router.get(
  "/outreach-campaigns/:outreachCampaignId/events",
  validateOutreachCampaignId,
  catchAsync(getOutreachCampaignEventsController)
);

router.post(
  "/outreach-campaigns/:outreachCampaignId/send-updates",
  validateOutreachCampaignId,
  validateSendUpdates,
  catchAsync(sendOutreachUpdatesController)
);

router.post(
  "/outreach-campaigns/:outreachCampaignId/send-thanks",
  validateOutreachCampaignId,
  validateSendThanks,
  catchAsync(sendOutreachThanksController)
);

export default router;
