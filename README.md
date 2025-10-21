# FundFlow Backend API

A comprehensive Node.js backend API for the FundFlow fundraising platform, built with Express.js and PostgreSQL. This system provides secure, scalable infrastructure for managing fundraising campaigns, donations, user authentication, and payment processing.

## 🚀 Features

### Core Functionality

- **User Management**: Individual users and organization profiles with role-based access control
- **Campaign Management**: Create, update, and manage fundraising campaigns with customizable templates
- **Donation Processing**: Secure donation handling with mobile money integration
- **Payment Gateway**: Integration with ZynlePay for mobile money transactions
- **Real-time Notifications**: WebSocket-based real-time notifications and updates
- **Audit Logging**: Comprehensive audit trails for all system activities
- **Analytics**: Detailed analytics and reporting for campaigns and donations

### Security Features

- JWT-based authentication and authorization
- Rate limiting and request throttling
- CORS protection and security headers
- Input validation with Joi
- Password hashing with bcrypt
- Audit logging for compliance

### Advanced Features

- **Outreach System**: Email campaigns and contact management
- **File Uploads**: AWS S3 integration for media storage
- **Database Migrations**: Automated database schema management
- **Error Handling**: Comprehensive error handling and logging
- **API Documentation**: Built-in health checks and monitoring

## 🛠️ Tech Stack

- **Runtime**: Node.js with ES6 modules
- **Framework**: Express.js 5.x
- **Database**: PostgreSQL with connection pooling
- **Authentication**: JWT with bcrypt password hashing
- **Real-time**: Socket.IO for WebSocket connections
- **File Storage**: AWS S3 with presigned URLs
- **Payment**: ZynlePay mobile money integration
- **Validation**: Joi for request validation
- **Logging**: Winston for structured logging
- **Security**: Helmet, CORS, rate limiting

## 📁 Project Structure

```
e_fund_backend/
├── src/
│   ├── app.js                 # Express app configuration
│   ├── config/                # Configuration management
│   ├── db/                    # Database connection
│   ├── middlewares/           # Custom middleware
│   ├── modules/               # Feature modules
│   │   ├── auth/             # Authentication & authorization
│   │   ├── users/            # User management
│   │   ├── campaign/         # Campaign management
│   │   ├── donor/            # Donation handling
│   │   ├── payment/          # Payment processing
│   │   ├── notifications/    # Notification system
│   │   ├── audit/            # Audit logging
│   │   ├── analytics/        # Analytics & reporting
│   │   ├── feed/             # Social feed
│   │   └── Outreach/         # Outreach campaigns
│   └── utils/                # Utility functions
├── migrations/               # Database migrations
├── logs/                     # Application logs
├── server.js                 # Server entry point
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- Redis (for caching and sessions)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd e_fund_backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:

   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=3000

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=fundflow_dev

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRATION=7d

   # CORS Configuration
   CORS_ORIGIN=http://localhost:5173

   # Payment Gateway (ZynlePay)
   ZYNLEPAY_BASE_URL=https://api.zynlepay.com
   ZYNLEPAY_API_ID=your_api_id
   ZYNLEPAY_API_KEY=your_api_key
   ZYNLEPAY_MERCHANT_ID=your_merchant_id

   # AWS S3 Configuration
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_S3_BUCKET=your_s3_bucket
   AWS_REGION=your_aws_region

   # Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_email_password
   ```

4. **Database Setup**

   ```bash
   # Run database migrations
   npm run migrate:up
   ```

5. **Start the server**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 📚 API Endpoints

### Authentication

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/forgot-password` - Password reset request
- `POST /api/v1/auth/reset-password` - Password reset

### Campaigns

- `GET /api/v1/campaigns` - List campaigns
- `POST /api/v1/campaigns` - Create campaign
- `GET /api/v1/campaigns/:id` - Get campaign details
- `PUT /api/v1/campaigns/:id` - Update campaign
- `DELETE /api/v1/campaigns/:id` - Delete campaign

### Donations

- `POST /api/v1/donations` - Create donation
- `GET /api/v1/donations` - List donations
- `GET /api/v1/donations/:id` - Get donation details

### Payments

- `POST /api/v1/transactions` - Create transaction
- `GET /api/v1/transactions` - List transactions
- `POST /api/webhooks/payment` - Payment webhook

### Users

- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update user profile
- `GET /api/v1/organizations` - List organizations

### Analytics

- `GET /api/v1/analytics/campaigns/:id` - Campaign analytics
- `GET /api/v1/analytics/donations` - Donation analytics

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start with auto-reload
npm start               # Start production server

# Database
npm run migrate:up      # Run migrations
npm run migrate:down    # Rollback migrations
npm run migrate:create  # Create new migration

# Testing
npm test               # Run tests
```

### Code Structure

The application follows a modular architecture with clear separation of concerns:

- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic
- **Repositories**: Handle database operations
- **Middlewares**: Cross-cutting concerns (auth, validation, etc.)
- **Utils**: Helper functions and utilities

### Database Migrations

The system uses `node-pg-migrate` for database schema management:

```bash
# Create a new migration
npm run migrate:create "migration_name"

# Apply migrations
npm run migrate:up

# Rollback migrations
npm run migrate:down
```

## 🔒 Security

### Authentication & Authorization

- JWT-based authentication with configurable expiration
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Protected routes with middleware

### Rate Limiting

- API rate limiting to prevent abuse
- Different limits for different endpoints
- IP-based and user-based limiting

### Input Validation

- Joi validation for all incoming data
- SQL injection prevention with parameterized queries
- XSS protection with proper sanitization

## 📊 Monitoring & Logging

### Logging

- Structured logging with Winston
- Different log levels (error, warn, info, debug)
- Request/response logging with Morgan
- Audit logging for compliance

### Health Checks

- `/health` endpoint for server status
- Database connection monitoring
- Service dependency checks

## 🚀 Deployment

### Environment Variables

Ensure all required environment variables are set in production:

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your_production_secret
# ... other production configs
```

### Database

- Use connection pooling for production
- Configure SSL for secure connections
- Set up database backups

### Security

- Use HTTPS in production
- Configure proper CORS origins
- Set up firewall rules
- Enable security headers
