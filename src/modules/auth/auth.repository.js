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
  async createUserWithProfile(userData, profileData) {
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
   * Checks if email already exists
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
}

export default new AuthRepository();
