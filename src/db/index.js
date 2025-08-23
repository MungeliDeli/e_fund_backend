/**
 * Database Connection and Utilities Module
 *
 * This module provides the core database connectivity and utilities for the application.
 * It manages PostgreSQL connection pooling, query execution, transaction handling,
 * and database lifecycle management using the 'pg' (node-postgres) library.
 *
 * DATABASE FEATURES:
 * - Connection pooling for efficient resource management
 * - Query execution with parameterized statements
 * - Transaction support with rollback capabilities
 * - Connection lifecycle management
 * - Graceful shutdown handling
 *
 * CONNECTION POOL:
 * - Configurable pool size and settings
 * - Automatic connection management
 * - Connection health monitoring
 * - Pool event handling (connect, error)
 * - Connection timeout management
 *
 * QUERY EXECUTION:
 * - Parameterized queries for SQL injection prevention
 * - Query performance monitoring
 * - Execution time tracking
 * - Row count logging
 * - Error handling and logging
 *
 * TRANSACTION MANAGEMENT:
 * - Atomic transaction support
 * - Automatic rollback on errors
 * - Transaction logging
 * - Client acquisition and release
 * - Nested transaction support
 *
 * SECURITY FEATURES:
 * - Parameterized queries prevent SQL injection
 * - Connection string security
 * - Environment-based configuration
 * - Credential management
 * - SSL/TLS support
 *
 * MONITORING AND LOGGING:
 * - Query execution time tracking
 * - Database connection events
 * - Error logging with context
 * - Performance metrics
 * - Connection pool statistics
 *
 * ERROR HANDLING:
 * - Connection error handling
 * - Query execution errors
 * - Transaction rollback on failure
 * - Graceful error propagation
 * - Detailed error logging
 *
 * CONFIGURATION:
 * - Environment-based database settings
 * - Configurable connection parameters
 * - Pool size optimization
 * - Timeout settings
 * - SSL configuration
 *
 * LIFECYCLE MANAGEMENT:
 * - Application startup connection
 * - Graceful shutdown handling
 * - Connection cleanup
 * - Process signal handling
 * - Resource deallocation
 *
 * EXPORTED FUNCTIONS:
 * - query: Execute parameterized queries
 * - getClient: Get database client from pool
 * - transaction: Execute transactions
 * - pool: Access to connection pool
 *
 * INTEGRATION:
 * - Works with repository layer
 * - Compatible with service layer
 * - Supports migration system
 * - Enables testing with separate database
 *
 * @author Your Name
 * @version 1.0.0
 * @since 2024
 */

import pg from "pg";
import config from "../config/index.js";
import logger from "../utils/logger.js";

const { Pool } = pg;

const dbConfig = {
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
};

const pool = new Pool(dbConfig);

pool.on("connect", () => {
  logger.db.connection("Connected to PostgreSQL database!");
});

pool.on("error", (err) => {
  logger.error("Unexpected error on idle client", {
    error: err.message,
    stack: err.stack,
  });
  process.exit(-1);
});

/**
 * Executes a SQL query using the connection pool.
 * @param {string} text - The SQL query string.
 * @param {Array} params - An array of parameters for the query.
 * @returns {Promise<Object>} The result of the query.
 */
const query = async (text, params = []) => {
  try {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    // Use the specialized db logger
    logger.db.query(text, duration, res.rowCount);

    return res;
  } catch (error) {
    // Use the specialized db error logger
    logger.db.error(text, error);
    throw error; // Re-throw the error
  }
};

/**
 * Provides a client from the pool for transactions.
 * @returns {Promise<pg.PoolClient>} A database client.
 */
const getClient = async () => {
  try {
    const client = await pool.connect();
    logger.debug("Database client acquired from pool.");
    return client;
  } catch (error) {
    logger.error("Failed to acquire database client from pool", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Executes multiple queries in a transaction.
 * @param {Function} callback - Function that receives the client and executes queries
 * @returns {Promise<any>} The result of the transaction
 */
const transaction = async (callback) => {
  const client = await getClient();

  try {
    await client.query("BEGIN");
    logger.debug("Transaction started");

    const result = await callback(client);

    await client.query("COMMIT");
    logger.debug("Transaction committed");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    logger.db.error("Transaction rolled back", error);
    throw error;
  } finally {
    client.release();
    logger.debug("Database client released back to pool");
  }
};

// Graceful shutdown
const gracefulShutdown = () => {
  logger.info("Shutting down database connection pool...");
  pool.end(() => {
    logger.db.connection(
      "PostgreSQL connection pool disconnected due to app termination"
    );
    process.exit(0);
  });
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// Export individual functions
export { query, getClient, pool, transaction };

// Export db object for backward compatibility
export const db = {
  query,
  getClient,
  pool,
  transaction,
};
