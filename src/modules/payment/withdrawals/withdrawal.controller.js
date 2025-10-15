import * as withdrawalService from "./withdrawal.service.js";
import { ResponseFactory } from "../../../utils/response.utils.js";

export const requestWithdrawal = async (req, res) => {
  const organizerId = req.user.userId;
  const payload = req.body;
  const result = await withdrawalService.requestWithdrawal(
    organizerId,
    payload
  );
  return ResponseFactory.created(res, "Withdrawal request created", result);
};

export const listMyWithdrawals = async (req, res) => {
  const organizerId = req.user.userId;
  const repo = await import("./withdrawal.repository.js");
  const items = await repo.listWithdrawalsForOrganizer(organizerId, req.query);
  let summary = null;
  const campaignId = req.query?.campaignId;
  if (campaignId) {
    summary = await withdrawalService.computeAvailableBalance(campaignId);
  }
  return ResponseFactory.ok(res, "Withdrawals retrieved", { items, summary });
};

export const adminListWithdrawals = async (req, res) => {
  const { page = 1, limit = 50, ...filters } = req.query;
  const offset = (page - 1) * limit;

  const items = await (
    await import("./withdrawal.repository.js")
  ).listWithdrawals({ ...filters, limit: parseInt(limit), offset });

  // Get total count for pagination
  const totalCount = await (
    await import("./withdrawal.repository.js")
  ).countWithdrawals(filters);

  const totalPages = Math.ceil(totalCount / limit);

  return ResponseFactory.ok(res, "Withdrawals retrieved", {
    data: items,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalCount,
      limit: parseInt(limit),
    },
  });
};

export const approveWithdrawal = async (req, res) => {
  const adminUserId = req.user.userId;
  const { withdrawalRequestId } = req.params;
  const updated = await withdrawalService.approveWithdrawal(
    adminUserId,
    withdrawalRequestId,
    req.body?.notes
  );
  return ResponseFactory.ok(res, "Withdrawal approved", updated);
};

export const rejectWithdrawal = async (req, res) => {
  const adminUserId = req.user.userId;
  const { withdrawalRequestId } = req.params;
  const updated = await withdrawalService.rejectWithdrawal(
    adminUserId,
    withdrawalRequestId,
    req.body?.reason
  );
  return ResponseFactory.ok(res, "Withdrawal rejected", updated);
};

export const initiatePayoutManual = async (req, res) => {
  const { withdrawalRequestId } = req.params;
  const result = await withdrawalService.initiatePayoutManual(
    withdrawalRequestId
  );
  return ResponseFactory.ok(res, "Payout initiated (manual)", result);
};

export const markPaid = async (req, res) => {
  const { withdrawalRequestId } = req.params;
  const updated = await withdrawalService.markPaid(withdrawalRequestId);
  return ResponseFactory.ok(res, "Withdrawal marked as paid", updated);
};

export const markFailed = async (req, res) => {
  const { withdrawalRequestId } = req.params;
  const updated = await withdrawalService.markFailed(
    withdrawalRequestId,
    req.body?.reason
  );
  return ResponseFactory.ok(res, "Withdrawal marked as failed", updated);
};

export default {
  requestWithdrawal,
  listMyWithdrawals,
  adminListWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  initiatePayoutManual,
  markPaid,
  markFailed,
};
