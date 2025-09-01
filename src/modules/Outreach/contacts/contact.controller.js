/**
 * Contact Controller
 *
 * Handles HTTP requests for contact management operations.
 * Provides RESTful API endpoints for contact CRUD operations.
 *
 * Key Features:
 * - Contact CRUD endpoints
 * - Request/response handling
 * - Error handling
 * - Data validation
 * - Response formatting
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import * as contactService from "./contact.service.js";
import { ResponseFactory } from "../../../utils/response.utils.js";
import logger from "../../../utils/logger.js";

/**
 * Create a new contact in a segment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createContact = async (req, res) => {
  const { name, email, description } = req.body;
  const { segmentId } = req.params;
  const organizerId = req.user.userId;

  logger.info("Creating contact request", {
    organizerId,
    segmentId,
    contactData: { name, email, description },
  });

  const contact = await contactService.createContact(
    { name, email, description },
    segmentId,
    organizerId
  );

  ResponseFactory.created(res, "Contact created successfully", {
    contactId: contact.contactId,
    name: contact.name,
    email: contact.email,
    description: contact.description,
    emailsOpened: contact.emailsOpened,
    segmentId: contact.segmentId,
    createdAt: contact.createdAt,
  });
};

/**
 * Bulk create contacts in a segment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const bulkCreateContacts = async (req, res) => {
  const { segmentId } = req.params;
  const organizerId = req.user.userId;
  const contacts = Array.isArray(req.body?.contacts) ? req.body.contacts : [];

  logger.info("Bulk creating contacts", {
    organizerId,
    segmentId,
    count: contacts.length,
  });

  const result = await contactService.bulkCreateContacts(
    segmentId,
    organizerId,
    contacts
  );

  ResponseFactory.created(res, "Contacts created successfully", result);
};

/**
 * Get all contacts for a segment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getContactsBySegment = async (req, res) => {
  const { segmentId } = req.params;
  const organizerId = req.user.userId;

  logger.info("Getting contacts for segment request", {
    segmentId,
    organizerId,
  });

  const contacts = await contactService.getContactsBySegment(
    segmentId,
    organizerId
  );

  ResponseFactory.ok(res, "Contacts retrieved successfully", contacts);
};

/**
 * Get a contact by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getContactById = async (req, res) => {
  const { contactId } = req.params;
  const organizerId = req.user.userId;

  logger.info("Getting contact by ID request", { contactId, organizerId });

  const contact = await contactService.getContactById(contactId, organizerId);

  ResponseFactory.ok(res, "Contact retrieved successfully", {
    contactId: contact.contactId,
    name: contact.name,
    email: contact.email,
    description: contact.description,
    emailsOpened: contact.emailsOpened,
    segmentId: contact.segmentId,
    segmentName: contact.segmentName,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  });
};

/**
 * Update a contact by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateContact = async (req, res) => {
  const { contactId } = req.params;
  const { name, email, description } = req.body;
  const organizerId = req.user.userId;

  logger.info("Updating contact request", {
    contactId,
    organizerId,
    updateData: { name, email, description },
  });

  const updatedContact = await contactService.updateContact(
    contactId,
    { name, email, description },
    organizerId
  );

  ResponseFactory.ok(res, "Contact updated successfully", {
    contactId: updatedContact.contactId,
    name: updatedContact.name,
    email: updatedContact.email,
    description: updatedContact.description,
    emailsOpened: updatedContact.emailsOpened,
    segmentId: updatedContact.segmentId,
    updatedAt: updatedContact.updatedAt,
  });
};

/**
 * Delete a contact by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteContact = async (req, res) => {
  const { contactId } = req.params;
  const organizerId = req.user.userId;

  logger.info("Deleting contact request", { contactId, organizerId });

  await contactService.deleteContact(contactId, organizerId);

  ResponseFactory.ok(res, "Contact deleted successfully");
};
