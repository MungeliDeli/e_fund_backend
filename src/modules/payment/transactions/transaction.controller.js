import transactionService from "./transaction.service.js";
import { successResponse } from "../../../utils/response.utils.js";

class TransactionController {
  async createTransaction(req, res) {
    const transactionData = req.body;

    const transaction = await transactionService.createTransaction(
      transactionData
    );

    return successResponse(
      res,
      {
        message: "Transaction created successfully",
        data: transaction,
      },
      201
    );
  }

  async getTransactionById(req, res) {
    const { transactionId } = req.params;

    const transaction = await transactionService.getTransactionById(
      transactionId
    );

    return successResponse(res, {
      message: "Transaction retrieved successfully",
      data: transaction,
    });
  }

  async getTransactionsByCampaign(req, res) {
    const { campaignId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const transactions = await transactionService.getTransactionsByCampaign(
      campaignId,
      parseInt(limit),
      parseInt(offset)
    );

    return successResponse(res, {
      message: "Campaign transactions retrieved successfully",
      data: transactions,
    });
  }

  async getTransactionsByUser(req, res) {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const transactions = await transactionService.getTransactionsByUser(
      userId,
      parseInt(limit),
      parseInt(offset)
    );

    return successResponse(res, {
      message: "User transactions retrieved successfully",
      data: transactions,
    });
  }

  async updateTransactionStatus(req, res) {
    const { transactionId } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    const updatedTransaction = await transactionService.updateTransactionStatus(
      transactionId,
      status,
      userId
    );

    return successResponse(res, {
      message: "Transaction status updated successfully",
      data: updatedTransaction,
    });
  }

  async getTransactionStats(req, res) {
    const { campaignId } = req.params;

    const stats = await transactionService.getTransactionStats(campaignId);

    return successResponse(res, {
      message: "Transaction statistics retrieved successfully",
      data: stats,
    });
  }

  async getTransactionsByType(req, res) {
    const { transactionType } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const transactions = await transactionService.getTransactionsByType(
      transactionType,
      parseInt(limit),
      parseInt(offset)
    );

    return successResponse(res, {
      message: "Transactions by type retrieved successfully",
      data: transactions,
    });
  }

  async getTransactionSummary(req, res) {
    const { limit = 10 } = req.query;

    const summary = await transactionService.getTransactionSummary(
      parseInt(limit)
    );

    return successResponse(res, {
      message: "Transaction summary retrieved successfully",
      data: summary,
    });
  }

  async processPaymentSuccess(req, res) {
    const { gatewayTransactionId } = req.params;
    const gatewayResponse = req.body;

    const transaction = await transactionService.processPaymentSuccess(
      gatewayTransactionId,
      gatewayResponse
    );

    return successResponse(res, {
      message: "Payment processed successfully",
      data: transaction,
    });
  }

  async processPaymentFailure(req, res) {
    const { gatewayTransactionId } = req.params;
    const { failureReason } = req.body;

    const transaction = await transactionService.processPaymentFailure(
      gatewayTransactionId,
      failureReason
    );

    return successResponse(res, {
      message: "Payment failure processed successfully",
      data: transaction,
    });
  }
}

export default new TransactionController();
