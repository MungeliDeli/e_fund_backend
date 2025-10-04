import axios from "axios";
import config from "../../../config/index.js";
import logger from "../../../utils/logger.js";
import { AppError } from "../../../utils/appError.js";

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

    // Handle nested response structure
    const responseData = data?.response || data;

    // Expected codes: 120 initiated, 100 success (rare immediate), 995 failed
    return {
      ok: true,
      raw: data,
      responseCode: responseData?.response_code,
      message:
        responseData?.response_description || responseData?.response_message,
      gatewayRequestId: responseData?.transaction_id || null,
    };
  } catch (error) {
    logger.error("ZynlePay initiateDeposit error", {
      message: error.message,
      response: error.response?.data,
    });
    throw new AppError("Failed to initiate payment with provider", 502);
  }
}

export default { initiateDeposit };
