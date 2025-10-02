/**
 * Organization User Routes
 *
 * Defines all organization user profile management API endpoints for the FundFlow backend.
 * Maps HTTP routes to controller actions, applies middleware for authentication and file upload,
 * and organizes endpoints for public/private profile fetching and profile/cover image upload.
 *
 * Key Features:
 * - Public and private organization profile routes
 * - Profile and cover image upload route (multipart/form-data)
 * - Organization listing route
 * - Middleware integration for authentication and file upload
 * - RESTful route organization
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { Router } from "express";
import {
  getUserProfile,
  getMyProfile,
  getOrganizers,
} from "./user.controller.js";
import { authenticate } from "../../../middlewares/auth.middleware.js";
import multer from "multer";
import { logRequestCount } from "../../../middlewares/requestLogger.middleware.js";
import { catchAsync } from "../../../middlewares/errorHandler.js";
import processUploadsMiddleware from "../../../middlewares/processUploads.middleware.js";
import {
  updateProfileImage,
  getMediaUrl,
  updateUserProfile,
  updateOrganizationProfileWithImages,
} from "./user.controller.js";
import {
  validateUpdateOrganizationProfile,
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
// Public: Get all organizers (with optional filters)
router.get("/organizers", catchAsync(getOrganizers));
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
  validateUpdateOrganizationProfile,
  catchAsync(updateUserProfile)
);

// Update profile information with images
router.put(
  "/me/profile-with-images",
  authenticate,
  upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "coverPicture", maxCount: 1 },
  ]),
  validateUpdateOrganizationProfile,
  processUploadsMiddleware(),
  catchAsync(updateOrganizationProfileWithImages)
);

export default router;
