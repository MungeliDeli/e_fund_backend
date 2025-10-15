import {
  detectMediaType,
  optimizeImage,
  transcodeVideo,
  updatedFileName,
} from "../utils/mediaProcessing.js";
import logger from "../utils/logger.js";

/**
 * Middleware to process and optimize uploaded files in memory (req.files or req.file)
 * Assumes multer memory storage is used earlier in the chain.
 */
export default function processUploadsMiddleware() {
  return async (req, res, next) => {
    try {
      const processFile = async (file) => {
        const type = detectMediaType(file.mimetype);
        if (type === "image") {
          const before = file.size;
          const result = await optimizeImage(file.buffer, file.mimetype);
          file.buffer = result.buffer;
          file.mimetype = result.mimeType;
          file.size = result.size;
          file.originalname = updatedFileName(
            file.originalname,
            result.mimeType
          );
          logger.info("Optimized image", {
            before,
            after: result.size,
            name: file.originalname,
          });
        } else if (type === "video") {
          const before = file.size;
          const result = await transcodeVideo(file.buffer, file.mimetype);
          file.buffer = result.buffer;
          file.mimetype = result.mimeType;
          file.size = result.size;
          file.originalname = updatedFileName(
            file.originalname,
            result.mimeType
          );
          logger.info("Transcoded video", {
            before,
            after: result.size,
            name: file.originalname,
          });
        }
      };

      if (req.file) {
        await processFile(req.file);
      }

      if (req.files) {
        if (Array.isArray(req.files)) {
          // e.g., upload.array
          for (const f of req.files) {
            await processFile(f);
          }
        } else {
          // e.g., upload.fields
          const fieldNames = Object.keys(req.files);
          for (const field of fieldNames) {
            const arr = req.files[field] || [];
            for (const f of arr) {
              await processFile(f);
            }
          }
        }
      }

      next();
    } catch (err) {
      logger.error("Media processing failed", { error: err.message });
      next(err);
    }
  };
}
