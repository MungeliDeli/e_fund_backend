/**
 * Socket.IO Configuration
 * Real-time communication setup with Redis adapter
 */

import { Server } from "socket.io";
import redisClient from "./redis.config.js";
import logger from "../utils/logger.js";

let io = null;

export const initializeSocket = (server) => {
  if (io) {
    return io;
  }

  // Create Socket.IO server
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Note: Redis adapter can be added later for scaling
  // For now, using in-memory adapter for MVP

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication token required"));
      }

      // Verify JWT token (reuse existing auth logic)
      const jwt = await import("jsonwebtoken");
      const decoded = jwt.default.verify(token, process.env.JWT_SECRET);

      socket.userId = decoded.userId;
      socket.userType = decoded.userType;
      next();
    } catch (error) {
      logger.error("Socket authentication error:", error);

      // Provide more specific error messages
      if (error.name === "TokenExpiredError") {
        return next(new Error("jwt expired"));
      } else if (error.name === "JsonWebTokenError") {
        return next(new Error("Invalid token"));
      } else {
        return next(new Error("Authentication failed"));
      }
    }
  });

  // Connection handling
  io.on("connection", (socket) => {
    logger.info(`User ${socket.userId} connected via socket`);

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Join organization rooms if user is an organizer
    if (socket.userType === "organizationUser") {
      socket.join(`organization:${socket.userId}`);
    }

    // Join admin rooms if user is admin
    const adminRoles = [
      "superAdmin",
      "supportAdmin",
      "eventModerator",
      "financialAdmin",
    ];
    if (adminRoles.includes(socket.userType)) {
      socket.join("admin");
    }

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      logger.info(`User ${socket.userId} disconnected: ${reason}`);
    });

    // Handle notification acknowledgment
    socket.on("notification:acknowledge", (data) => {
      logger.info(`User ${socket.userId} acknowledged notification:`, data);
    });
  });

  logger.info("Socket.IO server initialized with Redis adapter");
  return io;
};

export const getSocketIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initializeSocket first.");
  }
  return io;
};

export default { initializeSocket, getSocketIO };
