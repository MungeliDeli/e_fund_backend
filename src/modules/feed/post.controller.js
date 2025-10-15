import postService from "./post.service.js";
import { ResponseFactory } from "../../utils/response.utils.js";
import logger from "../../utils/logger.js";

const createPost = async (req, res) => {
  const organizerId = req.user.userId;
  const postData = req.body;

  // Handle file uploads for media
  if (req.files && req.files.length > 0) {
    postData.media = req.files.map((file) => ({
      type: file.mimetype.startsWith("image/") ? "image" : "video",
      name: file.originalname,
      size: file.size,
      mimeType: file.mimetype, // Store actual mimeType for S3 upload
      buffer: file.buffer, // Store buffer for S3 upload
    }));
  }

  const post = await postService.createPost(postData, organizerId);

  logger.info("Post created successfully", {
    postId: post.postId,
    organizerId,
    type: post.type,
  });

  return ResponseFactory.created(res, "Post created successfully", post);
};

const getPostById = async (req, res) => {
  const { postId } = req.params;

  const post = await postService.getPostById(postId);

  return ResponseFactory.ok(res, "Post retrieved successfully", post);
};

const getPostsByCampaign = async (req, res) => {
  const { campaignId } = req.params;
  const options = {
    type: req.query.type,
    status: req.query.status || "published",
    limit: parseInt(req.query.limit) || 20,
    cursor: req.query.cursor,
  };

  const posts = await postService.getPostsByCampaign(campaignId, options);

  return ResponseFactory.ok(
    res,
    "Campaign posts retrieved successfully",
    posts
  );
};

const getPostsByOrganizer = async (req, res) => {
  const { organizerId } = req.params;
  const options = {
    status: req.query.status || "published",
    limit: parseInt(req.query.limit) || 20,
    cursor: req.query.cursor,
  };

  const posts = await postService.getPostsByOrganizer(organizerId, options);

  return ResponseFactory.ok(
    res,
    "Organizer posts retrieved successfully",
    posts
  );
};

const getCampaignPostsByOrganizer = async (req, res) => {
  const { organizerId } = req.params;
  const options = {
    status: req.query.status || "published",
    limit: parseInt(req.query.limit) || 20,
    cursor: req.query.cursor,
  };

  const posts = await postService.getCampaignPostsByOrganizer(
    organizerId,
    options
  );

  return ResponseFactory.ok(
    res,
    "Organizer campaign posts retrieved successfully",
    posts
  );
};

const getAllPosts = async (req, res) => {
  const options = {
    status: req.query.status || "published",
    limit: parseInt(req.query.limit) || 20,
    cursor: req.query.cursor,
    type: req.query.type,
    sort: req.query.sort === "popular" ? "popular" : "latest",
  };

  const posts = await postService.getAllPosts(options);

  return ResponseFactory.ok(res, "Posts retrieved successfully", posts);
};

const toggleLike = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.userId;
  const result = await postService.toggleLike(postId, userId);
  return ResponseFactory.ok(res, "Post like updated", result);
};

export {
  createPost,
  getPostById,
  getPostsByCampaign,
  getPostsByOrganizer,
  getCampaignPostsByOrganizer,
  getAllPosts,
  toggleLike,
};
