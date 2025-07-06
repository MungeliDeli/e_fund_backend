/**
 * Authentication Repository Module
 * 
 * This module handles all database operations related to authentication and user management.
 * It serves as the data access layer that abstracts database interactions and provides
 * a clean interface for the service layer to interact with the database.
 * 
 * DATABASE OPERATIONS:
 * - User CRUD operations (Create, Read, Update)
 * - Profile management for individual and organization users
 * - Token management (verification, reset, refresh, setup tokens)
 * - Email and phone number existence checks
 * - Password updates and account status changes
 * 
 * TRANSACTION MANAGEMENT:
 * - Atomic operations for user and profile creation
 * - Rollback capabilities for failed operations
 * - Data consistency maintenance
 * 
 * TOKEN MANAGEMENT:
 * - Email verification tokens (24-hour expiry)
 * - Password reset tokens (20-minute expiry)
 * - Refresh tokens (30-day expiry)
 * - Password setup tokens (48-hour expiry)
 * - Token cleanup and invalidation
 * 
 * SECURITY FEATURES:
 * - Token hashing using SHA-256
 * - Secure token storage and retrieval
 * - Token expiration validation
 * - User status verification
 * 
 * DATA VALIDATION:
 * - User existence checks
 * - Email uniqueness validation
 * - Phone number uniqueness validation
 * - Official email uniqueness for organizations
 * 
 * ERROR HANDLING:
 * - Database constraint violation handling
 * - Custom error types for different scenarios
 * - Comprehensive error logging
 * - Graceful error propagation
 * 
 * TABLES INTERACTED:
 * - users: Core user information
 * - individual_profiles: Individual user profile data
 * - organization_profiles: Organization user profile data
 * - email_verification_tokens: Email verification tokens
 * - password_reset_tokens: Password reset tokens
 * - refresh_tokens: JWT refresh tokens
 * - password_setup_tokens: Organization user setup tokens
 * 
 * DEPENDENCIES:
 * - Database connection pool (pg)
 * - Custom error classes (DatabaseError, ConflictError, NotFoundError)
 * - Logger for operation tracking
 * - Transaction utility for atomic operations
 * 
 * @author Your Name
 * @version 1.0.0
 * @since 2024
 */

import { query, transaction } from "../../db/index.js";
import { DatabaseError, ConflictError, NotFoundError } from "../../utils/appError.js";
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
          INSERT INTO users (email, password_hash, user_type, is_email_verified, is_active)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING user_id, email, user_type, is_email_verified, is_active, created_at
        `;
        
        const userValues = [
          userData.email,
          userData.passwordHash,
          userData.userType,
          userData.isEmailVerified,
          userData.isActive
        ];

        const userResult = await client.query(userQuery, userValues);
        const user = userResult.rows[0];

        // Insert into individual_profiles table
        const profileQuery = `
          INSERT INTO individual_profiles (
            user_id, first_name, last_name, phone_number, gender, 
            date_of_birth, country, city, address
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `;

        const profileValues = [
          user.user_id,
          profileData.firstName,
          profileData.lastName,
          profileData.phoneNumber || null,
          profileData.gender || null,
          profileData.dateOfBirth || null,
          profileData.country || null,
          profileData.city || null,
          profileData.address || null
        ];

        const profileResult = await client.query(profileQuery, profileValues);
        const profile = profileResult.rows[0];

        return {
          user: {
            userId: user.user_id,
            email: user.email,
            userType: user.user_type,
            isEmailVerified: user.is_email_verified,
            isActive: user.is_active,
            createdAt: user.created_at
          },
          profile: {
            userId: profile.user_id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            phoneNumber: profile.phone_number,
            gender: profile.gender,
            dateOfBirth: profile.date_of_birth,
            country: profile.country,
            city: profile.city,
            address: profile.address,
            createdAt: profile.created_at
          }
        };
      });

      logger.info(`User created successfully: ${result.user.email}`);
      return result;
    } catch (error) {
      logger.error("Failed to create user with profile", {
        error: error.message,
        email: userData.email
      });

      // Handle specific database errors
      if (error.code === "23505") {
        if (error.constraint && error.constraint.includes("email")) {
          throw new ConflictError("Email address is already registered");
        }
        if (error.constraint && error.constraint.includes("phone_number")) {
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
  async createOrganizationUserAndProfile(userData, profileData) {
    try {
      const result = await transaction(async (client) => {
        // Insert into users table
        const userQuery = `
          INSERT INTO users (email, password_hash, user_type, is_email_verified, is_active)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING user_id, email, user_type, is_email_verified, is_active, created_at
        `;
        const userValues = [
          userData.email,
          userData.passwordHash,
          userData.userType,
          userData.isEmailVerified,
          userData.isActive
        ];
        const userResult = await client.query(userQuery, userValues);
        const user = userResult.rows[0];
        // Insert into organization_profiles table
        const profileQuery = `
          INSERT INTO organization_profiles (
            user_id, organization_name, organization_short_name, organization_type, official_email, official_website_url, profile_picture, cover_picture, address, mission_description, establishment_date, campus_affiliation_scope, affiliated_schools_names, affiliated_department_names, primary_contact_person_name, primary_contact_person_email, primary_contact_person_phone, created_by_admin_id
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
          ) RETURNING *
        `;
        const profileValues = [
          user.user_id,
          profileData.organizationName,
          profileData.organizationShortName,
          profileData.organizationType,
          profileData.officialEmail,
          profileData.officialWebsiteUrl,
          profileData.profilePicture,
          profileData.coverPicture,
          profileData.address,
          profileData.missionDescription,
          profileData.establishmentDate,
          profileData.campusAffiliationScope,
          profileData.affiliatedSchoolsNames,
          profileData.affiliatedDepartmentNames,
          profileData.primaryContactPersonName,
          profileData.primaryContactPersonEmail,
          profileData.primaryContactPersonPhone,
          profileData.createdByAdminId
        ];
        const profileResult = await client.query(profileQuery, profileValues);
        const profile = profileResult.rows[0];
        return {
          user: {
            userId: user.user_id,
            email: user.email,
            userType: user.user_type,
            isEmailVerified: user.is_email_verified,
            isActive: user.is_active,
            createdAt: user.created_at
          },
          profile
        };
      });
      return result;
    } catch (error) {
      throw new DatabaseError("Failed to create organization user and profile", error);
    }
  }

  /**
   * Finds a user by userId
   * @param {string} userId - users id
   * @returns {Promise<object|null>} user object or null if not found 
   *
   */

  async findById(userId){
    try {
      const queryText = `
        SELECT 
          u.user_id, u.email, u.password_hash, u.user_type, 
          u.is_email_verified, u.is_active, u.created_at, u.updated_at
        FROM users u
        WHERE u.user_id = $1 `;

        const result = await query(queryText , [userId]);

        if(result.rowCount === 0 ){
          return null
        }

        const user = result.rows[0];

        return {
          userId: user.user_id,
          email: user.email,
          passwordHash: user.password_hash,
          userType: user.user_type,
          isEmailVerified: user.is_email_verified,
          isActive: user.is_active,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        };



    } catch (error) {
      
      logger.error("Failed to find user by id", 
        {error:error.message, 
          userId
        });

        throw new DatabaseError("Failed to find user" , error)
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
          u.user_id, u.email, u.password_hash, u.user_type, 
          u.is_email_verified, u.is_active, u.created_at, u.updated_at
        FROM users u
        WHERE u.email = $1
      `;

      const result = await query(queryText, [email]);

      if (result.rowCount === 0) {
        return null;
      }

      const user = result.rows[0];
      return {
        userId: user.user_id,
        email: user.email,
        passwordHash: user.password_hash,
        userType: user.user_type,
        isEmailVerified: user.is_email_verified,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    } catch (error) {
      logger.error("Failed to find user by email", {
        error: error.message,
        email
      });
      throw new DatabaseError("Failed to find user", error);
    }
  }

  /**
   * Finds a user by ID with their individual profile
   * @param {string} userId - User's ID
   * @returns {Promise<Object|null>} User with profile or null if not found
   */
  async findByIdWithProfile(userId) {
    try {
      const queryText = `
        SELECT 
          u.user_id, u.email, u.user_type, u.is_email_verified, 
          u.is_active, u.created_at, u.updated_at,
          ip.first_name, ip.last_name, ip.phone_number, ip.gender,
          ip.date_of_birth, ip.country, ip.city, ip.address,
          ip.created_at as profile_created_at, ip.updated_at as profile_updated_at
        FROM users u
        LEFT JOIN individual_profiles ip ON u.user_id = ip.user_id
        WHERE u.user_id = $1
      `;

      const result = await query(queryText, [userId]);

      if (result.rowCount === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        user: {
          userId: row.user_id,
          email: row.email,
          userType: row.user_type,
          isEmailVerified: row.is_email_verified,
          isActive: row.is_active,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        },
        profile: row.first_name ? {
          userId: row.user_id,
          firstName: row.first_name,
          lastName: row.last_name,
          phoneNumber: row.phone_number,
          gender: row.gender,
          dateOfBirth: row.date_of_birth,
          country: row.country,
          city: row.city,
          address: row.address,
          createdAt: row.profile_created_at,
          updatedAt: row.profile_updated_at
        } : null
      };
    } catch (error) {
      logger.error("Failed to find user by ID with profile", {
        error: error.message,
        userId
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
        SET is_email_verified = $2, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        RETURNING user_id, email, is_email_verified, updated_at
      `;

      const result = await query(queryText, [userId, isVerified]);

      if (result.rowCount === 0) {
        throw new NotFoundError("User");
      }

      const user = result.rows[0];
      return {
        userId: user.user_id,
        email: user.email,
        isEmailVerified: user.is_email_verified,
        updatedAt: user.updated_at
      };
    } catch (error) {
      logger.error("Failed to update email verification", {
        error: error.message,
        userId,
        isVerified
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
        SET is_active = $2, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        RETURNING user_id, email, is_active, updated_at
      `;

      const result = await query(queryText, [userId, isActive]);

      if (result.rowCount === 0) {
        throw new NotFoundError("User");
      }

      const user = result.rows[0];
      return {
        userId: user.user_id,
        email: user.email,
        isActive: user.is_active,
        updatedAt: user.updated_at
      };
    } catch (error) {
      logger.error("Failed to update user status", {
        error: error.message,
        userId,
        isActive
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
        email
      });
      throw new DatabaseError("Failed to check email existence", error);
    }
  }

 /**
   * Checks if official email already exists
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} True if email exists, false otherwise
   */
 async OfficialEmailExists(email) {
  try {
    const queryText = "SELECT 1 FROM organization_profiles WHERE email = $1";
    const result = await query(queryText, [email]);
    return result.rowCount > 0;
  } catch (error) {
    logger.error("Failed to check email existence", {
      error: error.message,
      email
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
      const queryText = "SELECT 1 FROM individual_profiles WHERE phone_number = $1";
      const result = await query(queryText, [phoneNumber]);
      return result.rowCount > 0;
    } catch (error) {
      logger.error("Failed to check phone number existence", {
        error: error.message,
        phoneNumber
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
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
      `;
      await query(queryText, [userId, tokenHash, expiresAt]);
    } catch (error) {
      logger.error("Failed to create password reset token", { error: error.message, userId });
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
        SELECT u.* FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.user_id
        WHERE prt.token_hash = $1 AND prt.expires_at > NOW()
      `;
      const result = await query(queryText, [tokenHash]);
      if (result.rowCount === 0) return null;
      const user = result.rows[0];
      return {
        userId: user.user_id,
        email: user.email,
        passwordHash: user.password_hash,
        userType: user.user_type,
        isEmailVerified: user.is_email_verified,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    } catch (error) {
      logger.error("Failed to find user by password reset token", { error: error.message });
      throw new DatabaseError("Failed to find user by password reset token", error);
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
        DELETE FROM password_reset_tokens WHERE token_hash = $1
      `;
      await query(queryText, [tokenHash]);
    } catch (error) {
      logger.error("Failed to delete password reset token", { error: error.message });
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
        DELETE FROM password_reset_tokens WHERE user_id = $1
      `;
      await query(queryText, [userId]);
    } catch (error) {
      logger.error("Failed to delete password reset token by userId", { error: error.message, userId });
      throw new DatabaseError("Failed to delete password reset token by userId", error);
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
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
      `;
      await query(queryText, [newPasswordHash, userId]);
    } catch (error) {
      logger.error("Failed to update user password", { error: error.message, userId });
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
  async  createEmailVerificationToken(userId, tokenHash, expiresAt) {
    try {
      const queryText = `
        INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
      `;
      await query(queryText, [userId, tokenHash, expiresAt]);
    } catch (error) {
      logger.error("Failed to create email verification token", { error: error.message, userId });
      throw new DatabaseError("Failed to create email verification token", error);
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
        SELECT u.* FROM email_verification_tokens evt
        JOIN users u ON evt.user_id = u.user_id
        WHERE evt.token_hash = $1 AND evt.expires_at > NOW()
      `;
      const result = await query(queryText, [tokenHash]);
      if (result.rowCount === 0) return null;
      const user = result.rows[0];
      return {
        userId: user.user_id,
        email: user.email,
        passwordHash: user.password_hash,
        userType: user.user_type,
        isEmailVerified: user.is_email_verified,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    } catch (error) {
      logger.error("Failed to find user by email verification token", { error: error.message });
      throw new DatabaseError("Failed to find user by email verification token", error);
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
        DELETE FROM email_verification_tokens WHERE token_hash = $1
      `;
      await query(queryText, [tokenHash]);
    } catch (error) {
      logger.error("Failed to delete email verification token", { error: error.message });
      throw new DatabaseError("Failed to delete email verification token", error);
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
        DELETE FROM email_verification_tokens WHERE user_id = $1
      `;
      await query(queryText, [userId]);
    } catch (error) {
      logger.error("Failed to delete email verification token by userId", { error: error.message, userId });
      throw new DatabaseError("Failed to delete email verification token by userId", error);
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
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
      `;
      await query(queryText, [userId, tokenHash, expiresAt]);
    } catch (error) {
      logger.error("Failed to create refresh token", { error: error.message, userId });
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
        SELECT u.* FROM refresh_tokens rt
        JOIN users u ON rt.user_id = u.user_id
        WHERE rt.token_hash = $1 AND rt.expires_at > NOW()
      `;
      const result = await query(queryText, [tokenHash]);
      if (result.rowCount === 0) return null;
      const user = result.rows[0];
      return {
        userId: user.user_id,
        email: user.email,
        passwordHash: user.password_hash,
        userType: user.user_type,
        isEmailVerified: user.is_email_verified,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    } catch (error) {
      logger.error("Failed to find user by refresh token", { error: error.message });
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
        DELETE FROM refresh_tokens WHERE token_hash = $1
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
        DELETE FROM refresh_tokens WHERE user_id = $1
      `;
      await query(queryText, [userId]);
    } catch (error) {
      logger.error("Failed to delete all refresh tokens for user", { error: error.message, userId });
      throw new DatabaseError("Failed to delete all refresh tokens for user", error);
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
        INSERT INTO password_setup_tokens (user_id, token_hash, expires_at)
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
        SELECT u.* FROM password_setup_tokens pst
        JOIN users u ON pst.user_id = u.user_id
        WHERE pst.token_hash = $1 AND pst.expires_at > NOW()
      `;
      const result = await query(queryText, [tokenHash]);
      if (result.rowCount === 0) return null;
      const user = result.rows[0];
      return {
        userId: user.user_id,
        email: user.email,
        passwordHash: user.password_hash,
        userType: user.user_type,
        isEmailVerified: user.is_email_verified,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    } catch (error) {
      throw new DatabaseError("Failed to find user by password setup token", error);
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
        DELETE FROM password_setup_tokens WHERE token_hash = $1
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
        SET password_hash = $1, is_email_verified = TRUE, is_active = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
      `;
      await query(queryText, [newPasswordHash, userId]);
    } catch (error) {
      throw new DatabaseError("Failed to update user password and activate", error);
    }
  }
}

export default new AuthRepository();
