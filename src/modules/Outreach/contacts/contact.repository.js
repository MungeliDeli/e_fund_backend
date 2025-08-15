/**
 * Contact Repository
 *
 * Handles all database operations for contacts.
 * Provides data access layer for contact CRUD operations.
 *
 * Key Features:
 * - Contact CRUD operations
 * - Database query optimization
 * - Error handling for database operations
 * - Data validation and sanitization
 *
 * @author FundFlow Team
 * @version 1.0.0
 */

import { query, transaction } from "../../../db/index.js";
import {
  DatabaseError,
  NotFoundError,
  ConflictError,
} from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";

/**
 * Create a new contact
 * @param {Object} contactData - Contact data
 * @param {string} segmentId - Segment ID
 * @param {string} organizerId - Organizer ID (for authorization)
 * @returns {Promise<Object>} Created contact
 */
export const createContact = async (contactData, segmentId, organizerId) => {
  return await transaction(async (client) => {
    const { name, email, description } = contactData;

    // Verify segment exists and belongs to organizer
    const segmentCheckQuery = `
      SELECT "segmentId" FROM "segments" 
      WHERE "segmentId" = $1 AND "organizerId" = $2
    `;
    const segmentCheckResult = await client.query(segmentCheckQuery, [
      segmentId,
      organizerId,
    ]);

    if (segmentCheckResult.rows.length === 0) {
      throw new NotFoundError("Segment not found");
    }

    // Check if email already exists in this segment
    const emailCheckQuery = `
      SELECT "contactId" FROM "contacts" 
      WHERE "segmentId" = $1 AND email = $2
    `;
    const emailCheckResult = await client.query(emailCheckQuery, [
      segmentId,
      email,
    ]);

    if (emailCheckResult.rows.length > 0) {
      throw new ConflictError(
        "Contact with this email already exists in this segment"
      );
    }

    // Insert new contact
    const insertQuery = `
      INSERT INTO "contacts" ("segmentId", name, email, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await client.query(insertQuery, [
      segmentId,
      name,
      email,
      description,
    ]);

    logger.info("Contact created successfully", {
      contactId: result.rows[0].contactId,
      segmentId,
      email,
    });

    return result.rows[0];
  });
};

/**
 * Get all contacts for a segment
 * @param {string} segmentId - Segment ID
 * @param {string} organizerId - Organizer ID (for authorization)
 * @returns {Promise<Array>} Array of contacts
 */
export const getContactsBySegment = async (segmentId, organizerId) => {
  try {
    // Verify segment exists and belongs to organizer
    const segmentCheckQuery = `
      SELECT "segmentId" FROM "segments" 
      WHERE "segmentId" = $1 AND "organizerId" = $2
    `;
    const segmentCheckResult = await query(segmentCheckQuery, [
      segmentId,
      organizerId,
    ]);

    if (segmentCheckResult.rows.length === 0) {
      throw new NotFoundError("Segment not found");
    }

    const queryText = `
      SELECT 
        "contactId",
        name,
        email,
        description,
        "emailsOpened",
        "createdAt",
        "updatedAt"
      FROM "contacts" 
      WHERE "segmentId" = $1
      ORDER BY "createdAt" DESC
    `;

    const result = await query(queryText, [segmentId]);

    logger.info("Contacts retrieved successfully", {
      segmentId,
      count: result.rows.length,
    });

    return result.rows;
  } catch (error) {
    logger.error("Failed to get contacts in repository", {
      error: error.message,
      segmentId,
      organizerId,
    });

    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new DatabaseError("Failed to get contacts", error);
  }
};

/**
 * Get a contact by ID
 * @param {string} contactId - Contact ID
 * @param {string} organizerId - Organizer ID (for authorization)
 * @returns {Promise<Object>} Contact object
 */
export const getContactById = async (contactId, organizerId) => {
  try {
    const queryText = `
      SELECT 
        c."contactId",
        c.name,
        c.email,
        c.description,
        c."emailsOpened",
        c."createdAt",
        c."updatedAt",
        s."segmentId",
        s.name as segmentName
      FROM "contacts" c
      JOIN segments s ON c."segmentId" = s."segmentId"
      WHERE c."contactId" = $1 AND s."organizerId" = $2
    `;

    const result = await query(queryText, [contactId, organizerId]);

    if (result.rows.length === 0) {
      throw new NotFoundError("Contact not found");
    }

    logger.info("Contact retrieved successfully", {
      contactId,
      organizerId,
    });

    return result.rows[0];
  } catch (error) {
    logger.error("Failed to get contact by ID in repository", {
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
 * Update a contact
 * @param {string} contactId - Contact ID
 * @param {Object} updateData - Data to update
 * @param {string} organizerId - Organizer ID (for authorization)
 * @returns {Promise<Object>} Updated contact
 */
export const updateContact = async (contactId, updateData, organizerId) => {
  return await transaction(async (client) => {
    const { name, email, description } = updateData;

    // Check if contact exists and belongs to organizer's segment
    const contactCheckQuery = `
      SELECT c."contactId", c."segmentId", c.email 
      FROM "contacts" c
      JOIN segments s ON c."segmentId" = s."segmentId"
      WHERE c."contactId" = $1 AND s."organizerId" = $2
    `;
    const contactCheckResult = await client.query(contactCheckQuery, [
      contactId,
      organizerId,
    ]);

    if (contactCheckResult.rows.length === 0) {
      throw new NotFoundError("Contact not found");
    }

    const existingContact = contactCheckResult.rows[0];

    // Check if new email conflicts with existing contact in the same segment
    if (email && email !== existingContact.email) {
      const emailCheckQuery = `
        SELECT "contactId" FROM "contacts" 
        WHERE "segmentId" = $1 AND email = $2 AND "contactId" != $3
      `;
      const emailCheckResult = await client.query(emailCheckQuery, [
        existingContact.segmentId,
        email,
        contactId,
      ]);

      if (emailCheckResult.rows.length > 0) {
        throw new ConflictError(
          "Contact with this email already exists in this segment"
        );
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(name);
      paramIndex++;
    }

    if (email !== undefined) {
      updateFields.push(`email = $${paramIndex}`);
      updateValues.push(email);
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      throw new Error("No fields to update");
    }

    updateValues.push(contactId, organizerId);

    const updateQuery = `
      UPDATE "contacts" 
      SET ${updateFields.join(", ")}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "contactId" = $${paramIndex} 
      AND "segmentId" IN (
        SELECT "segmentId" FROM segments WHERE "organizerId" = $${
          paramIndex + 1
        }
      )
      RETURNING *
    `;

    const result = await client.query(updateQuery, updateValues);

    if (result.rows.length === 0) {
      throw new NotFoundError("Contact not found");
    }

    logger.info("Contact updated successfully", {
      contactId,
      organizerId,
      updatedFields: Object.keys(updateData),
    });

    return result.rows[0];
  });
};

/**
 * Delete a contact
 * @param {string} contactId - Contact ID
 * @param {string} organizerId - Organizer ID (for authorization)
 * @returns {Promise<boolean>} Success status
 */
export const deleteContact = async (contactId, organizerId) => {
  return await transaction(async (client) => {
    // Check if contact exists and belongs to organizer's segment
    const contactCheckQuery = `
      SELECT "contactId" FROM "contacts" c
      JOIN segments s ON c."segmentId" = s."segmentId"
      WHERE c."contactId" = $1 AND s."organizerId" = $2
    `;
    const contactCheckResult = await client.query(contactCheckQuery, [
      contactId,
      organizerId,
    ]);

    if (contactCheckResult.rows.length === 0) {
      throw new NotFoundError("Contact not found");
    }

    // Delete contact
    const deleteQuery = `
      DELETE FROM "contacts" 
      WHERE "contactId" = $1 
      AND "segmentId" IN (
        SELECT "segmentId" FROM segments WHERE "organizerId" = $2
      )
    `;

    const result = await client.query(deleteQuery, [contactId, organizerId]);

    if (result.rowCount === 0) {
      throw new NotFoundError("Contact not found");
    }

    logger.info("Contact deleted successfully", {
      contactId,
      organizerId,
    });

    return true;
  });
};

/**
 * Check if contact email exists in a segment
 * @param {string} email - Contact email
 * @param {string} segmentId - Segment ID
 * @param {string} excludeContactId - Contact ID to exclude (for updates)
 * @returns {Promise<boolean>} True if exists
 */
export const contactEmailExists = async (
  email,
  segmentId,
  excludeContactId = null
) => {
  try {
    let queryText = `
      SELECT "contactId" FROM "contacts"   
      WHERE "segmentId" = $1 AND email = $2
    `;
    let params = [segmentId, email];

    if (excludeContactId) {
      queryText += ' AND "contactId" != $3';
      params.push(excludeContactId);
    }

    const result = await query(queryText, params);
    return result.rows.length > 0;
  } catch (error) {
    logger.error("Failed to check contact email existence", {
      error: error.message,
      email,
      segmentId,
    });

    throw new DatabaseError("Failed to check contact email", error);
  }
};

/**
 * Bulk insert contacts into a segment, skipping existing emails in that segment.
 * Returns counts and created rows. Ensures segment belongs to organizer.
 * @param {string} segmentId
 * @param {string} organizerId
 * @param {Array<{name:string,email:string,description?:string}>} contacts
 */
export const bulkInsertContacts = async (segmentId, organizerId, contacts) => {
  return await transaction(async (client) => {
    // Verify segment exists and belongs to organizer
    const segmentCheckQuery = `
      SELECT "segmentId" FROM "segments"
      WHERE "segmentId" = $1 AND "organizerId" = $2
    `;
    const segmentCheckResult = await client.query(segmentCheckQuery, [
      segmentId,
      organizerId,
    ]);

    if (segmentCheckResult.rows.length === 0) {
      throw new NotFoundError("Segment not found");
    }

    // Fetch existing emails in this segment to skip duplicates
    const existingRes = await client.query(
      `SELECT email FROM "contacts" WHERE "segmentId" = $1`,
      [segmentId]
    );
    const existing = new Set(
      existingRes.rows.map((r) => (r.email || "").toLowerCase())
    );

    const created = [];
    let createdCount = 0;
    let skippedExisting = 0;

    for (const c of contacts) {
      const lower = (c.email || "").toLowerCase();
      if (existing.has(lower)) {
        skippedExisting += 1;
        continue;
      }

      const insertQuery = `
        INSERT INTO "contacts"   ("segmentId", name, email, description)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const res = await client.query(insertQuery, [
        segmentId,
        c.name,
        lower,
        c.description || "",
      ]);
      created.push(res.rows[0]);
      existing.add(lower);
      createdCount += 1;
    }

    logger.info("Bulk contacts inserted", {
      segmentId,
      createdCount,
      skippedExisting,
    });

    return { createdCount, skippedExisting, created };
  });
};
