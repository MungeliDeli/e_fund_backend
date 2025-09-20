import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import config from "./config/index.js";
import logger from "./utils/logger.js";
import {
  errorHandler,
  notFoundHandler,
  handleUncaughtException,
  handleUnhandledRejection,
  rateLimitLogger,
} from "./middlewares/errorHandler.js";
import { apiLimiter } from "./middlewares/rateLimiters.js";
import setAuditContext from "./middlewares/auditContext.middleware.js";

// Import routes
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/users/individualUser/user.routes.js";
import organizationUserRoutes from "./modules/users/organizationUser/user.routes.js";
import categoryRoutes from "./modules/campaign/categories/category.routes.js";
import campaignRoutes from "./modules/campaign/campaigns/campaign.routes.js";
import segmentRoutes from "./modules/Outreach/segments/segment.routes.js";
import contactRoutes from "./modules/Outreach/contacts/contact.routes.js";
import trackingRoutes from "./modules/Outreach/tracking/tracking.routes.js";
import outreachRoutes from "./modules/Outreach/outreach.routes.js";
import notificationRoutes from "./modules/notifications/notification.routes.js";
import auditRoutes from "./modules/audit/audit.routes.js";
import { donationRoutes, messageRoutes } from "./modules/donor/index.js";
import { transactionRoutes } from "./modules/payment/index.js";
import analyticsRoutes from "./modules/analytics/analytics.routes.js";
import postRoutes from "./modules/feed/post.routes.js";

/**
 * Express Application Setup
 * Configures middleware, routes, and error handling
 */
const app = express();

// Trust proxy for rate limiting and security
app.set("trust proxy", 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: config.cors.origins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use(morgan("combined", { stream: logger.stream }));

// Request timing middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Audit context middleware (must be before routes for audit logging)
app.use(setAuditContext);

// Rate limit logging middleware (must be before routes to intercept responses)
app.use(rateLimitLogger);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    environment: config.env,
    version: process.env.npm_package_version || "1.0.0",
  });
});

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/organizations", organizationUserRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/campaigns", campaignRoutes);
app.use("/api/v1/outreach/segments", segmentRoutes);
app.use("/api/v1/outreach/contacts", contactRoutes);
app.use("/api/v1/outreach", outreachRoutes);
app.use("/t", trackingRoutes);
app.use("/api/v1/donations", donationRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/transactions", transactionRoutes);
app.use("/api/v1/audit", auditRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1", analyticsRoutes);
app.use("/api/v1", notificationRoutes);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handling middleware (must be last)
app.use(errorHandler);

// Handle uncaught exceptions and unhandled rejections
handleUncaughtException();
handleUnhandledRejection();

app.use("/api/", apiLimiter);

export default app;
