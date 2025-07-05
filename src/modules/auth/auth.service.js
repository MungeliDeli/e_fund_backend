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
import { sendVerificationEmail, sendPasswordResetEmail, sendSetupEmail } from "../../utils/email.utils.js";




/**
 * Authentication Service
 * Contains business logic for authentication and user management
 */
class AuthService {


// INDIVIDUAL USER CREATION

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

      
      const emailExists = await authRepository.emailExists(email);
      if (emailExists) {
        throw new ConflictError("Email address is already registered");
      }

      
      if (phoneNumber) {
        const phoneExists = await authRepository.phoneNumberExists(phoneNumber);
        if (phoneExists) {
          throw new ConflictError("Phone number is already registered");
        }
      }

      
      const passwordHash = await hashPassword(password);

      
      const userData = {
        email: email.toLowerCase().trim(),
        passwordHash,
        userType: "individual_user",
        isEmailVerified: false,
        isActive: false
      };

      
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

      
      const result = await authRepository.createUserAndProfile(userData, profileData);

      
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationTokenHash = createHash("sha256").update(verificationToken).digest("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); 
      await authRepository.createEmailVerificationToken(result.user.userId, verificationTokenHash, expiresAt);

       
      sendVerificationEmail(email, verificationToken)
        .then(() => {
          logger.info(`Verification email sent successfully to ${email} in background.`);
        })
        .catch(emailError => {
          logger.error(`Failed to send verification email to ${email} in background: ${emailError.message}`, {
            userId: result.user.userId,
            email: result.user.email,
            error: emailError
          });
          
          
        });

      logger.info("Individual user registered successfully (pending email verification) - Email sending initiated in background.", {
        userId: result.user.userId,
        email: result.user.email
      });


      return {
        user: result.user,
        profile: result.profile,
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
      // Delete all email verification tokens for this user (cleanup)
      await authRepository.deleteEmailVerificationTokenByUserId(user.userId);
  
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


  // ORGANIZATION USER CREATION


   /**
   * Admin creates an organization user and sends invite
   * @param {Object} userData
   * @param {Object} profileData
   * @returns {Promise<Object>} Created user, profile, and raw setup token
   */
   async createOrganizationUserAndInvite(registrationData , createdByAdminId) {
 

    const { 
      email,
      organizationName,
      organizationShortName,
      organizationType,
      officialEmail,
      officialWebsiteUrl,
      profilePicture,
      coverPicture,
      address,
      missionDescription,
      establishmentDate,
      campusAffiliationScope,
      affiliatedSchoolsNames,
      affiliatedDepartmentNames,
      primaryContactPersonName,
      primaryContactPersonEmail,
      primaryContactPersonPhone,
    } = registrationData;



    const emailExists = await authRepository.emailExists(email);
    if(emailExists){
      throw new ConflictError("Email address is alread registered")
    }

    if(officialEmail){
      const officialEmailExists = await authRepository.OfficialEmailExists(officialEmail);
      if(officialEmailExists){
        throw new ConflictError("Organizations officail Email already Exists")
      }
    }
    

    

    // prepareing user data
    const userData = {
      email: email.toLowerCase().trim(),
      passwordHash: 'placeholder', 
      userType: 'organization_user',
      isEmailVerified: false,
      isActive: false
    };

    // preparing profile data

    const profileData = {
      organizationName : organizationName.trim(),
      organizationShortName: organizationShortName? organizationShortName.trim() : null,
      organizationType: organizationType.trim(),
      officialEmail: officialEmail? officialEmail.toLowerCase().trim() : null,
      officialWebsiteUrl: officialWebsiteUrl? officialWebsiteUrl.trim() : null,
      profilePicture: profilePicture? profilePicture.trim() : null,
      coverPicture: coverPicture? coverPicture.trim() : null,
      address: address? address.trim() : null,
      missionDescription: missionDescription? missionDescription.trim() : null,
      establishmentDate: establishmentDate? establishmentDate.trim() : null,
      campusAffiliationScope: campusAffiliationScope? campusAffiliationScope.trim() : null,
      affiliatedSchoolsNames: affiliatedSchoolsNames? affiliatedSchoolsNames.trim() : null,
      affiliatedDepartmentNames: affiliatedDepartmentNames? affiliatedDepartmentNames.trim() : null,
      primaryContactPersonName: primaryContactPersonName? primaryContactPersonName.trim() : null,
      primaryContactPersonEmail: primaryContactPersonEmail? primaryContactPersonEmail.trim() : null,
      primaryContactPersonPhone: primaryContactPersonPhone? primaryContactPersonPhone.trim() : null,
      createdByAdminId: createdByAdminId
    }
    
    const result = await authRepository.createOrganizationUserAndProfile(userData, profileData);
    
    const setupToken = crypto.randomBytes(48).toString('hex');
    const setupTokenHash = createHash('sha256').update(setupToken).digest('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
    await authRepository.createPasswordSetupToken(result.user.userId, setupTokenHash, expiresAt);
      
    sendSetupEmail(userData.email, setupToken)
      .then(() => {
        logger.info(`Setup email sent successfully to ${userData.email} in background.`);
      })
      .catch(emailError => {
        logger.error(`Failed to send setup email to ${userData.email} in background: ${emailError.message}`, {
          userId: result.user.userId,

        })
      });

    logger.info(`Organization user created successfully (pending verification )`, {
      userId: result.user.userId,
      email: result.user.email,
      organizationName: result.profile.organizationName,
      
    });
    return {
      user: result.user,
      profile: result.profile,
      setupToken // REMOVE in production
    };
  }

  /**
   * Organizational user activates account and sets password
   * @param {string} token
   * @param {string} newPassword
   * @returns {Promise<Object>} JWT and refreshToken for auto-login
   */
  async activateAndSetPassword(token, newPassword) {
    const setupTokenHash = createHash('sha256').update(token).digest('hex');
    const user = await authRepository.findPasswordSetupToken(setupTokenHash);
    if (!user || user.isEmailVerified || user.isActive) {
      throw new AuthenticationError('Activation link is invalid or has expired. Please contact your administrator.');
    }
    const newPasswordHash = await hashPassword(newPassword);
    await authRepository.updateUserPasswordAndActivate(user.userId, newPasswordHash);
    await authRepository.deletePasswordSetupToken(setupTokenHash);
    // Issue JWT and refresh token for auto-login
    const jwt = signToken({
      userId: user.userId,
      email: user.email,
      userType: user.userType
    });
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await authRepository.createRefreshToken(user.userId, refreshTokenHash, refreshExpiresAt);
    return {
      token: jwt,
      refreshToken
    };
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
      // Delete any existing password reset tokens for this user
      await authRepository.deletePasswordResetTokenByUserId(user.userId);
      
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = createHash("sha256").update(resetToken).digest("hex");
      const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // 20 min
      await authRepository.createPasswordResetToken(user.userId, resetTokenHash, expiresAt);
    
      sendPasswordResetEmail(email, resetToken)
        .then(() => {
          logger.info(`Password Reset email sent successfully to ${email}`);
        })
        .catch(emailError => {
          logger.error(`Failed to send password reset email to ${email}: ${emailError.message}`, {
            userId: user.userId,
            email: user.email,
            error: emailError
          });
        });
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
    // Delete all password reset tokens for this user (cleanup)
    await authRepository.deletePasswordResetTokenByUserId(user.userId);
    return { message: "Password has been reset successfully." };
  }

  /**
   * Resends email verification link for unverified users
   * @param {string} email
   * @returns {Promise<void>}
   */
  async resendVerificationEmail(email) {
    // Find user by email
    const user = await authRepository.findByEmail(email.toLowerCase().trim());
    if (!user || user.isEmailVerified) {
      // For security, do not reveal if user exists or is already verified
      return;
    }
    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenHash = createHash("sha256").update(verificationToken).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    // Remove any existing token for this user (optional, for safety)
    await authRepository.deleteEmailVerificationTokenByUserId(user.userId);
    // Insert new token
    await authRepository.createEmailVerificationToken(user.userId, verificationTokenHash, expiresAt);
    // Send email
    await sendVerificationEmail(user.email, verificationToken);
    logger.info("Resent verification email", { userId: user.userId, email: user.email });
  }

}

export default new AuthService(); 