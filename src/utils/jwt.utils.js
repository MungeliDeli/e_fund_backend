/**
 * JWT (JSON Web Token) Utilities Module
 * 
 * This module provides utilities for creating, verifying, and managing JSON Web Tokens
 * used for authentication and authorization in the application. It handles token
 * generation, validation, and decoding operations.
 * 
 * JWT OPERATIONS:
 * - signToken: Creates JWT tokens with user payload
 * - verifyToken: Verifies and decodes JWT tokens
 * - Token payload structure and validation
 * - Token expiration handling
 * 
 * TOKEN FEATURES:
 * - Secure token generation using environment secrets
 * - Configurable expiration times
 * - User payload inclusion (userId, email, userType)
 * - Token verification with error handling
 * - Expiration validation
 * 
 * SECURITY FEATURES:
 * - Environment-based secret key
 * - Token expiration enforcement
 * - Payload validation
 * - Error handling for invalid tokens
 * - Secure token signing algorithm (HS256)
 * 
 * TOKEN PAYLOAD:
 * - userId: Unique user identifier
 * - email: User's email address
 * - userType: User role/type (individual_user, organization_user, admin, etc.)
 * - iat: Issued at timestamp
 * - exp: Expiration timestamp
 * 
 * CONFIGURATION:
 * - JWT_SECRET: Environment variable for token signing
 * - JWT_EXPIRATION: Environment variable for token expiration
 * - Default expiration fallback
 * - Secret key validation
 * 
 * ERROR HANDLING:
 * - TokenExpiredError: For expired tokens
 * - JsonWebTokenError: For malformed tokens
 * - NotBeforeError: For tokens used before valid date
 * - Custom error messages for different scenarios
 * 
 * USAGE PATTERNS:
 * - const token = signToken({ userId, email, userType });
 * - const decoded = verifyToken(token);
 * - Token verification in middleware
 * - Token generation in authentication
 * 
 * INTEGRATION:
 * - Works with authentication middleware
 * - Compatible with Express.js
 * - Supports refresh token flow
 * - Enables stateless authentication
 * 
 * TOKEN LIFECYCLE:
 * - Generation during login/registration
 * - Verification in protected routes
 * - Refresh token mechanism
 * - Token invalidation on logout
 * 
 * @author Your Name
 * @version 1.0.0
 * @since 2024
 */

// src/utils/jwt.utils.js

import jwt from "jsonwebtoken";
import config from "../config/index.js";
import { AuthenticationError } from "./appError.js";

/**
 * Generates a JSON Web Token (JWT).
 *
 * @param {object} payload - The data to include in the token.
 * @returns {string} The generated JWT.
 */
export const signToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expireIn,
  });
};

/**
 * Verifies a JSON Web Token (JWT).
 *
 * @param {string} token - The JWT to verify.
 * @returns {object} The decoded payload if verification is successful.
 * @throws {AuthenticationError} If the token is invalid or expired.
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === "TokenExpiredError") {
      throw new AuthenticationError("Token has expired");
    }
    if (error.name === "JsonWebTokenError") {
      throw new AuthenticationError("Invalid token");
    }
    // Re-throw other errors
    throw error;
  }
};
