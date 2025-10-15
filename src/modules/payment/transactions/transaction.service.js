import * as transactionRepository from "./transaction.repository.js";
import { AppError } from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";

export const createTransaction = async (transactionData) => {
  try {
    // Validate gateway transaction ID uniqueness
    const existingTransaction =
      await transactionRepository.getTransactionByGatewayId(
        transactionData.gatewayTransactionId
      );

    if (existingTransaction) {
      throw new AppError("Gateway transaction ID already exists", 409);
    }

    // Create transaction
    const transaction = await transactionRepository.createTransaction(
      transactionData
    );

    logger.info("Transaction created successfully", {
      transactionId: transaction.transactionId,
      campaignId: transactionData.campaignId,
      amount: transactionData.amount,
      gatewayUsed: transactionData.gatewayUsed,
    });

    return transaction;
  } catch (error) {
    logger.error("Error creating transaction:", error);
    throw error;
  }
};

export const getTransactionById = async (transactionId) => {
  const transaction = await transactionRepository.getTransactionById(
    transactionId
  );

  if (!transaction) {
    throw new AppError("Transaction not found", 404);
  }

  return transaction;
};

export const getTransactionsByCampaign = async (
  campaignId,
  limit = 50,
  offset = 0
) => {
  const transactions = await transactionRepository.getTransactionsByCampaign(
    campaignId,
    limit,
    offset
  );

  return transactions;
};

export const getTransactionsByUser = async (userId, limit = 50, offset = 0) => {
  const transactions = await transactionRepository.getTransactionsByUser(
    userId,
    limit,
    offset
  );

  return transactions;
};

export const updateTransactionStatus = async (
  transactionId,
  status,
  userId
) => {
  // Validate status transition
  const validTransitions = {
    pending: ["succeeded", "failed"],
    succeeded: ["refunded"],
    failed: [],
    refunded: [],
  };

  const currentTransaction = await transactionRepository.getTransactionById(
    transactionId
  );
  if (!currentTransaction) {
    throw new AppError("Transaction not found", 404);
  }

  const allowedStatuses = validTransitions[currentTransaction.status] || [];
  if (!allowedStatuses.includes(status)) {
    throw new AppError(
      `Invalid status transition from ${currentTransaction.status} to ${status}`,
      400
    );
  }

  const updatedTransaction =
    await transactionRepository.updateTransactionStatus(transactionId, status);

  logger.info("Transaction status updated", {
    transactionId,
    oldStatus: currentTransaction.status,
    newStatus: status,
    updatedBy: userId,
  });

  return updatedTransaction;
};

export const getTransactionStats = async (campaignId) => {
  const stats = await transactionRepository.getTransactionStats(campaignId);

  return {
    totalTransactions: parseInt(stats.totalTransactions) || 0,
    successfulTransactions: parseInt(stats.successfulTransactions) || 0,
    failedTransactions: parseInt(stats.failedTransactions) || 0,
    totalAmount: parseFloat(stats.totalAmount) || 0.0,
    totalFees: parseFloat(stats.totalFees) || 0.0,
  };
};

export const getTransactionByGatewayId = async (gatewayTransactionId) => {
  const transaction = await transactionRepository.getTransactionByGatewayId(
    gatewayTransactionId
  );

  if (!transaction) {
    throw new AppError("Transaction not found", 404);
  }

  return transaction;
};

export const getTransactionsByType = async (
  transactionType,
  limit = 50,
  offset = 0
) => {
  const transactions = await transactionRepository.getTransactionsByType(
    transactionType,
    limit,
    offset
  );

  return transactions;
};

export const getTransactionSummary = async (limit = 10) => {
  const summary = await transactionRepository.getTransactionSummary(limit);

  return summary;
};

export const processPaymentSuccess = async (
  gatewayTransactionId,
  gatewayResponse
) => {
  try {
    // Find transaction by gateway ID
    const transaction = await transactionRepository.getTransactionByGatewayId(
      gatewayTransactionId
    );

    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }

    if (transaction.status === "succeeded") {
      logger.info("Transaction already processed", {
        transactionId: transaction.transactionId,
      });
      return transaction;
    }

    // Update transaction status to succeeded and store response + completion time
    const updatedTransaction =
      await transactionRepository.setTransactionSuccessByGatewayId(
        gatewayTransactionId,
        gatewayResponse
      );

    logger.info("Payment processed successfully", {
      transactionId: transaction.transactionId,
      gatewayTransactionId,
      amount: transaction.amount,
      gatewayResponse,
    });

    return updatedTransaction;
  } catch (error) {
    logger.error("Error processing payment success:", error);
    throw error;
  }
};

export const processPaymentFailure = async (
  gatewayTransactionId,
  failureReason
) => {
  try {
    // Find transaction by gateway ID
    const transaction = await transactionRepository.getTransactionByGatewayId(
      gatewayTransactionId
    );

    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }

    // Update transaction status to failed and store failure payload + completion time
    const updatedTransaction =
      await transactionRepository.setTransactionFailureByGatewayId(
        gatewayTransactionId,
        failureReason
      );

    logger.info("Payment failed", {
      transactionId: transaction.transactionId,
      gatewayTransactionId,
      failureReason,
    });

    return updatedTransaction;
  } catch (error) {
    logger.error("Error processing payment failure:", error);
    throw error;
  }
};

export const markProcessingWithGatewayData = async (
  transactionId,
  { gatewayRequestId, gatewayResponse, status = "processing" }
) => {
  try {
    const updated = await transactionRepository.setTransactionProcessing(
      transactionId,
      { gatewayRequestId, gatewayResponse, status }
    );

    logger.info("Transaction marked processing", {
      transactionId,
      gatewayRequestId,
      status: updated?.status,
    });

    return updated;
  } catch (error) {
    logger.error("Error marking transaction processing:", error);
    throw error;
  }
};

export const getAdminTransactions = async (filters) => {
  try {
    const result = await transactionRepository.getAdminTransactions(filters);

    logger.info("Admin transactions retrieved successfully", {
      count: result.transactions.length,
      page: filters.page,
      limit: filters.limit,
    });

    return result;
  } catch (error) {
    logger.error("Error retrieving admin transactions:", error);
    throw error;
  }
};
