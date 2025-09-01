import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { catchAsync } from "../../middlewares/errorHandler.js";
import {
  listMyNotifications,
  markNotificationRead,
} from "./notification.controller.js";

const router = Router();

router.use(authenticate);
router.get("/notifications", catchAsync(listMyNotifications));
router.patch("/notifications/:id/read", catchAsync(markNotificationRead));

export default router;
