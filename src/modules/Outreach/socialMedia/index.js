/**
 * Social Media Module Index
 *
 * Exports all social media module components for easy importing.
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

export { default as socialMediaRoutes } from "./socialMedia.routes.js";
export {
  generateSocialMediaLinks,
  getSocialMediaStats,
} from "./socialMedia.service.js";
export { generateLinks, getStats } from "./socialMedia.controller.js";
export {
  validateCampaignId,
  validateSocialMediaOptions,
} from "./socialMedia.validation.js";
