# Users Module Documentation

## Overview

The Users module provides user profile management for the FundFlow backend. It supports public and private profile views, profile/cover image upload to S3, and media record management.

## Key Features

- Public and private profile endpoints
- Profile and cover image upload (S3 integration)
- Media record creation and retrieval
- Transactional updates for profile changes
- Error handling and logging

## API Endpoints

### Profile
- `GET /api/v1/users/:userId/profile` — Public profile (anyone)
- `GET /api/v1/users/me` — Private profile (owner only)

### Profile & Cover Image
- `PATCH /api/v1/users/me/profile-image` — Upload profile/cover image (multipart/form-data, authenticated)
- `GET /api/v1/users/media/:mediaId/url` — Get signed S3 URL for media

## Media Upload & S3 Integration

- Profile and cover images are uploaded to AWS S3 using the `/me/profile-image` endpoint.
- Media records are created in the database and linked to user profiles.
- Signed URLs are generated for secure, time-limited access to images.
- S3 logic is handled in `src/utils/s3.utils.js`.

## Error Handling

- Centralized error handling with custom error classes
- Consistent API response structure
- Detailed error logging for debugging
- User-friendly error messages for validation and upload failures


## Future Enhancements
- [ ] Profile information editing
- [ ] Media deletion endpoints
- [ ] Admin user management endpoints
- [ ] Advanced validation and privacy controls

---

*Last updated: December 2024*
*Version: 1.0.0* 