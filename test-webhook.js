#!/usr/bin/env node

/**
 * Webhook Test Script
 *
 * This script helps test the webhook endpoints to ensure they're working correctly.
 * Run this after starting your server and setting up ngrok.
 */

const https = require("https");
const http = require("http");

const WEBHOOK_URL =
  process.argv[2] || "http://localhost:3000/api/webhooks/test";

console.log("🧪 Testing webhook endpoint...");
console.log(`📍 URL: ${WEBHOOK_URL}`);
console.log("");

// Test data that mimics ZynlePay webhook
const testPayload = {
  response_code: "100",
  response_description: "Transaction successful",
  reference_no: "FRONTEND_1759439905972_iddx72cwz",
  transaction_id: "6890262046",
  operator_reference: "8029358811",
  sender_id: "260978882033",
  operator: "airtel",
  transaction_date: "2025-10-02 23:14:26",
};

const postData = JSON.stringify(testPayload);

const options = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(postData),
    "User-Agent": "ZynlePay-Webhook-Test/1.0",
  },
};

const protocol = WEBHOOK_URL.startsWith("https") ? https : http;

const req = protocol.request(WEBHOOK_URL, options, (res) => {
  console.log(`✅ Status: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);

  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("📦 Response Body:");
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(data);
    }

    if (res.statusCode === 200) {
      console.log("\n🎉 Webhook test successful!");
    } else {
      console.log("\n❌ Webhook test failed!");
    }
  });
});

req.on("error", (err) => {
  console.error("❌ Error testing webhook:", err.message);
  console.log("\n💡 Make sure your server is running and the URL is correct.");
  console.log(
    "   For local testing, use: http://localhost:3000/api/webhooks/test"
  );
  console.log(
    "   For ngrok testing, use: https://your-ngrok-url.ngrok.io/api/webhooks/test"
  );
});

req.write(postData);
req.end();

console.log("📤 Sending test payload...");
console.log(JSON.stringify(testPayload, null, 2));

