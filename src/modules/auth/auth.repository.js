/**
 * Auth Repository
 *
 * Handles all database operations for authentication, user, token, and media management.
 * Provides a data access layer for the Auth Service, abstracting SQL queries and transactions.
 *
 * Key Features:
 * - User and organization CRUD operations
 * - Token creation, validation, and revocation
 * - Media record creation and lookup
 * - Transaction support for multi-step operations
 * - Error handling and logging
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { query, transaction } from "../../db/index.js";
import {
  DatabaseError,
  ConflictError,
  NotFoundError,
} from "../../utils/appError.js";
import logger from "../../utils/logger.js";

/**
 * Authentication Repository
 * Handles all database operations related to authentication and user management
 */
class AuthRepository {
  /**
   * Creates a new user with individual profile in a transaction
   * @param {Object} userData - User data from the core users table
   * @param {Object} profileData - Individual profile data
   * @returns {Promise<Object>} Created user with profile
   */
  async createUserAndProfile(userData, profileData) {
    try {
      const result = await transaction(async (client) => {
        // Insert into users table
        const userQuery = `
          INSERT INTO users (email, "passwordHash", "userType", "isEmailVerified", "isActive")
          VALUES ($1, $2, $3, $4, $5)
          RETURNING "userId", email, "userType", "isEmailVerified", "isActive", "createdAt"
        `;

        const userValues = [
          userData.email,
          userData.passwordHash,
          userData.userType,
          userData.isEmailVerified,
          userData.isActive,
        ];

        const userResult = await client.query(userQuery, userValues);
        const user = userResult.rows[0];

        // Insert into individualProfiles table
        const profileQuery = `
          INSERT INTO "individualProfiles" (
            "userId", "firstName", "lastName", "phoneNumber", "profilePictureMediaId", "coverPictureMediaId", gender, 
            "dateOfBirth", country, city, address
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `;

        const profileValues = [
          user.userId,
          profileData.firstName,
          profileData.lastName,
          profileData.phoneNumber || null,
          null, // profilePictureMediaId - not included during registration
          null, // coverPictureMediaId - not included during registration
          profileData.gender || null,
          profileData.dateOfBirth || null,
          profileData.country || null,
          profileData.city || null,
          profileData.address || null,
        ];

        const profileResult = await client.query(profileQuery, profileValues);
        const profile = profileResult.rows[0];

        return {
          user: {
            userId: user.userId,
            email: user.email,
            userType: user.userType,
            isEmailVerified: user.isEmailVerified,
            isActive: user.isActive,
            createdAt: user.createdAt,
          },
          profile: {
            userId: profile.userId,
            firstName: profile.firstName,
            lastName: profile.lastName,
            phoneNumber: profile.phoneNumber,
            gender: profile.gender,
            dateOfBirth: profile.dateOfBirth,
            country: profile.country,
            city: profile.city,
            address: profile.address,
            createdAt: profile.createdAt,
          },
        };
      });

      logger.info(`User created successfully: ${result.user.email}`);
      return result;
    } catch (error) {
      logger.error("Failed to create user with profile", {
        error: error.message,
        email: userData.email,
      });

      // Handle specific database errors
      if (error.code === "23505") {
        if (error.constraint && error.constraint.includes("email")) {
          throw new ConflictError("Email address is already registered");
        }
        if (error.constraint && error.constraint.includes("phoneNumber")) {
          throw new ConflictError("Phone number is already registered");
        }
      }

      throw new DatabaseError("Failed to create user", error);
    }
  }

  /**
   * Creates an organization user and profile in a transaction
   * @param {Object} userData
   * @param {Object} profileData
   * @returns {Promise<Object>} Created user and profile
   */
  async createOrganizationUserAndProfile(userData, profileData, client = null) {
    try {
      const executor = client ? client : { query };
      // Insert into users table
      const userQuery = `
        INSERT INTO users (email, "passwordHash", "userType", "isEmailVerified", "isActive")
        VALUES ($1, $2, $3, $4, $5)
        RETURNING "userId", email, "userType", "isEmailVerified", "isActive", "createdAt"
      `;
      const userValues = [
        userData.email,
        userData.passwordHash,
        userData.userType,
        userData.isEmailVerified,
        userData.isActive,
      ];
      const userResult = await executor.query(userQuery, userValues);
      const user = userResult.rows[0];
      // Insert into organizationProfiles table
      const profileQuery = `
        INSERT INTO "organizationProfiles" (
          "userId", "organizationName", "organizationShortName", "organizationType", "officialEmail", "officialWebsiteUrl", "profilePictureMediaId", "coverPictureMediaId", address, "missionDescription", "establishmentDate", "campusAffiliationScope", "primaryContactPersonName", "primaryContactPersonEmail", "primaryContactPersonPhone", "createdByAdminId"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        ) RETURNING *
      `;
      const profileValues = [
        user.userId,
        profileData.organizationName,
        profileData.organizationShortName,
        profileData.organizationType,
        profileData.officialEmail,
        profileData.officialWebsiteUrl,
        profileData.profilePictureMediaId || null,
        profileData.coverPictureMediaId || null,
        profileData.address,
        profileData.missionDescription,
        profileData.establishmentDate,
        profileData.campusAffiliationScope,
        profileData.primaryContactPersonName,
        profileData.primaryContactPersonEmail,
        profileData.primaryContactPersonPhone,
        profileData.createdByAdminId,
      ];
      const profileResult = await executor.query(profileQuery, profileValues);
      const profile = profileResult.rows[0];
      return {
        user: {
          userId: user.userId,
          email: user.email,
          userType: user.userType,
          isEmailVerified: user.isEmailVerified,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
        profile,
      };
    } catch (error) {
      logger.error("Database error in createOrganizationUserAndProfile", {
        message: error.message,
        detail: error.detail, // Provides specific error info from Postgres
        code: error.code, // SQLSTATE error code
        constraint: error.constraint, // Name of the constraint that was violated
        stack: error.stack,
        profileData: profileData, // Log the data that was being inserted
      });
      throw new DatabaseError(
        "Failed to create organization user and profile",
        error
      );
    }
  }

  /**
   * Finds a user by userId
   * @param {string} userId - users id
   * @returns {Promise<object|null>} user object or null if not found
   *
   */

  async findById(userId) {
    try {
      const queryText = `
        SELECT 
          u."userId", u.email, u."passwordHash", u."userType", 
          u."isEmailVerified", u."isActive", u."createdAt", u."updatedAt"
        FROM users u
        WHERE u."userId" = $1 `;

      const result = await query(queryText, [userId]);

      if (result.rowCount === 0) {
        return null;
      }

      const user = result.rows[0];

      return {
        userId: user.userId,
        email: user.email,
        passwordHash: user.passwordHash,
        userType: user.userType,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      logger.error("Failed to find user by id", {
        error: error.message,
        userId,
      });

      throw new DatabaseError("Failed to find user", error);
    }
  }

  /**
   * Finds a user by email
   * @param {string} email - User's email address
   * @returns {Promise<Object|null>} User object or null if not found
   */
  async findByEmail(email) {
    try {
      const queryText = `
        SELECT 
          u."userId", u.email, u."passwordHash", u."userType", 
          u."isEmailVerified", u."isActive", u."createdAt", u."updatedAt"
        FROM users u
        WHERE u.email = $1
      `;

      const result = await query(queryText, [email]);

      if (result.rowCount === 0) {
        return null;
      }

      const user = result.rows[0];
      return {
        userId: user.userId,
        email: user.email,
        passwordHash: user.passwordHash,
        userType: user.userType,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      logger.error("Failed to find user by email", {
        error: error.message,
        email,
      });
      throw new DatabaseError("Failed to find user", error);
    }
  }

  /**
   * Updates user's email verification status
   * @param {string} userId - User's ID
   * @param {boolean} isVerified - Verification status
   * @returns {Promise<Object>} Updated user
   */
  async updateEmailVerification(userId, isVerified) {
    try {
      const queryText = `
        UPDATE users 
        SET "isEmailVerified" = $2, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = $1
        RETURNING "userId", email, "isEmailVerified", "updatedAt"
      `;

      const result = await query(queryText, [userId, isVerified]);

      if (result.rowCount === 0) {
        throw new NotFoundError("User");
      }

      const user = result.rows[0];
      return {
        userId: user.userId,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      logger.error("Failed to update email verification", {
        error: error.message,
        userId,
        isVerified,
      });

      if (error instanceof NotFoundError) {
        throw error;
      }

      throw new DatabaseError("Failed to update email verification", error);
    }
  }

  /**
   * Updates user's active status
   * @param {string} userId - User's ID
   * @param {boolean} isActive - Active status
   * @returns {Promise<Object>} Updated user
   */
  async updateUserStatus(userId, isActive) {
    try {
      const queryText = `
        UPDATE users 
        SET "isActive" = $2, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = $1
        RETURNING "userId", email, "isActive", "updatedAt"
      `;

      const result = await query(queryText, [userId, isActive]);

      if (result.rowCount === 0) {
        throw new NotFoundError("User");
      }

      const user = result.rows[0];
      return {
        userId: user.userId,
        email: user.email,
        isActive: user.isActive,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      logger.error("Failed to update user status", {
        error: error.message,
        userId,
        isActive,
      });

      if (error instanceof NotFoundError) {
        throw error;
      }

      throw new DatabaseError("Failed to update user status", error);
    }
  }

  /**
   * Checks if user email already exists
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} True if email exists, false otherwise
   */
  async emailExists(email) {
    try {
      const queryText = "SELECT 1 FROM users WHERE email = $1";
      const result = await query(queryText, [email]);
      return result.rowCount > 0;
    } catch (error) {
      logger.error("Failed to check email existence", {
        error: error.message,
        email,
      });
      throw new DatabaseError("Failed to check email existence", error);
    }
  }

  /**
   * Checks if phone number already exists
   * @param {string} phoneNumber - Phone number to check
   * @returns {Promise<boolean>} True if phone number exists, false otherwise
   */
  async phoneNumberExists(phoneNumber) {
    try {
      const queryText =
        'SELECT 1 FROM "individualProfiles" WHERE "phoneNumber" = $1';
      const result = await query(queryText, [phoneNumber]);
      return result.rowCount > 0;
    } catch (error) {
      logger.error("Failed to check phone number existence", {
        error: error.message,
        phoneNumber,
      });
      throw new DatabaseError("Failed to check phone number existence", error);
    }
  }

  // PASSWORD RESET TOKEN

  /**
   * Creates a password reset token for a user
   * @param {string} userId
   * @param {string} tokenHash
   * @param {Date} expiresAt
   * @returns {Promise<void>}
   */
  async createPasswordResetToken(userId, tokenHash, expiresAt) {
    try {
      const queryText = `
        INSERT INTO "passwordResetTokens" ("userId", "tokenHash", "expiresAt")
        VALUES ($1, $2, $3)
      `;
      await query(queryText, [userId, tokenHash, expiresAt]);
    } catch (error) {
      logger.error("Failed to create password reset token", {
        error: error.message,
        userId,
      });
      throw new DatabaseError("Failed to create password reset token", error);
    }
  }

  /**
   * Finds a user by password reset token (and checks expiry)
   * @param {string} tokenHash
   * @returns {Promise<Object|null>} User object or null
   */
  async findPasswordResetToken(tokenHash) {
    try {
      const queryText = `
        SELECT u.* FROM "passwordResetTokens" prt
        JOIN users u ON prt."userId" = u."userId"
        WHERE prt."tokenHash" = $1 AND prt."expiresAt" > NOW()
      `;
      const result = await query(queryText, [tokenHash]);
      if (result.rowCount === 0) return null;
      const user = result.rows[0];
      return {
        userId: user.userId,
        email: user.email,
        passwordHash: user.passwordHash,
        userType: user.userType,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      logger.error("Failed to find user by password reset token", {
        error: error.message,
      });
      throw new DatabaseError(
        "Failed to find user by password reset token",
        error
      );
    }
  }

  /**
   * Deletes a password reset token (by token hash)
   * @param {string} tokenHash
   * @returns {Promise<void>}
   */
  async deletePasswordResetToken(tokenHash) {
    try {
      const queryText = `
        DELETE FROM "passwordResetTokens" WHERE "tokenHash" = $1
      `;
      await query(queryText, [tokenHash]);
    } catch (error) {
      logger.error("Failed to delete password reset token", {
        error: error.message,
      });
      throw new DatabaseError("Failed to delete password reset token", error);
    }
  }

  /**
   * Deletes all password reset tokens for a user (by userId)
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async deletePasswordResetTokenByUserId(userId) {
    try {
      const queryText = `
        DELETE FROM "passwordResetTokens" WHERE "userId" = $1
      `;
      await query(queryText, [userId]);
    } catch (error) {
      logger.error("Failed to delete password reset token by userId", {
        error: error.message,
        userId,
      });
      throw new DatabaseError(
        "Failed to delete password reset token by userId",
        error
      );
    }
  }

  /**
   * Updates a user's password
   * @param {string} userId
   * @param {string} newPasswordHash
   * @returns {Promise<void>}
   */
  async updatePassword(userId, newPasswordHash) {
    try {
      const queryText = `
        UPDATE users
        SET "passwordHash" = $1, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = $2
      `;
      await query(queryText, [newPasswordHash, userId]);
    } catch (error) {
      logger.error("Failed to update user password", {
        error: error.message,
        userId,
      });
      throw new DatabaseError("Failed to update user password", error);
    }
  }

  // EMAIL VERIFICATION TOKEN
  /**
   * Creates an email verification token for a user
   * @param {string} userId
   * @param {string} tokenHash
   * @param {Date} expiresAt
   * @returns {Promise<void>}
   */
  async createEmailVerificationToken(userId, tokenHash, expiresAt) {
    try {
      const queryText = `
        INSERT INTO "emailVerificationTokens" ("userId", "tokenHash", "expiresAt")
        VALUES ($1, $2, $3)
      `;
      await query(queryText, [userId, tokenHash, expiresAt]);
    } catch (error) {
      logger.error("Failed to create email verification token", {
        error: error.message,
        userId,
      });
      throw new DatabaseError(
        "Failed to create email verification token",
        error
      );
    }
  }

  /**
   * Finds a user by email verification token (and checks expiry)
   * @param {string} tokenHash
   * @returns {Promise<Object|null>} User object or null
   */
  async findEmailVerificationToken(tokenHash) {
    try {
      const queryText = `
        SELECT u.* FROM "emailVerificationTokens" evt
        JOIN users u ON evt."userId" = u."userId"
        WHERE evt."tokenHash" = $1 AND evt."expiresAt" > NOW()
      `;
      const result = await query(queryText, [tokenHash]);
      if (result.rowCount === 0) return null;
      const user = result.rows[0];
      return {
        userId: user.userId,
        email: user.email,
        passwordHash: user.passwordHash,
        userType: user.userType,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      logger.error("Failed to find user by email verification token", {
        error: error.message,
      });
      throw new DatabaseError(
        "Failed to find user by email verification token",
        error
      );
    }
  }

  /**
   * Deletes an email verification token (by token hash)
   * @param {string} tokenHash
   * @returns {Promise<void>}
   */
  async deleteEmailVerificationToken(tokenHash) {
    try {
      const queryText = `
        DELETE FROM "emailVerificationTokens" WHERE "tokenHash" = $1
      `;
      await query(queryText, [tokenHash]);
    } catch (error) {
      logger.error("Failed to delete email verification token", {
        error: error.message,
      });
      throw new DatabaseError(
        "Failed to delete email verification token",
        error
      );
    }
  }

  /**
   * Deletes all email verification tokens for a user (by userId)
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async deleteEmailVerificationTokenByUserId(userId) {
    try {
      const queryText = `
        DELETE FROM "emailVerificationTokens" WHERE "userId" = $1
      `;
      await query(queryText, [userId]);
    } catch (error) {
      logger.error("Failed to delete email verification token by userId", {
        error: error.message,
        userId,
      });
      throw new DatabaseError(
        "Failed to delete email verification token by userId",
        error
      );
    }
  }

  // REFRESH TOKEN

  /**
   * Creates a refresh token for a user
   * @param {string} userId
   * @param {string} tokenHash
   * @param {Date} expiresAt
   * @returns {Promise<void>}
   */
  async createRefreshToken(userId, tokenHash, expiresAt) {
    try {
      const queryText = `
        INSERT INTO "refreshTokens" ("userId", "tokenHash", "expiresAt")
        VALUES ($1, $2, $3)
      `;
      await query(queryText, [userId, tokenHash, expiresAt]);
    } catch (error) {
      logger.error("Failed to create refresh token", {
        error: error.message,
        userId,
      });
      throw new DatabaseError("Failed to create refresh token", error);
    }
  }

  /**
   * Finds a user by refresh token (and checks expiry)
   * @param {string} tokenHash
   * @returns {Promise<Object|null>} User object or null
   */
  async findRefreshToken(tokenHash) {
    try {
      const queryText = `
        SELECT u.* FROM "refreshTokens" rt
        JOIN users u ON rt."userId" = u."userId"
        WHERE rt."tokenHash" = $1 AND rt."expiresAt" > NOW()
      `;
      const result = await query(queryText, [tokenHash]);
      if (result.rowCount === 0) return null;
      const user = result.rows[0];
      return {
        userId: user.userId,
        email: user.email,
        passwordHash: user.passwordHash,
        userType: user.userType,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      logger.error("Failed to find user by refresh token", {
        error: error.message,
      });
      throw new DatabaseError("Failed to find user by refresh token", error);
    }
  }

  /**
   * Deletes a refresh token (by token hash)
   * @param {string} tokenHash
   * @returns {Promise<void>}
   */
  async deleteRefreshToken(tokenHash) {
    try {
      const queryText = `
        DELETE FROM "refreshTokens" WHERE "tokenHash" = $1
      `;
      await query(queryText, [tokenHash]);
    } catch (error) {
      logger.error("Failed to delete refresh token", { error: error.message });
      throw new DatabaseError("Failed to delete refresh token", error);
    }
  }

  /**
   * Deletes all refresh tokens for a user (optional, for logout all)
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async deleteAllRefreshTokensForUser(userId) {
    try {
      const queryText = `
        DELETE FROM "refreshTokens" WHERE "userId" = $1
      `;
      await query(queryText, [userId]);
    } catch (error) {
      logger.error("Failed to delete all refresh tokens for user", {
        error: error.message,
        userId,
      });
      throw new DatabaseError(
        "Failed to delete all refresh tokens for user",
        error
      );
    }
  }

  // PASSWORD SETUP TOKEN

  /**
   * Creates a password setup token for a user (organizational activation)
   * @param {string} userId
   * @param {string} tokenHash
   * @param {Date} expiresAt
   * @returns {Promise<void>}
   */
  async createPasswordSetupToken(userId, tokenHash, expiresAt) {
    try {
      const queryText = `
        INSERT INTO "passwordSetupTokens" ("userId", "tokenHash", "expiresAt")
        VALUES ($1, $2, $3)
      `;
      await query(queryText, [userId, tokenHash, expiresAt]);
    } catch (error) {
      throw new DatabaseError("Failed to create password setup token", error);
    }
  }

  /**
   * Finds a user by password setup token (and checks expiry)
   * @param {string} tokenHash
   * @returns {Promise<Object|null>} User object or null
   */
  async findPasswordSetupToken(tokenHash) {
    try {
      const queryText = `
        SELECT u.* FROM "passwordSetupTokens" pst
        JOIN users u ON pst."userId" = u."userId"
        WHERE pst."tokenHash" = $1 AND pst."expiresAt" > NOW()
      `;
      const result = await query(queryText, [tokenHash]);
      if (result.rowCount === 0) return null;
      const user = result.rows[0];
      return {
        userId: user.userId,
        email: user.email,
        passwordHash: user.passwordHash,
        userType: user.userType,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      throw new DatabaseError(
        "Failed to find user by password setup token",
        error
      );
    }
  }

  /**
   * Deletes a password setup token (by token hash)
   * @param {string} tokenHash
   * @returns {Promise<void>}
   */
  async deletePasswordSetupToken(tokenHash) {
    try {
      const queryText = `
        DELETE FROM "passwordSetupTokens" WHERE "tokenHash" = $1
      `;
      await query(queryText, [tokenHash]);
    } catch (error) {
      throw new DatabaseError("Failed to delete password setup token", error);
    }
  }

  /**
   * Updates user's password and activates account (for org user activation)
   * @param {string} userId
   * @param {string} newPasswordHash
   * @returns {Promise<void>}
   */
  async updateUserPasswordAndActivate(userId, newPasswordHash) {
    try {
      const queryText = `
        UPDATE users
        SET "passwordHash" = $1, "isEmailVerified" = TRUE, "isActive" = TRUE, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = $2
      `;
      await query(queryText, [newPasswordHash, userId]);
    } catch (error) {
      throw new DatabaseError(
        "Failed to update user password and activate",
        error
      );
    }
  }

  /**
   * Creates a media record in the media table
   * @param {Object} mediaData
   * @returns {Promise<void>}
   */
  async createMediaRecord(
    {
      mediaId,
      entityType,
      entityId,
      mediaType,
      fileName,
      fileSize,
      description,
      altText,
      uploadedByUserId,
    },
    client = null
  ) {
    try {
      const executor = client ? client : { query };
      const queryText = `
        INSERT INTO media ("mediaId", "entityType", "entityId", "mediaType", "fileName", "fileSize", "description", "altText", "uploadedByUserId")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      await executor.query(queryText, [
        mediaId,
        entityType,
        entityId,
        mediaType,
        fileName,
        fileSize,
        description,
        altText,
        uploadedByUserId,
      ]);
    } catch (error) {
      logger.error("Failed to create media record", { error: error.message });
      throw new DatabaseError("Failed to create media record", error);
    }
  }

  /**
   * Updates the entityId of a media record (used after org user creation)
   * @param {string} mediaId
   * @param {string} entityId
   * @param {object} client - DB client (transaction)
   * @returns {Promise<void>}
   */
  async updateMediaEntityId(mediaId, entityId, client = null) {
    try {
      const executor = client ? client : { query };
      const queryText = `
        UPDATE "media"
        SET "entityId" = $1
        WHERE "mediaId" = $2
      `;
      await executor.query(queryText, [entityId, mediaId]);
    } catch (error) {
      logger.error("Failed to update media entityId", {
        error: error.message,
        mediaId,
        entityId,
      });
      throw new DatabaseError("Failed to update media entityId", error);
    }
  }
}

export default new AuthRepository();
