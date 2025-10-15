import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { catchAsync } from "../../middlewares/errorHandler.js";
import {
  listMyNotifications,
  markNotificationRead,
  getUnreadCount,
  broadcastNotification,
  testNotification,
} from "./notification.controller.js";

const router = Router();

router.use(authenticate);
router.get("/notifications", catchAsync(listMyNotifications));
router.get("/notifications/unread-count", catchAsync(getUnreadCount));
router.patch("/notifications/:id/read", catchAsync(markNotificationRead));
router.post("/notifications/broadcast", catchAsync(broadcastNotification));
router.post("/notifications/test", catchAsync(testNotification));

export default router;
