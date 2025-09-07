# Email Configuration Setup

## Issue: Email Sending Failures

The outreach campaign emails are failing to send because the SMTP configuration is missing. Here's how to fix it:

## 1. Create .env File

Create a `.env` file in the `e_fund_backend` directory with the following configuration:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/efund_db

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
FROM_EMAIL=your_email@gmail.com

# Application Configuration
APP_NAME=E-Fund
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
NODE_ENV=development

# Tracking Configuration
TRACKING_BASE_URL=http://localhost:3000
```

## 2. Gmail SMTP Setup

If using Gmail, you need to:

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password in `SMTP_PASS`

## 3. Alternative Email Providers

### SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
```

### Mailgun

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your_mailgun_username
SMTP_PASS=your_mailgun_password
```

## 4. Test Email Configuration

After setting up the .env file, restart the backend server and try sending outreach emails again.

## 5. Troubleshooting

- Check that all SMTP environment variables are set
- Verify SMTP credentials are correct
- Ensure the email provider allows SMTP connections
- Check firewall settings if using corporate networks
- Review server logs for specific SMTP error messages
