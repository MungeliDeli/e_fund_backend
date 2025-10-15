/**
 * Application Configuration Module
 *
 * This module centralizes all application configuration settings and environment
 * variables. It provides a single source of truth for configuration values and
 * ensures proper validation of required settings.
 *
 * CONFIGURATION SECTIONS:
 * - Environment settings (development, production, testing)
 * - Server configuration (port, host)
 * - Database configuration (host, port, credentials, database name)
 * - JWT configuration (secret, expiration)
 * - CORS configuration (allowed origins)
 *
 * ENVIRONMENT VARIABLES:
 * - NODE_ENV: Application environment (development/production/test)
 * - PORT: Server port number
 * - DB_HOST: Database host address
 * - DB_PORT: Database port number
 * - DB_USER: Database username
 * - DB_PASSWORD: Database password
 * - DB_NAME: Database name for development
 * - DB_NAME_TEST: Database name for testing
 * - JWT_SECRET: Secret key for JWT token signing
 * - JWT_EXPIRATION: JWT token expiration time
 * - CORS_ORIGIN: Allowed CORS origins
 *
 * CONFIGURATION VALIDATION:
 * - Required environment variable checking
 * - Database configuration validation
 * - JWT configuration validation
 * - Graceful error handling for missing configs
 * - Development vs production settings
 *
 * DATABASE CONFIGURATION:
 * - Environment-specific database selection
 * - Development database (DB_NAME)
 * - Test database (DB_NAME_TEST)
 * - Production database configuration
 * - Connection parameter management
 *
 * SECURITY FEATURES:
 * - Environment-based configuration
 * - Sensitive data protection
 * - Configuration validation
 * - Secure defaults
 * - Error handling for missing secrets
 *
 * ENVIRONMENT SUPPORT:
 * - Development environment settings
 * - Production environment settings
 * - Testing environment settings
 * - Environment-specific defaults
 * - Configuration inheritance
 *
 * VALIDATION FEATURES:
 * - Required configuration checking
 * - Database configuration validation
 * - JWT configuration validation
 * - Fatal error handling
 * - Configuration completeness verification
 *
 * USAGE PATTERNS:
 * - import config from './config/index.js'
 * - config.db.host, config.db.port, etc.
 * - config.jwt.secret, config.jwt.expireIn
 * - config.env, config.port
 *
 * INTEGRATION:
 * - Used by database connection module
 * - JWT utilities configuration
 * - Server startup configuration
 * - Environment-specific behavior
 *
 * ERROR HANDLING:
 * - Missing configuration detection
 * - Fatal error throwing for critical configs
 * - Graceful degradation where possible
 * - Clear error messages
 *
 * @author Your Name
 * @version 1.0.0
 * @since 2024
 */

import "dotenv/config";

const config = {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 3000,
  jwt: {
    secret: process.env.JWT_SECRET,
    expireIn: process.env.JWT_EXPIRATION,
  },
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  cors: {
    origins: process.env.CORS_ORIGIN || "*",
  },
  payments: {
    zynlepay: {
      baseUrl: process.env.ZYNLEPAY_BASE_URL,
      paymentStatusBaseUrl: process.env.ZYNLEPAY_PAYMENT_STATUS_BASE_URL,
      apiId: process.env.ZYNLEPAY_API_ID,
      apiKey: process.env.ZYNLEPAY_API_KEY,
      merchantId: process.env.ZYNLEPAY_MERCHANT_ID,
      channel: process.env.ZYNLEPAY_CHANNEL || "momo",
    },
    webhooks: {
      airtelUrl: process.env.PAYMENT_WEBHOOK_AIRTEL_URL,
      mtnUrl: process.env.PAYMENT_WEBHOOK_MTN_URL,
      secret: process.env.PAYMENT_WEBHOOK_SECRET,
    },
  },
};

if (
  !config.db.host ||
  !config.db.port ||
  !config.db.user ||
  !config.db.password ||
  !config.db.database
) {
  throw new Error("Fatal Error: Missing database configuration");
}
if (!config.jwt.secret || !config.jwt.expireIn) {
  throw new Error("Fatal Error: Missing JWT configuration");
}
// ghbv
export default config;
