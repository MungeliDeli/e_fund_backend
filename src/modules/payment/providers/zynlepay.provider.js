import axios from "axios";
import config from "../../../config/index.js";
import logger from "../../../utils/logger.js";
import { AppError } from "../../../utils/appError.js";

function extractZynleResponse(raw) {
  const responseData = raw?.response || raw;
  const code = responseData?.response_code;
  const description =
    responseData?.response_description || responseData?.response_message;
  const transactionId = responseData?.transaction_id || null;
  const referenceNo = responseData?.reference_no || responseData?.reference;
  return { code, description, transactionId, referenceNo };
}

function mapZynleErrorMessage(description = "", code) {
  const desc = String(description).toLowerCase();
  // Heuristics based on typical provider error strings seen in sandbox/production
  if (
    desc.includes("not registered") ||
    desc.includes("unregistered") ||
    desc.includes("no active subscriber") ||
    desc.includes("invalid msisdn") ||
    desc.includes("unknown subscriber")
  ) {
    return "The mobile number is not registered for mobile money.";
  }
  if (
    desc.includes("simulator") &&
    (desc.includes("inactive") || desc.includes("not active"))
  ) {
    return "The simulator for this number is not active.";
  }
  if (desc.includes("insufficient") && desc.includes("balance")) {
    return "Insufficient balance to complete the payout.";
  }
  if (desc.includes("timeout") || desc.includes("timed out")) {
    return "The payment provider timed out. Please try again.";
  }
  if (desc.includes("invalid amount") || desc.includes("amount")) {
    return "The amount is invalid for payout.";
  }
  if (code === 995 || code === "995") {
    return "The payout could not be initiated. Please verify the number and try again.";
  }
  return description || "Payment provider returned an error.";
}

function handleZynleNonSuccess(raw) {
  const { code, description } = extractZynleResponse(raw);
  const message = mapZynleErrorMessage(description, code);
  // Use 422 for user-fixable errors, fallback to 502 otherwise
  const status = 422;
  throw new AppError(message, status);
}

/**
 * ZynlePay Deposit (Collections) Provider
 * - Initiates Mobile Money payment request to user's phone (USSD push)
 * - Exposes a single function to start a payment
 */
export async function initiateDeposit({ phoneNumber, amount, referenceNo }) {
  const baseUrl = config.payments?.zynlepay?.baseUrl;
  const apiId = config.payments?.zynlepay?.apiId;
  const apiKey = config.payments?.zynlepay?.apiKey;
  const merchantId = config.payments?.zynlepay?.merchantId;
  const channel = config.payments?.zynlepay?.channel || "momo";

  if (!baseUrl || !apiId || !apiKey || !merchantId) {
    throw new AppError("Payment provider not configured", 500);
  }

  const url = `${baseUrl}`;

  const payload = {
    auth: {
      merchant_id: merchantId,
      api_id: apiId,
      api_key: apiKey,
      channel,
    },
    data: {
      method: "runBillPayment",
      sender_id: phoneNumber,
      reference_no: referenceNo,
      amount: String(amount),
    },
  };

  try {
    const response = await axios.post(url, payload, {
      timeout: 15000,
      headers: { "Content-Type": "application/json" },
    });
    const data = response?.data || {};
    const { code, description, transactionId } = extractZynleResponse(data);
    // Success/initiated codes observed: 120 (initiated), 100 (immediate success)
    if (code === 120 || code === 100 || code === "120" || code === "100") {
      return {
        ok: true,
        raw: data,
        responseCode: code,
        message: description,
        gatewayRequestId: transactionId,
      };
    }
    // Any other code should be treated as a failure we surface to callers
    handleZynleNonSuccess(data);
  } catch (error) {
    logger.error("ZynlePay initiateDeposit error", {
      message: error.message,
      response: error.response?.data,
    });
    if (error.response?.data) {
      handleZynleNonSuccess(error.response.data);
    }
    // Network or unexpected error
    throw new AppError("Failed to initiate payment with provider", 502);
  }
}

export async function initiatePayout({ phoneNumber, amount, referenceNo }) {
  const baseUrl = config.payments?.zynlepay?.baseUrl;
  const apiId = config.payments?.zynlepay?.apiId;
  const apiKey = config.payments?.zynlepay?.apiKey;
  const merchantId = config.payments?.zynlepay?.merchantId;
  const channel = config.payments?.zynlepay?.channel || "momo";

  if (!baseUrl || !apiId || !apiKey || !merchantId) {
    throw new AppError("Payment provider not configured", 500);
  }

  const url = `${baseUrl}`;
  const payload = {
    auth: {
      merchant_id: merchantId,
      api_id: apiId,
      api_key: apiKey,
      channel,
    },
    data: {
      method: "runPayToEwallet",
      receiver_id: phoneNumber,
      reference_no: referenceNo,
      amount: String(amount),
    },
  };

  try {
    const response = await axios.post(url, payload, {
      timeout: 15000,
      headers: { "Content-Type": "application/json" },
    });
    const data = response?.data || {};
    const { code, description, transactionId } = extractZynleResponse(data);
    if (code === 120 || code === 100 || code === "120" || code === "100") {
      return {
        ok: true,
        raw: data,
        responseCode: code,
        message: description,
        gatewayRequestId: transactionId,
      };
    }
    handleZynleNonSuccess(data);
  } catch (error) {
    logger.error("ZynlePay initiatePayout error", {
      message: error.message,
      response: error.response?.data,
    });
    if (error.response?.data) {
      handleZynleNonSuccess(error.response.data);
    }
    throw new AppError("Failed to initiate payout with provider", 502);
  }
}

export default { initiateDeposit, initiatePayout };
