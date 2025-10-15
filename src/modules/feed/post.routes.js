import { Router } from "express";
import multer from "multer";
import { catchAsync } from "../../middlewares/errorHandler.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import processUploadsMiddleware from "../../middlewares/processUploads.middleware.js";
import {
  createPost,
  getPostById,
  getPostsByCampaign,
  getPostsByOrganizer,
  getCampaignPostsByOrganizer,
  getAllPosts,
  toggleLike,
} from "./post.controller.js";
import { validateCreatePost, validatePostId } from "./post.validation.js";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file for better performance
    files: 5, // Maximum 5 media files
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only images and videos are allowed"), false);
    }
  },
});

const router = Router();

// Create post (authenticated organizers only)
router.post(
  "/",
  authenticate,
  upload.array("media", 5),
  processUploadsMiddleware(),
  validateCreatePost,
  catchAsync(createPost)
);

// Get post by ID (public)
router.get("/:postId", validatePostId, catchAsync(getPostById));

// Get posts by campaign (public)
router.get("/campaigns/:campaignId", catchAsync(getPostsByCampaign));

// Get posts by organizer (public)
router.get("/organizers/:organizerId", catchAsync(getPostsByOrganizer));

// Get campaign posts by organizer (public)
router.get(
  "/organizers/:organizerId/campaigns",
  catchAsync(getCampaignPostsByOrganizer)
);

// Get all posts (public feed)
router.get("/", catchAsync(getAllPosts));

// Toggle like on a post (auth required)
router.post(
  "/:postId/like",
  authenticate,
  validatePostId,
  catchAsync(toggleLike)
);

export default router;
