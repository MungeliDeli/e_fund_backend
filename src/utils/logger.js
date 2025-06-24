import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";
import config from "../config/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) =>
      `${info.timestamp} ${info.level}: ${info.message}${
        info.stack ? "\n" + info.stack : ""
      }`
  )
);

// Define file format (no colors for files)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define which logs to show based on environment
const level = () => {
  const env = config.env || "development";
  const isDevelopment = env === "development";
  return isDevelopment ? "debug" : "warn";
};

// Create transports array
const transports = [
  new winston.transports.Console({
    level: level(),
    format: format,
  }),
];

// Add file transports only in production
if (config.env === "production") {
  // Ensure logs directory exists at project root level
  const logsDir = path.join(process.cwd(), "logs");

  transports.push(
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: fileFormat,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Handle uncaught exceptions and unhandled rejections
if (config.env === "production") {
  logger.exceptions.handle(
    new winston.transports.File({
      filename: path.join(process.cwd(), "logs", "exceptions.log"),
      format: fileFormat,
    })
  );

  logger.rejections.handle(
    new winston.transports.File({
      filename: path.join(process.cwd(), "logs", "rejections.log"),
      format: fileFormat,
    })
  );
}

// Create a stream object for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Add helper methods for different log levels with context
logger.logWithContext = (level, message, context = {}) => {
  logger[level](
    `${message} ${Object.keys(context).length ? JSON.stringify(context) : ""}`
  );
};

// Database specific logging helpers
logger.db = {
  query: (query, duration, rowCount) => {
    logger.debug(`DB Query: ${query} [${duration}ms] - rows: ${rowCount}`);
  },
  error: (query, error) => {
    logger.error(`DB Error: ${query}`, {
      error: error.message,
      stack: error.stack,
    });
  },
  connection: (message) => {
    logger.info(`DB: ${message}`);
  },
};

// API specific logging helpers
logger.api = {
  request: (method, url, ip, userAgent) => {
    logger.http(`${method} ${url} - IP: ${ip} - ${userAgent}`);
  },
  response: (method, url, statusCode, responseTime) => {
    logger.http(`${method} ${url} - ${statusCode} - ${responseTime}ms`);
  },
  error: (method, url, error, userId = null) => {
    logger.error(`API Error: ${method} ${url}`, {
      error: error.message,
      stack: error.stack,
      userId,
    });
  },
};

// Security specific logging
logger.security = {
  loginAttempt: (email, ip, success) => {
    const level = success ? "info" : "warn";
    logger[level](
      `Login attempt: ${email} from ${ip} - ${success ? "SUCCESS" : "FAILED"}`
    );
  },
  tokenGenerated: (userId, type) => {
    logger.info(`Token generated: ${type} for user ${userId}`);
  },
  suspiciousActivity: (message, context) => {
    logger.warn(`Security Alert: ${message}`, context);
  },
};

export default logger;
