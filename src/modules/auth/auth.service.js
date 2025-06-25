// src/modules/auth/auth.service.js

import authRepository from "./auth.repository.js";
import { hashPassword, comparePasswords } from "../../utils/password.utils.js";
import { signToken } from "../../utils/jwt.utils.js";
import { 
  AuthenticationError, 
  ConflictError, 
  ValidationError,
  NotFoundError 
} from "../../utils/appError.js";
import logger from "../../utils/logger.js";
import crypto from "crypto";
import { createHash } from "crypto";

/**
 * Authentication Service
 * Contains business logic for authentication and user management
 */
class AuthService {
  /**
   * Registers a new individual user
   * @param {Object} registrationData - User registration data
   * @returns {Promise<Object>} Created user with profile and token
   */
  async registerIndividualUser(registrationData) {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        gender,
        dateOfBirth,
        country,
        city,
        address
      } = registrationData;

      // Check if email already exists
      const emailExists = await authRepository.emailExists(email);
      if (emailExists) {
        throw new ConflictError("Email address is already registered");
      }

      // Check if phone number already exists (if provided)
      if (phoneNumber) {
        const phoneExists = await authRepository.phoneNumberExists(phoneNumber);
        if (phoneExists) {
          throw new ConflictError("Phone number is already registered");
        }
      }

      // Hash the password
      const passwordHash = await hashPassword(password);

      // Prepare user data
      const userData = {
        email: email.toLowerCase().trim(),
        passwordHash,
        userType: "individual_user",
        isEmailVerified: false,
        isActive: false
      };

      // Prepare profile data
      const profileData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber ? phoneNumber.trim() : null,
        gender: gender || null,
        dateOfBirth: dateOfBirth || null,
        country: country ? country.trim() : null,
        city: city ? city.trim() : null,
        address: address ? address.trim() : null
      };

      // Create user with profile in a transaction
      const result = await authRepository.createUserWithProfile(userData, profileData);

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationTokenHash = createHash("sha256").update(verificationToken).digest("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await authRepository.createEmailVerificationToken(result.user.userId, verificationTokenHash, expiresAt);

      // TODO: Send email with verification link (containing the token)
      // Example: sendVerificationEmail(email, verificationToken)
      logger.info(`Email verification token for ${email}: ${verificationToken}`);

      logger.info("Individual user registered successfully (pending email verification)", {
        userId: result.user.userId,
        email: result.user.email
      });

      return {
        user: {
          userId: result.user.userId,
          email: result.user.email,
          userType: result.user.userType,
          isEmailVerified: result.user.isEmailVerified,
          isActive: result.user.isActive,
          createdAt: result.user.createdAt
        },
        profile: {
          firstName: result.profile.firstName,
          lastName: result.profile.lastName,
          phoneNumber: result.profile.phoneNumber,
          gender: result.profile.gender,
          dateOfBirth: result.profile.dateOfBirth,
          country: result.profile.country,
          city: result.profile.city,
          address: result.profile.address
        },
      
        verificationToken // to be removed in prod
      };
    } catch (error) {
      logger.error("Failed to register individual user", {
        error: error.message,
        email: registrationData.email
      });

      if (error instanceof ConflictError || error instanceof ValidationError) {
        throw error;
      }

      throw error;
    }
  }

  /**
   * Authenticates a user and returns a token
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<Object>} User data and token
   */
  async authenticateUser(email, password) {
    try {
      const user = await authRepository.findByEmail(email.toLowerCase().trim());
      if (!user) {
        throw new AuthenticationError("Invalid email or password");
      }
      if (!user.isEmailVerified) {
        throw new AuthenticationError("Please verify your email to activate your account.");
      }
      if (!user.isActive) {
        throw new AuthenticationError("Account is not active. Contact admin.");
      }
      const isPasswordValid = await comparePasswords(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new AuthenticationError("Invalid email or password");
      }
      const token = signToken({
        userId: user.userId,
        email: user.email,
        userType: user.userType
      });
     
      const refreshToken = crypto.randomBytes(64).toString("hex");
      const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");
      const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await authRepository.createRefreshToken(user.userId, refreshTokenHash, refreshExpiresAt);
      logger.security.loginAttempt(email, "N/A", true);
      return {
        user: {
          userId: user.userId,
          email: user.email,
          userType: user.userType,
          isEmailVerified: user.isEmailVerified,
          isActive: user.isActive,
          createdAt: user.createdAt
        },
        token,
        refreshToken 
      };
    } catch (error) {
      logger.security.loginAttempt(email, "N/A", false);
      if (error instanceof AuthenticationError) {
        throw error;
      }
      logger.error("Authentication failed", {
        error: error.message,
        email
      });
      throw new AuthenticationError("Authentication failed");
    }
  }

  /**
   * Gets user profile by ID
   * @param {string} userId - User's ID
   * @returns {Promise<Object>} User with profile
   */
  async getUserProfile(userId) {
    try {
      const result = await authRepository.findByIdWithProfile(userId);
      
      if (!result) {
        throw new NotFoundError("User");
      }

      return {
        user: {
          userId: result.user.userId,
          email: result.user.email,
          userType: result.user.userType,
          isEmailVerified: result.user.isEmailVerified,
          isActive: result.user.isActive,
          createdAt: result.user.createdAt,
          updatedAt: result.user.updatedAt
        },
        profile: result.profile
      };
    } catch (error) {
      logger.error("Failed to get user profile", {
        error: error.message,
        userId
      });

      if (error instanceof NotFoundError) {
        throw error;
      }

      throw error;
    }
  }

  /**
   * Verifies user's email using a verification token
   * @param {string} verificationToken
   * @returns {Promise<Object>} Updated user
   */
  async verifyEmail(verificationToken) {
    try {
      const verificationTokenHash = createHash("sha256").update(verificationToken).digest("hex");
      const user = await authRepository.findEmailVerificationToken(verificationTokenHash);
      if (!user) {
        throw new AuthenticationError("Invalid or expired verification token");
      }
      await authRepository.updateEmailVerification(user.userId, true);
      await authRepository.updateUserStatus(user.userId, true);
      await authRepository.deleteEmailVerificationToken(verificationTokenHash);
  
      const token = signToken({
        userId: user.userId,
        email: user.email,
        userType: user.userType
      });
      const refreshToken = crypto.randomBytes(64).toString("hex");
      const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");
      const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await authRepository.createRefreshToken(user.userId, refreshTokenHash, refreshExpiresAt);
      logger.info("Email verified and account activated", {
        userId: user.userId,
        email: user.email
      });
      return {
        userId: user.userId,
        email: user.email,
        isEmailVerified: true,
        isActive: true,
        token,
        refreshToken
      };
    } catch (error) {
      logger.error("Failed to verify email", {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Changes user's password
   * @param {string} userId - User's ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Success message
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await authRepository.findById(userId);
      if (!user) {
        throw new NotFoundError("User");
      }

     
      const isCurrentPasswordValid = await comparePasswords(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        throw new AuthenticationError("Current password is incorrect");
      }


      const newPasswordHash = await hashPassword(newPassword);

      await authRepository.updatePassword(user.userId , newPasswordHash)

      return {message: "Password change successfully"}


    } catch (error) {
      logger.error("Failed to change password", {
        error: error.message,
        userId
      });

      if (error instanceof NotFoundError || error instanceof AuthenticationError) {
        throw error;
      }

      throw error;
    }
  }

  /**
   * Refreshes user's authentication token using a refresh token includes rotating it 
   * @param {string} refreshToken
   * @returns {Promise<Object>} New JWT and refresh token
   */
  async refreshToken(refreshToken) {
    try {
      const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");
      const user = await authRepository.findRefreshToken(refreshTokenHash);
      if (!user) {
        throw new AuthenticationError("Invalid or expired refresh token");
      }
     
      const token = signToken({
        userId: user.userId,
        email: user.email,
        userType: user.userType
      });
    
      const newRefreshToken = crypto.randomBytes(64).toString("hex");
      const newRefreshTokenHash = createHash("sha256").update(newRefreshToken).digest("hex");
      const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); 
      await authRepository.createRefreshToken(user.userId, newRefreshTokenHash, refreshExpiresAt);
      await authRepository.deleteRefreshToken(refreshTokenHash);
      logger.security.tokenGenerated(user.userId, "refresh");
      return { token, refreshToken: newRefreshToken };
    } catch (error) {
      logger.error("Failed to refresh token", {
        error: error.message
      });
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError("Failed to refresh token");
    }
  }

  /**
   * Initiates forgot password process (sends reset email if user exists)
   * @param {string} email
   * @returns {Promise<Object>} Success message (do not reveal if email exists)
   */
  async forgotPassword(email) {
    const user = await authRepository.findByEmail(email);
    if (user && user.isActive) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = createHash("sha256").update(resetToken).digest("hex");
      const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // 20 min
      await authRepository.createPasswordResetToken(user.userId, resetTokenHash, expiresAt);
      logger.info(`Password reset token for ${email}: ${resetToken}`);
      // TODO: send actual email with reset link containing the token
    }
    return { message: "If the email exists, password reset instructions have been sent." };
  }

  /**
   * Resets password using a valid reset token
   * @param {string} resetToken
   * @param {string} newPassword
   * @returns {Promise<Object>} Success message
   */
  async resetPassword(resetToken, newPassword) {
    const resetTokenHash = createHash("sha256").update(resetToken).digest("hex");
    const user = await authRepository.findPasswordResetToken(resetTokenHash);
    if (!user) {
      throw new AuthenticationError("Invalid or expired reset token");
    }
    const newPasswordHash = await hashPassword(newPassword);
    await authRepository.updatePassword(user.userId, newPasswordHash);
    await authRepository.deletePasswordResetToken(resetTokenHash);
    return { message: "Password has been reset successfully." };
  }

  /**
   * Logs out a user (deletes refresh token)
   * @param {string} refreshToken
   * @returns {Promise<Object>} Success message
   */
  async logout(refreshToken) {
    if (refreshToken) {
      const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");
      await authRepository.deleteRefreshToken(refreshTokenHash);
    }
    return { message: "Logged out successfully." };
  }
}

export default new AuthService(); 