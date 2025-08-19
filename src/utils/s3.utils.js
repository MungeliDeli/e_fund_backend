/**
 * S3 Utility Functions
 *
 * Provides helper functions for uploading files to AWS S3 and generating signed URLs
 * for secure, time-limited access to media files. Used for profile/cover image uploads
 * and media retrieval in the FundFlow backend.
 *
 * Key Features:
 * - Upload files to S3 with unique keys
 * - Generate signed URLs for secure access (default 1 hour expiry)
 * - Uses AWS SDK v3 and environment-based configuration
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

// Initialize S3 client with credentials from environment variables
const BUCKET = process.env.AWS_S3_BUCKET_NAME;
const REGION = process.env.AWS_REGION;
const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a file buffer to S3 with a unique key
 * @param {Object} params
 * @param {Buffer} params.fileBuffer - File data
 * @param {string} params.fileName - Original file name (for extension)
 * @param {string} params.mimeType - MIME type
 * @param {string} [params.folder] - Optional folder prefix
 * @returns {Promise<string>} S3 key of the uploaded file
 */
export async function uploadFileToS3({
  fileBuffer,
  fileName,
  mimeType,
  folder = "",
}) {
  const ext = path.extname(fileName);
  const key = `${folder ? folder + "/" : ""}${uuidv4()}${ext}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  });
  await s3.send(command);
  return key;
}

/**
 * Generate a signed URL for an S3 object (default 1 hour expiry)
 * @param {string} key - S3 object key
 * @param {number} [expiresIn=3600] - Expiry in seconds
 * @returns {Promise<string>} Signed URL
 */
export async function getSignedS3Url(key, expiresIn = 60 * 60) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Upload campaign media to S3 with campaign-specific key
 * @param {Object} params
 * @param {Buffer} params.fileBuffer - File data
 * @param {string} params.fileName - Original file name (for extension)
 * @param {string} params.mimeType - MIME type
 * @param {string} params.campaignId - Campaign ID for key generation
 * @param {string} params.mediaType - Media type ('main', 'sec1', 'sec2', etc.)
 * @param {string} [params.folder] - Optional folder prefix (default: 'campaigns')
 * @returns {Promise<string>} S3 key of the uploaded file
 */
export async function uploadCampaignMediaToS3({
  fileBuffer,
  fileName,
  mimeType,
  campaignId,
  mediaType,
  folder = "campaigns",
}) {
  const ext = path.extname(fileName);
  const key = `${folder}/${campaignId}${mediaType}${ext}`;
  
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  });
  
  await s3.send(command);
  return key;
}

/**
 * GENERATE PUBLIC URL FOR S3 OBJECTS
 * This function is suitable for objects with public read access.
 * @param {string} key - S3 object key (this is the file_name stored in your media table)
 * @returns {string} Permanent Public URL
 */
export function getPublicS3Url(key) {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}
