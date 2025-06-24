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
