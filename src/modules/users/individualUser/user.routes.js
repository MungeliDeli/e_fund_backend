/**
 * User Routes
 *
 * Defines all user profile management API endpoints for the FundFlow backend.
 * Maps HTTP routes to controller actions, applies middleware for authentication and file upload,
 * and organizes endpoints for public/private profile fetching and profile/cover image upload.
 *
 * Key Features:
 * - Public and private profile routes
 * - Profile and cover image upload route (multipart/form-data)
 * - Middleware integration for authentication and file upload
 * - RESTful route organization
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { Router } from "express";
import { getUserProfile, getMyProfile } from "./user.controller.js";
import { authenticate } from "../../../middlewares/auth.middleware.js";
import multer from "multer";
import { logRequestCount } from "../../../middlewares/requestLogger.middleware.js";
import { catchAsync } from "../../../middlewares/errorHandler.js";
import processUploadsMiddleware from "../../../middlewares/processUploads.middleware.js";
import {
  updateProfileImage,
  getMediaUrl,
  updateUserProfile,
  getAllUsersController,
  toggleUserStatusController,
  makeUserAdminController,
  getAllAdminsController,
  removeAdminPrivilegesController,
} from "./user.controller.js";
import {
  validateUpdateProfile,
  validateUserId,
  validateMediaId,
} from "./user.validation.js";

// Enforce 2MB file size limit per image
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

const router = Router();
// Apply request logger to all auth routes
router.use(logRequestCount);
// Public profile (anyone)
router.get("/:userId/profile", validateUserId, catchAsync(getUserProfile));
// Private profile (owner only)
router.get("/me", authenticate, catchAsync(getMyProfile));
// Get signed URL for media file
router.get("/media/:mediaId/url", validateMediaId, catchAsync(getMediaUrl));
// Update profile/cover photo
router.patch(
  "/me/profile-image",
  authenticate,
  upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "coverPicture", maxCount: 1 },
  ]),
  processUploadsMiddleware(),
  catchAsync(updateProfileImage)
);

// Update profile information
router.put(
  "/me/profile",
  authenticate,
  validateUpdateProfile,
  catchAsync(updateUserProfile)
);

// Admin route to get all users
router.get("/", authenticate, catchAsync(getAllUsersController));

// Admin route to toggle user status
router.patch(
  "/:userId/status",
  authenticate,
  validateUserId,
  catchAsync(toggleUserStatusController)
);

// Super admin route to make user admin
router.patch(
  "/:userId/make-admin",
  authenticate,
  validateUserId,
  catchAsync(makeUserAdminController)
);

// Admin route to get all admins
router.get("/admins", authenticate, catchAsync(getAllAdminsController));

// Super admin route to remove admin privileges
router.patch(
  "/:userId/remove-admin",
  authenticate,
  validateUserId,
  catchAsync(removeAdminPrivilegesController)
);

export default router;
