# Auth Module Documentation

## Overview

The Auth module provides authentication, registration, token management handling for the FundFlow backend. It supports both individual and organization users, secure session management, and S3-based media storage.

## Key Features

- User and organization registration (with email verification)
- Login, logout, and JWT/refresh token management
- Email verification and password reset flows
- Profile and cover image upload to S3
- Secure password hashing and validation
- Role-based access control and admin endpoints
- Comprehensive error handling and logging



## API Endpoints

### Registration & Login
- `POST /api/v1/auth/register` — Register individual user
- `POST /api/v1/auth/login` — User login (returns JWT and refresh token)
- `POST /api/v1/auth/refresh-token` — Refresh JWT using refresh token
- `POST /api/v1/auth/logout` — Logout and invalidate refresh token

### Email & Password
- `POST /api/v1/auth/verify-email` — Verify email with token
- `POST /api/v1/auth/forgot-password` — Request password reset
- `POST /api/v1/auth/reset-password` — Reset password with token
- `POST /api/v1/auth/change-password` — Change password (authenticated)
- `POST /api/v1/auth/resend-verification` — Resend verification email

### Organization User Management
- `POST /api/v1/auth/admin/users/create-organization-user` — Admin creates org user
- `POST /api/v1/auth/activate-and-set-password` — Org user activation and password setup

## Media Upload & S3 Integration

- Profile and cover images are uploaded to AWS S3 using the `/me/profile-image` endpoint.
- Media records are created in the database and linked to user profiles.
- Signed URLs are generated for secure, time-limited access to images.
- S3 logic is handled in `src/utils/s3.utils.js`.

## Token Management

- JWT access tokens are used for authentication (short-lived)
- Refresh tokens are stored in the database and rotated on each refresh
- Token refresh is handled via `/refresh-token` endpoint
- All sensitive endpoints require valid JWT or refresh token

## Security Features

- Passwords are hashed using bcrypt
- Tokens are hashed and stored securely
- Email verification required for account activation
- Rate limiting on sensitive endpoints (login, password reset)
- Input validation using Joi schemas
- Role-based access control for admin endpoints

## Error Handling

- Centralized error handling with custom error classes
- Consistent API response structure
- Detailed error logging for debugging
- User-friendly error messages for validation and auth failures

