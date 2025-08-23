import transactionService from "./transaction.service.js";
import { ResponseFactory } from "../../../utils/response.utils.js";

class TransactionController {
  async createTransaction(req, res) {
    const transactionData = req.body;

    const transaction = await transactionService.createTransaction(
      transactionData
    );

    return ResponseFactory.created(
      res,
      "Transaction created successfully",
      transaction
    );
  }

  async getTransactionById(req, res) {
    const { transactionId } = req.params;

    const transaction = await transactionService.getTransactionById(
      transactionId
    );

    return ResponseFactory.ok(
      res,
      "Transaction retrieved successfully",
      transaction
    );
  }

  async getTransactionsByCampaign(req, res) {
    const { campaignId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const transactions = await transactionService.getTransactionsByCampaign(
      campaignId,
      parseInt(limit),
      parseInt(offset)
    );

    return ResponseFactory.ok(
      res,
      "Campaign transactions retrieved successfully",
      transactions
    );
  }

  async getTransactionsByUser(req, res) {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const transactions = await transactionService.getTransactionsByUser(
      userId,
      parseInt(limit),
      parseInt(offset)
    );

    return ResponseFactory.ok(
      res,
      "User transactions retrieved successfully",
      transactions
    );
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

    return ResponseFactory.ok(
      res,
      "Transaction status updated successfully",
      updatedTransaction
    );
  }

  async getTransactionStats(req, res) {
    const { campaignId } = req.params;

    const stats = await transactionService.getTransactionStats(campaignId);

    return ResponseFactory.ok(
      res,
      "Transaction statistics retrieved successfully",
      stats
    );
  }

  async getTransactionsByType(req, res) {
    const { transactionType } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const transactions = await transactionService.getTransactionsByType(
      transactionType,
      parseInt(limit),
      parseInt(offset)
    );

    return ResponseFactory.ok(
      res,
      "Transactions by type retrieved successfully",
      transactions
    );
  }

  async getTransactionSummary(req, res) {
    const { limit = 10 } = req.query;

    const summary = await transactionService.getTransactionSummary(
      parseInt(limit)
    );

    return ResponseFactory.ok(
      res,
      "Transaction summary retrieved successfully",
      summary
    );
  }

  async processPaymentSuccess(req, res) {
    const { gatewayTransactionId } = req.params;
    const gatewayResponse = req.body;

    const transaction = await transactionService.processPaymentSuccess(
      gatewayTransactionId,
      gatewayResponse
    );

    return ResponseFactory.ok(
      res,
      "Payment processed successfully",
      transaction
    );
  }

  async processPaymentFailure(req, res) {
    const { gatewayTransactionId } = req.params;
    const { failureReason } = req.body;

    const transaction = await transactionService.processPaymentFailure(
      gatewayTransactionId,
      failureReason
    );

    return ResponseFactory.ok(
      res,
      "Payment failure processed successfully",
      transaction
    );
  }
}

export default new TransactionController();
