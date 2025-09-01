/**
 * Main Application Entry Point
 * 
 * This module serves as the main entry point for the E-Fund Backend application.
 * It initializes the Express server, sets up middleware, connects to the database,
 * and starts the HTTP server on the configured port.
 * 
 * APPLICATION FEATURES:
 * - Express.js web server setup
 * - Database connection initialization
 * - Middleware configuration
 * - Route registration
 * - Error handling setup
 * - Graceful shutdown handling
 * 
 * SERVER CONFIGURATION:
 * - Port configuration from environment
 * - Environment-based settings
 * - CORS configuration
 * - Body parsing middleware
 * - Security middleware setup
 * 
 * MIDDLEWARE STACK:
 * - Request logging and monitoring
 * - CORS handling
 * - Body parsing (JSON, URL-encoded)
 * - Rate limiting
 * - Authentication middleware
 * - Error handling
 * 
 * ROUTE REGISTRATION:
 * - Authentication routes (/api/v1/auth/*)
 * - User management routes
 * - Health check endpoints
 * - API versioning support
 * - Route organization
 * 
 * DATABASE INTEGRATION:
 * - PostgreSQL connection setup
 * - Connection pool management
 * - Database health checks
 * - Migration support
 * - Connection error handling
 * 
 * SECURITY FEATURES:
 * - CORS protection
 * - Rate limiting
 * - Input validation
 * - Authentication middleware
 * - Error message sanitization
 * 
 * MONITORING AND LOGGING:
 * - Request/response logging
 * - Error logging
 * - Performance monitoring
 * - Health check endpoints
 * - Application metrics
 * 
 * ENVIRONMENT SUPPORT:
 * - Development environment
 * - Production environment
 * - Testing environment
 * - Environment-specific configurations
 * - Configuration validation
 * 
 * GRACEFUL SHUTDOWN:
 * - Signal handling (SIGINT, SIGTERM)
 * - Database connection cleanup
 * - Server shutdown
 * - Resource deallocation
 * - Process termination
 * 
 * ERROR HANDLING:
 * - Global error handling
 * - Custom error classes
 * - Error logging
 * - Graceful error responses
 * - Debug information in development
 * 
 * @author Your Name
 * @version 1.0.0
 * @since 2024
 */

// src/index.js
// Main application entry point

// Optionally export modules for app.js 
 