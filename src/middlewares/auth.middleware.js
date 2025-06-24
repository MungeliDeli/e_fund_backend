import { verifyToken } from "../utils/jwt.utils.js";
import { AuthenticationError, AuthorizationError } from "../utils/appError.js";
import authRepository from "../modules/auth/auth.repository.js";
import { catchAsync } from "./errorHandler.js";
import logger from "../utils/logger.js";

/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user data to request object
 */

/**
 * Middleware to authenticate requests using JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticate = catchAsync(async (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Access token is required');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Verify the token
  const decoded = verifyToken(token);

  // Get user from database to ensure they still exist and are active
  const user = await authRepository.findById(decoded.userId);
  
  if (!user || !user.isActive) {
    throw new AuthenticationError('User not found or account deactivated');
  }

  // Attach user data to request object
  req.user = {
    userId: user.userId,
    email: user.email,
    userType: user.userType,
    isEmailVerified: user.isEmailVerified,
    isActive: user.isActive
  };

  // Log successful authentication
  logger.debug('User authenticated', {
    userId: user.userId,
    email: user.email,
    userType: user.userType,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  next();
});

/**
 * Middleware to require email verification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const requireEmailVerification = (req, res, next) => {
  if (!req.user || !req.user.isEmailVerified) {
    return next(new AuthorizationError('Email verification required'));
  }
  next();
};

/**
 * Middleware to restrict access to specific user types
 * @param {...string} allowedUserTypes - Array of allowed user types
 * @returns {Function} Middleware function
 */
export const restrictTo = (...allowedUserTypes) => {
  return (req, res, next) => {
    if (!req.user || !allowedUserTypes.includes(req.user.userType)) {
      return next(new AuthorizationError('Access denied. Insufficient privileges'));
    }
    next();
  };
};

/**
 * Middleware to restrict access to individual users only
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const requireIndividualUser = restrictTo('individual_user');

/**
 * Middleware to restrict access to organization users only
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const requireOrganizationUser = restrictTo('organization_user');

/**
 * Middleware to restrict access to admin users only
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const requireAdmin = restrictTo(
  'super_admin',
  'support_admin',
  'event_moderator',
  'financial_admin'
);

/**
 * Middleware to restrict access to super admin only
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const requireSuperAdmin = restrictTo('super_admin');

/**
 * Optional authentication middleware
 * Attaches user data if token is provided, but doesn't require it
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const optionalAuth = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Continue without authentication
  }

  try {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    const user = await authRepository.findById(decoded.userId);
    
    if (user && user.isActive) {
      req.user = {
        userId: user.userId,
        email: user.email,
        userType: user.userType,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive
      };
    }
  } catch (error) {
    // Continue without authentication if token is invalid
    logger.debug('Optional auth failed, continuing without authentication', {
      error: error.message,
      ip: req.ip,
      url: req.originalUrl
    });
  }

  next();
});

/**
 * Middleware to ensure user can only access their own resources
 * @param {string} resourceUserIdParam - Parameter name containing the user ID
 * @returns {Function} Middleware function
 */
export const requireOwnership = (resourceUserIdParam = 'userId') => {
  return (req, res, next) => {
    const resourceUserId = req.params[resourceUserIdParam];
    
    if (req.user.userId !== resourceUserId) {
      return next(new AuthorizationError('Access denied. You can only access your own resources'));
    }
    next();
  };
}; 