import { Router } from "express";
import { catchAsync } from "../../../middlewares/errorHandler.js";
import {
  handleAirtelWebhook,
  handleMtnWebhook,
  testWebhook,
} from "./webhooks.controller.js";

const router = Router();

// Public webhook endpoints (secured via shared secret or IP allow list at controller)
router.post("/airtel-money", catchAsync(handleAirtelWebhook));
router.post("/mtn-money", catchAsync(handleMtnWebhook));

// Test endpoint to verify webhook accessibility
router.all("/test", catchAsync(testWebhook));

export default router;
