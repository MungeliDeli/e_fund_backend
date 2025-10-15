/**
 * Redis Configuration
 * Simple Redis client setup for Socket.IO adapter and caching
 */

import Redis from "ioredis";
import logger from "../utils/logger.js";

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

// Create Redis client
const redisClient = new Redis(redisConfig);

// Handle connection events
redisClient.on("connect", () => {
  logger.info("Redis client connected");
});

redisClient.on("error", (error) => {
  logger.error("Redis client error:", error);
});

redisClient.on("close", () => {
  logger.warn("Redis client connection closed");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Closing Redis connection...");
  await redisClient.quit();
  process.exit(0);
});

export default redisClient;


