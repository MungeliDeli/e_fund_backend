import app from "./src/app.js";
import config from "./src/config/index.js";
import logger from "./src/utils/logger.js";
import notificationService from "./src/modules/notifications/notification.service.js";
import { initializeSocket } from "./src/config/socket.config.js";

/**
 * Server Startup
 * Initializes and starts the Express server
 */

const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Environment: ${config.env}`);
  logger.info(`API Base URL: http://localhost:${PORT}/api/v1`);
  logger.info(config.env);
  logger.info(config.db.database);
  

  const intervalMs = Number(
    process.env.NOTIFICATION_RETRY_INTERVAL_MS || 300000
  ); 
  setInterval(() => {
    notificationService
      .retryFailedEmails()
      .then(() => logger.debug("Notification retry job ran"))
      .catch((err) =>
        logger.warn("Notification retry job error", { error: err.message })
      );
  }, intervalMs);
});

// Initialize Socket.IO
initializeSocket(server);

n
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error(
      "Could not close connections in time, forcefully shutting down"
    );
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

export default server;
