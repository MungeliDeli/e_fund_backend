import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { extname } from "path";

// Configure ffmpeg binary
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Defaults via env with sensible fallbacks
const IMAGE_MAX_DIMENSION = parseInt(process.env.IMAGE_MAX_DIMENSION || "1600", 10);
const IMAGE_TARGET_MAX_BYTES = parseInt(process.env.IMAGE_TARGET_MAX_BYTES || "512000", 10); // 500 KB
const IMAGE_DEFAULT_QUALITY = parseInt(process.env.IMAGE_DEFAULT_QUALITY || "75", 10);
const IMAGE_MIN_QUALITY = parseInt(process.env.IMAGE_MIN_QUALITY || "50", 10);

const VIDEO_MAX_HEIGHT = parseInt(process.env.VIDEO_MAX_HEIGHT || "720", 10);
const VIDEO_MAX_BITRATE = process.env.VIDEO_MAX_BITRATE || "2500k";

export function detectMediaType(mimeType) {
  if (!mimeType) return "unsupported";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "unsupported";
}

export async function optimizeImage(inputBuffer, inputMimeType) {
  // Resize and attempt WebP first
  let quality = IMAGE_DEFAULT_QUALITY;
  let outputBuffer = await sharp(inputBuffer)
    .rotate()
    .resize({ width: IMAGE_MAX_DIMENSION, height: IMAGE_MAX_DIMENSION, fit: "inside" })
    .webp({ quality, effort: 4 })
    .toBuffer();

  // Try adaptive quality reduction to meet target size
  while (outputBuffer.length > IMAGE_TARGET_MAX_BYTES && quality > IMAGE_MIN_QUALITY) {
    quality = Math.max(IMAGE_MIN_QUALITY, quality - 5);
    outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({ width: IMAGE_MAX_DIMENSION, height: IMAGE_MAX_DIMENSION, fit: "inside" })
      .webp({ quality, effort: 4 })
      .toBuffer();
  }

  let finalMime = "image/webp";

  // If still too big, try JPEG progressive as fallback
  if (outputBuffer.length > IMAGE_TARGET_MAX_BYTES) {
    quality = IMAGE_DEFAULT_QUALITY;
    outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({ width: IMAGE_MAX_DIMENSION, height: IMAGE_MAX_DIMENSION, fit: "inside" })
      .jpeg({ quality, progressive: true, mozjpeg: true })
      .toBuffer();
    finalMime = "image/jpeg";

    while (outputBuffer.length > IMAGE_TARGET_MAX_BYTES && quality > IMAGE_MIN_QUALITY) {
      quality = Math.max(IMAGE_MIN_QUALITY, quality - 5);
      outputBuffer = await sharp(inputBuffer)
        .rotate()
        .resize({ width: IMAGE_MAX_DIMENSION, height: IMAGE_MAX_DIMENSION, fit: "inside" })
        .jpeg({ quality, progressive: true, mozjpeg: true })
        .toBuffer();
    }
  }

  return { buffer: outputBuffer, mimeType: finalMime, size: outputBuffer.length };
}

export async function transcodeVideo(inputBuffer, inputMimeType) {
  // Wrap ffmpeg buffer processing into a Promise returning Buffer
  return new Promise((resolve, reject) => {
    const chunks = [];
    const command = ffmpeg()
      .input(Buffer.from(inputBuffer))
      .inputFormat("mov,mp4,m4a,3gp,3g2,mj2,matroska,webm,avi,mpegts,flv")
      .videoCodec("libx264")
      .size(`?x${VIDEO_MAX_HEIGHT}`)
      .outputOptions([
        "-preset veryfast",
        `-b:v ${VIDEO_MAX_BITRATE}`,
        "-movflags +faststart",
        "-profile:v high",
        "-level 4.0",
        "-pix_fmt yuv420p",
      ])
      .audioCodec("aac")
      .format("mp4")
      .on("error", (err) => reject(err))
      .on("end", () => {
        const outputBuffer = Buffer.concat(chunks);
        resolve({ buffer: outputBuffer, mimeType: "video/mp4", size: outputBuffer.length });
      })
      .pipe();

    command.on("data", (chunk) => chunks.push(chunk));
  });
}

export function updatedFileName(originalName, newMime) {
  const ext = extname(originalName).toLowerCase();
  if (newMime === "image/webp") return originalName.replace(ext, ".webp");
  if (newMime === "image/jpeg") return originalName.replace(ext, ".jpg");
  if (newMime === "video/mp4") return originalName.replace(ext, ".mp4");
  return originalName;
}


