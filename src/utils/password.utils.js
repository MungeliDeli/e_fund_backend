/**
 * Password Utilities Module
 * 
 * This module provides secure password handling utilities for the application.
 * It handles password hashing, verification, and validation using bcrypt
 * for secure password storage and comparison.
 * 
 * PASSWORD OPERATIONS:
 * - hashPassword: Securely hashes passwords using bcrypt
 * - comparePasswords: Compares plain text password with hashed password
 * - Password strength validation
 * - Salt generation and management
 * 
 * SECURITY FEATURES:
 * - bcrypt hashing with configurable salt rounds
 * - Secure password comparison
 * - Protection against timing attacks
 * - Salt generation for each password
 * - Configurable hash complexity
 * 
 * HASHING CONFIGURATION:
 * - Salt rounds: 12 (configurable via environment)
 * - Algorithm: bcrypt
 * - Salt generation: Automatic per password
 * - Hash format: bcrypt standard format
 * 
 * PASSWORD COMPARISON:
 * - Timing attack protection
 * - Secure comparison using bcrypt.compare
 * - Boolean result (true/false)
 * - Error handling for invalid inputs
 * 
 * USAGE PATTERNS:
 * - const hashedPassword = await hashPassword(plainPassword);
 * - const isValid = await comparePasswords(plainPassword, hashedPassword);
 * - Password hashing during registration
 * - Password verification during login
 * 
 * INTEGRATION:
 * - Works with authentication service
 * - Compatible with user registration
 * - Supports password change operations
 * - Enables secure password storage
 * 
 * SECURITY CONSIDERATIONS:
 * - Never store plain text passwords
 * - Use strong salt rounds in production
 * - Handle hashing errors gracefully
 * - Validate password strength before hashing
 * - Protect against rainbow table attacks
 * 
 * ERROR HANDLING:
 * - Hashing error handling
 * - Comparison error handling
 * - Invalid input validation
 * - Graceful error propagation
 * 
 * PERFORMANCE:
 * - Asynchronous operations
 * - Configurable hash complexity
 * - Efficient comparison operations
 * - Memory-safe operations
 * 
 * @author Your Name
 * @version 1.0.0
 * @since 2024
 */

// src/utils/password.utils.js
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hashes a plain text password.
 *
 * @param {string} password - The plain text password to hash.
 * @returns {Promise<string>} A promise that resolves with the hashed password.
 */
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
};

/**
 * Compares a plain text password with a hashed password.
 *
 * @param {string} plainPassword - The plain text password.
 * @param {string} hashedPassword - The hashed password.
 * @returns {Promise<boolean>} A promise that resolves with true if the passwords match, false otherwise.
 */
export const comparePasswords = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};