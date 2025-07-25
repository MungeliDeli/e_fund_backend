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

import { Router } from 'express';
import { getUserProfile, getMyProfile, getOrganizers } from './user.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import multer from 'multer';
import { logRequestCount } from '../../middlewares/requestLogger.middleware.js';
import { catchAsync } from '../../middlewares/errorHandler.js';
import { updateProfileImage, getMediaUrl, updateUserProfile } from './user.controller.js';

// Enforce 2MB file size limit per image
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

const router = Router();
// Apply request logger to all auth routes
router.use(logRequestCount);
// Public profile (anyone)
router.get('/:userId/profile', getUserProfile);
// Private profile (owner only)
router.get('/me', authenticate, getMyProfile);
// Public: Get all organizers (with optional filters)
router.get('/organizers', getOrganizers);
// Get signed URL for media file
router.get('/media/:mediaId/url', getMediaUrl);
// Update profile/cover photo
router.patch(
  '/me/profile-image',
  authenticate,
  upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'coverPicture', maxCount: 1 }
  ]),
  catchAsync(updateProfileImage)
);

// Update profile information
router.put('/me/profile', authenticate, catchAsync(updateUserProfile));

export default router; 