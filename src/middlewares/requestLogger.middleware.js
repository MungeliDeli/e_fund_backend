import logger from '../utils/logger.js';

const requestCounts = {};

/**
 * Middleware to log the number of requests for each route.
 * It maintains an in-memory count for each endpoint.
 */
export const logRequestCount = (req, res, next) => {
  // Construct a unique key for the route using the method and path
  const routeKey = `${req.method} ${req.originalUrl.split('?')[0]}`;

  // Initialize or increment the counter for the route
  requestCounts[routeKey] = (requestCounts[routeKey] || 0) + 1;

  // Log the request count
  logger.info(`Request #${requestCounts[routeKey]} to ${routeKey}`);

  next();
};
