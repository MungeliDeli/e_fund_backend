/**
 * Audit Context Middleware
 *
 * Sets up global request context for audit logging across the application.
 * This middleware ensures that audit logging functions can access request
 * information even when called from service layers.
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

/**
 * Middleware to set global request context for audit logging
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const setAuditContext = (req, res, next) => {
  // Set global request context for audit logging
  global.req = req;

  // Clean up global context after response is sent
  res.on("finish", () => {
    delete global.req;
  });

  next();
};

export default setAuditContext;
