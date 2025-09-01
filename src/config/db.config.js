/**
 * Database Configuration Module
 * 
 * This module provides database-specific configuration settings extracted from
 * the main configuration. It serves as a dedicated configuration file for
 * database-related settings and ensures proper separation of concerns.
 * 
 * CONFIGURATION PURPOSE:
 * - Centralizes database connection parameters
 * - Provides clean interface for database configuration
 * - Enables easy database configuration management
 * - Supports environment-specific database settings
 * 
 * DATABASE PARAMETERS:
 * - host: Database server host address
 * - port: Database server port number
 * - user: Database username for authentication
 * - password: Database password for authentication
 * - database: Database name to connect to
 * 
 * CONFIGURATION SOURCE:
 * - Imports from main configuration module
 * - Uses environment-based settings
 * - Supports development and production environments
 * - Enables testing with separate database
 * 
 * USAGE PATTERNS:
 * - Direct import for database connection setup
 * - Used by database connection pool
 * - Compatible with migration tools
 * - Supports connection string generation
 * 
 * INTEGRATION:
 * - Works with database connection module
 * - Compatible with ORM tools
 * - Supports database migration systems
 * - Enables connection pooling configuration
 * 
 * SECURITY FEATURES:
 * - Environment-based credential management
 * - Secure configuration handling
 * - No hardcoded credentials
 * - Configuration validation support
 * 
 * @author Your Name
 * @version 1.0.0
 * @since 2024
 */

import config from './index.js';

const dbConfig = {
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database
}

export default dbConfig;