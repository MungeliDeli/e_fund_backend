/**
 * Contact Service
 *
 * Contains business logic for contact management.
 * Handles contact CRUD operations, validation, and data formatting.
 * Used by the Contact Controller and other modules for contact-related operations.
 *
 * Key Features:
 * - Contact CRUD operations
 * - Input validation and sanitization
 * - Error handling and logging
 * - Data formatting for API responses
 * - Business rule enforcement
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import * as contactRepository from "./contact.repository.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";

/**
 * Create a new contact
 * @param {Object} contactData - Contact data
 * @param {string} segmentId - Segment ID
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Object>} Created contact
 */
export const createContact = async (contactData, segmentId, organizerId) => {
  try {
    logger.info("Creating new contact", {
      contactData,
      segmentId,
      organizerId,
    });

    // Check if email already exists in this segment
    const emailExists = await contactRepository.contactEmailExists(
      contactData.email,
      segmentId
    );
    if (emailExists) {
      throw new ValidationError(
        "Contact with this email already exists in this segment"
      );
    }

    const contact = await contactRepository.createContact(
      contactData,
      segmentId,
      organizerId
    );

    logger.info("Contact created successfully", {
      contactId: contact.contactId,
      email: contact.email,
      segmentId,
      organizerId,
    });

    return contact;
  } catch (error) {
    logger.error("Failed to create contact in service", {
      error: error.message,
      contactData,
      segmentId,
      organizerId,
    });

    if (error instanceof ValidationError) {
      throw error;
    }

    throw new DatabaseError("Failed to create contact", error);
  }
};

/**
 * Get all contacts for a segment
 * @param {string} segmentId - Segment ID
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Array>} Array of contacts
 */
export const getContactsBySegment = async (segmentId, organizerId) => {
  try {
    logger.info("Getting contacts for segment", { segmentId, organizerId });

    const contacts = await contactRepository.getContactsBySegment(
      segmentId,
      organizerId
    );

    logger.info("Contacts retrieved successfully", {
      segmentId,
      organizerId,
      count: contacts.length,
    });

    return contacts;
  } catch (error) {
    logger.error("Failed to get contacts in service", {
      error: error.message,
      segmentId,
      organizerId,
    });

    throw new DatabaseError("Failed to get contacts", error);
  }
};

/**
 * Get a contact by ID
 * @param {string} contactId - Contact ID
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Object>} Contact object
 */
export const getContactById = async (contactId, organizerId) => {
  try {
    logger.info("Getting contact by ID", { contactId, organizerId });

    const contact = await contactRepository.getContactById(
      contactId,
      organizerId
    );

    if (!contact) {
      throw new NotFoundError("Contact not found");
    }

    logger.info("Contact retrieved successfully", { contactId, organizerId });
    return contact;
  } catch (error) {
    logger.error("Failed to get contact by ID in service", {
      error: error.message,
      contactId,
      organizerId,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new DatabaseError("Failed to get contact", error);
  }
};

/**
 * Update a contact by ID
 * @param {string} contactId - Contact ID
 * @param {Object} updateData - Data to update
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<Object>} Updated contact
 */
export const updateContact = async (contactId, updateData, organizerId) => {
  try {
    logger.info("Updating contact", { contactId, updateData, organizerId });

    // Check if contact exists
    const existingContact = await contactRepository.getContactById(
      contactId,
      organizerId
    );
    if (!existingContact) {
      throw new NotFoundError("Contact not found");
    }

    // Check if new email conflicts with existing contact in the same segment
    if (updateData.email && updateData.email !== existingContact.email) {
      const emailExists = await contactRepository.contactEmailExists(
        updateData.email,
        existingContact.segmentId,
        contactId
      );
      if (emailExists) {
        throw new ValidationError(
          "Contact with this email already exists in this segment"
        );
      }
    }

    const updatedContact = await contactRepository.updateContact(
      contactId,
      updateData,
      organizerId
    );

    logger.info("Contact updated successfully", {
      contactId,
      organizerId,
      updatedFields: Object.keys(updateData),
    });

    return updatedContact;
  } catch (error) {
    logger.error("Failed to update contact in service", {
      error: error.message,
      contactId,
      updateData,
      organizerId,
    });

    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }

    throw new DatabaseError("Failed to update contact", error);
  }
};

/**
 * Delete a contact by ID
 * @param {string} contactId - Contact ID
 * @param {string} organizerId - Organizer ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteContact = async (contactId, organizerId) => {
  try {
    logger.info("Deleting contact", { contactId, organizerId });

    // Check if contact exists
    const existingContact = await contactRepository.getContactById(
      contactId,
      organizerId
    );
    if (!existingContact) {
      throw new NotFoundError("Contact not found");
    }

    const result = await contactRepository.deleteContact(
      contactId,
      organizerId
    );

    logger.info("Contact deleted successfully", {
      contactId,
      organizerId,
    });

    return result;
  } catch (error) {
    logger.error("Failed to delete contact in service", {
      error: error.message,
      contactId,
      organizerId,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new DatabaseError("Failed to delete contact", error);
  }
};

/**
 * Bulk create contacts in a segment
 * Validates minimally: name and email presence, email format.
 * Skips duplicates within the same payload and duplicates that exist in the segment.
 * Returns summary and created contacts.
 * @param {string} segmentId
 * @param {string} organizerId
 * @param {Array<{name:string,email:string,description?:string}>} contacts
 */
export const bulkCreateContacts = async (segmentId, organizerId, contacts) => {
  try {
    logger.info("Bulk create contacts in service", {
      organizerId,
      segmentId,
      count: contacts?.length || 0,
    });

    if (!Array.isArray(contacts) || contacts.length === 0) {
      throw new ValidationError("No contacts provided");
    }

    // Simple in-payload dedupe by email (case-insensitive)
    const seen = new Set();
    const validContacts = [];
    const errors = [];

    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i] || {};
      const name = (c.name || "").trim();
      const email = (c.email || "").trim();
      const description = c.description || "";

      if (!name) {
        errors.push({ index: i, email, reason: "Name is required" });
        continue;
      }
      if (!email) {
        errors.push({ index: i, email, reason: "Email is required" });
        continue;
      }
      const lower = email.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) {
        errors.push({ index: i, email, reason: "Invalid email" });
        continue;
      }
      if (seen.has(lower)) {
        errors.push({ index: i, email, reason: "Duplicate email in payload" });
        continue;
      }
      seen.add(lower);
      validContacts.push({ name, email: lower, description });
    }

    if (validContacts.length === 0) {
      throw new ValidationError("No valid contacts to add");
    }

    const result = await contactRepository.bulkInsertContacts(
      segmentId,
      organizerId,
      validContacts
    );

    return {
      createdCount: result.createdCount,
      skippedExisting: result.skippedExisting,
      created: result.created,
      errors,
    };
  } catch (error) {
    logger.error("Failed bulk create in service", {
      error: error.message,
      segmentId,
      organizerId,
    });
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError("Failed to create contacts", error);
  }
};
