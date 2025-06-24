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