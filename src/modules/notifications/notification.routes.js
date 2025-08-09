import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  listMyNotifications,
  markNotificationRead,
} from "./notification.controller.js";

const router = Router();

router.use(authenticate);
router.get("/notifications", listMyNotifications);
router.patch("/notifications/:id/read", markNotificationRead);

export default router;
