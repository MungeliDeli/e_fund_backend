import postRepository from "./post.repository.js";
import { AppError } from "../../utils/appError.js";
import logger from "../../utils/logger.js";
import { uploadPostMediaToS3, getPublicS3Url } from "../../utils/s3.utils.js";

class PostService {
  async createPost(postData, organizerId) {
    try {
      const { campaignId, type, body, media } = postData;

      // Validate that user has permission to create posts
      if (!organizerId) {
        throw new AppError("Organizer ID is required", 400);
      }

      // If campaignId is provided, verify ownership
      if (campaignId) {
        const hasOwnership = await postRepository.checkCampaignOwnership(
          campaignId,
          organizerId
        );
        if (!hasOwnership) {
          throw new AppError(
            "You do not have permission to create posts for this campaign",
            403
          );
        }
      }

      // Validate content requirements
      if (!body?.trim() && (!media || media.length === 0)) {
        throw new AppError("Post must have either content or media", 400);
      }

      // Create the post first (without media)
      const post = await postRepository.createPost({
        ...postData,
        organizerId,
        media: [], // Start with empty media array
      });

      // Handle media uploads if any and prepare media JSON
      let mediaJson = [];
      if (media && media.length > 0) {
        const mediaPromises = media.map(async (mediaItem) => {
          try {
            // Upload to S3 with the actual postId
            const s3Key = await uploadPostMediaToS3({
              fileBuffer: mediaItem.buffer,
              fileName: mediaItem.name,
              mimeType: mediaItem.mimeType,
              postId: post.postId,
              mediaType: mediaItem.type,
            });

            // Generate public URL
            const publicUrl = getPublicS3Url(s3Key);

            // Return media metadata object
            return {
              url: publicUrl,
              type: mediaItem.type,
              s3Key: s3Key,
              fileName: mediaItem.name,
              fileSize: mediaItem.size,
              mimeType: mediaItem.mimeType,
              altText: mediaItem.altText || "",
              uploadedAt: new Date().toISOString(),
            };
          } catch (uploadError) {
            logger.error("Failed to upload post media to S3", {
              error: uploadError.message,
              postId: post.postId,
              fileName: mediaItem.name,
            });
            throw new AppError("Failed to upload media file", 500);
          }
        });

        mediaJson = await Promise.all(mediaPromises);

        // Update the post with the media JSON
        await postRepository.updatePostMedia(post.postId, mediaJson);
      }

      // Return the complete post
      const completePost = await this.getPostById(post.postId);

      logger.info(`Post created successfully`, {
        postId: post.postId,
        organizerId,
        type,
        campaignId,
      });

      return completePost;
    } catch (error) {
      logger.error("Error creating post:", error);
      throw error;
    }
  }

  async getPostById(postId) {
    try {
      const post = await postRepository.getPostById(postId);
      if (!post) {
        throw new AppError("Post not found", 404);
      }

      // Media is already parsed as object from PostgreSQL JSONB column
      const media = post.media || [];

      return {
        ...post,
        media,
      };
    } catch (error) {
      logger.error("Error fetching post:", error);
      throw error;
    }
  }

  async getPostsByCampaign(campaignId, options = {}) {
    try {
      const posts = await postRepository.getPostsByCampaign(
        campaignId,
        options
      );

      // Media is already parsed as object from PostgreSQL JSONB column
      const postsWithMedia = posts.map((post) => {
        const media = post.media || [];
        return { ...post, media };
      });

      return postsWithMedia;
    } catch (error) {
      logger.error("Error fetching campaign posts:", error);
      throw error;
    }
  }

  async getPostsByOrganizer(organizerId, options = {}) {
    try {
      const posts = await postRepository.getPostsByOrganizer(
        organizerId,
        options
      );

      // Media is already parsed as object from PostgreSQL JSONB column
      const postsWithMedia = posts.map((post) => {
        const media = post.media || [];
        return { ...post, media };
      });

      return postsWithMedia;
    } catch (error) {
      logger.error("Error fetching organizer posts:", error);
      throw error;
    }
  }

  async getAllPosts(options = {}) {
    try {
      const posts = await postRepository.getAllPosts(options);

      // Media is already parsed as object from PostgreSQL JSONB column
      const postsWithMedia = posts.map((post) => {
        const media = post.media || [];
        return { ...post, media };
      });

      return postsWithMedia;
    } catch (error) {
      logger.error("Error fetching all posts:", error);
      throw error;
    }
  }
}

export default new PostService();
