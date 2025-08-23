import transactionRepository from "./transaction.repository.js";
import { AppError } from "../../../utils/appError.js";
import logger from "../../../utils/logger.js";

class TransactionService {
  async createTransaction(transactionData) {
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
  }

  async getTransactionById(transactionId) {
    const transaction = await transactionRepository.getTransactionById(
      transactionId
    );

    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }

    return transaction;
  }

  async getTransactionsByCampaign(campaignId, limit = 50, offset = 0) {
    const transactions = await transactionRepository.getTransactionsByCampaign(
      campaignId,
      limit,
      offset
    );

    return transactions;
  }

  async getTransactionsByUser(userId, limit = 50, offset = 0) {
    const transactions = await transactionRepository.getTransactionsByUser(
      userId,
      limit,
      offset
    );

    return transactions;
  }

  async updateTransactionStatus(transactionId, status, userId) {
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
      await transactionRepository.updateTransactionStatus(
        transactionId,
        status
      );

    logger.info("Transaction status updated", {
      transactionId,
      oldStatus: currentTransaction.status,
      newStatus: status,
      updatedBy: userId,
    });

    return updatedTransaction;
  }

  async getTransactionStats(campaignId) {
    const stats = await transactionRepository.getTransactionStats(campaignId);

    return {
      totalTransactions: parseInt(stats.totalTransactions) || 0,
      successfulTransactions: parseInt(stats.successfulTransactions) || 0,
      failedTransactions: parseInt(stats.failedTransactions) || 0,
      totalAmount: parseFloat(stats.totalAmount) || 0.0,
      totalFees: parseFloat(stats.totalFees) || 0.0,
    };
  }

  async getTransactionByGatewayId(gatewayTransactionId) {
    const transaction = await transactionRepository.getTransactionByGatewayId(
      gatewayTransactionId
    );

    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }

    return transaction;
  }

  async getTransactionsByType(transactionType, limit = 50, offset = 0) {
    const transactions = await transactionRepository.getTransactionsByType(
      transactionType,
      limit,
      offset
    );

    return transactions;
  }

  async getTransactionSummary(limit = 10) {
    const summary = await transactionRepository.getTransactionSummary(limit);

    return summary;
  }

  async processPaymentSuccess(gatewayTransactionId, gatewayResponse) {
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

      // Update transaction status to succeeded
      const updatedTransaction =
        await transactionRepository.updateTransactionStatus(
          transaction.transactionId,
          "succeeded"
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
  }

  async processPaymentFailure(gatewayTransactionId, failureReason) {
    try {
      // Find transaction by gateway ID
      const transaction = await transactionRepository.getTransactionByGatewayId(
        gatewayTransactionId
      );

      if (!transaction) {
        throw new AppError("Transaction not found", 404);
      }

      // Update transaction status to failed
      const updatedTransaction =
        await transactionRepository.updateTransactionStatus(
          transaction.transactionId,
          "failed"
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
  }
}

export default new TransactionService();
