# Authentication Module

## Overview

The Authentication Module provides comprehensive user authentication, registration, and session management for both individual and organization users. It handles secure token-based authentication with email verification and role-based access control.

## Key Features

- **Individual User Registration** with email verification
- **Organization User Creation** by admin with invitation system
- **JWT-based Authentication** with refresh token rotation
- **Password Management** (reset, change, setup)
- **Email Verification** and account activation
- **Role-based Access Control** (individual, organization, admin)
- **Rate Limiting** on sensitive endpoints
- **Comprehensive Input Validation** using Joi schemas


## Authentication Flow

1. **Registration** → Email verification required
2. **Login** → JWT + refresh token issued
3. **Protected Routes** → JWT verification required
4. **Token Refresh** → New JWT issued using refresh token
5. **Logout** → Refresh token invalidated

## User Types

- `individual_user`: Regular users with personal profiles
- `organization_user`: Organization representatives
- `super_admin`: System administrators
- `support_admin`: Support team members
- `event_moderator`: Event management staff
- `financial_admin`: Financial management staff

## Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **Token Security**: SHA-256 hashing for database storage
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive Joi schemas
- **Email Verification**: Required for account activation
- **Session Management**: Secure refresh token handling

## Token Management

| Token Type | Expiry | Purpose |
|------------|--------|---------|
| JWT Access | 15 min | API authentication |
| Refresh | 30 days | Token renewal |
| Verification | 24 hours | Email verification |
| Reset | 20 min | Password reset |
| Setup | 48 hours | Organization activation |

## Database Tables

- `users` - Core user information
- `individual_profiles` - Individual user profiles
- `organization_profiles` - Organization user profiles
- `email_verification_tokens` - Email verification tokens
- `password_reset_tokens` - Password reset tokens
- `refresh_tokens` - JWT refresh tokens
- `password_setup_tokens` - Organization setup tokens

## Error Handling

- **400**: Validation errors, missing fields
- **401**: Invalid credentials, expired tokens
- **403**: Insufficient privileges, unverified email
- **409**: Duplicate email/phone number
- **429**: Rate limit exceeded

## Dependencies

- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT operations
- **joi**: Input validation
- **crypto**: Token generation
- **nodemailer**: Email sending

## Related Modules

- **Users Module**: Extended user management
- **Email Utils**: Email sending functionality
- **JWT Utils**: Token operations
- **Password Utils**: Password hashing
- **Auth Middleware**: Route protection 