# ZynlePay Webhook Setup Guide

## The Problem

Your payment flow is working correctly up to the point where the user enters their PIN, but the transaction status is not being updated from "processing" to "completed" because ZynlePay is not sending webhook callbacks to your server.

## Solution Steps

### 1. Install ngrok (for local development)

```bash
# Install ngrok globally
npm install -g ngrok

# Or download from https://ngrok.com/download
```

### 2. Start your backend server

```bash
cd e_fund_backend
npm start
```

### 3. Expose your local server with ngrok

```bash
# In a new terminal, expose port 3000 (or whatever port your server uses)
ngrok http 3000
```

This will give you output like:

```
Session Status                online
Account                       your-account@email.com
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:3000
```

### 4. Test your webhook endpoint

```bash
# Test the webhook endpoint
node test-webhook.js https://abc123.ngrok.io/api/webhooks/test
```

### 5. Register webhook URL with ZynlePay

You need to contact ZynlePay support or use their dashboard to register your webhook URL:

**Webhook URL:** `https://abc123.ngrok.io/api/webhooks/airtel-money`

**Important:** Replace `abc123.ngrok.io` with your actual ngrok URL.

### 6. Test the complete flow

1. Make a donation through your frontend
2. Enter your PIN when prompted
3. Check your server logs - you should see webhook calls coming in
4. Check your database - the transaction and donation status should update to "completed"

## Webhook Endpoints Available

- **Test Endpoint:** `GET/POST /api/webhooks/test` - Test if webhook is accessible
- **Airtel Money:** `POST /api/webhooks/airtel-money` - Handles Airtel Money callbacks
- **MTN Money:** `POST /api/webhooks/mtn-money` - Handles MTN Money callbacks

## Expected Webhook Payload

ZynlePay will send a POST request with this structure:

```json
{
  "response_code": "100",
  "response_description": "Transaction successful",
  "reference_no": "FRONTEND_1759439905972_iddx72cwz",
  "transaction_id": "6890262046",
  "operator_reference": "8029358811",
  "sender_id": "260978882033",
  "operator": "airtel",
  "transaction_date": "2025-10-02 23:14:26"
}
```

## Response Codes

- `100` - Transaction successful
- `120` - Transaction initiated (already handled)
- `990` - Transaction pending
- `995` - Transaction failed
- `2000` - No active simulator for phone number

## Troubleshooting

### If webhook is not being called:

1. Check if ngrok is running and accessible
2. Verify the webhook URL is correctly registered with ZynlePay
3. Check ZynlePay dashboard for webhook delivery logs
4. Test the webhook endpoint manually using the test script

### If webhook is called but transaction is not updated:

1. Check server logs for webhook processing errors
2. Verify the transaction exists in the database
3. Check if the webhook payload matches expected format

### For production:

1. Use a proper domain instead of ngrok
2. Set up proper SSL certificates
3. Configure webhook signature verification
4. Set up monitoring and alerting for webhook failures

## Database Schema

The webhook will update these fields in the `transactions` table:

- `status` - Updated to 'succeeded' or 'failed'
- `gatewayResponse` - Stores the full webhook payload
- `webhookReceived` - Set to true
- `processingCompletedAt` - Timestamp when webhook was processed

And in the `donations` table:

- `status` - Updated to 'completed' or 'failed'

