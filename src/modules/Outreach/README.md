# Outreach Module

The Outreach Module provides functionality for managing contact lists and segments for email campaigns. It allows organizers to create segments (contact lists) and manage contacts within those segments.

## Features

- **Segment Management**: Create, read, update, and delete contact list segments
- **Contact Management**: Add, view, update, and delete contacts within segments
- **Authorization**: Only organization users (organizers) can access these features
- **Validation**: Comprehensive input validation for all operations
- **Error Handling**: Proper error handling and logging

## Database Schema

### Segments Table
- `segment_id` (UUID, Primary Key)
- `organizer_id` (UUID, Foreign Key to users)
- `name` (VARCHAR(100), Required)
- `description` (TEXT, Optional)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Contacts Table
- `contact_id` (UUID, Primary Key)
- `segment_id` (UUID, Foreign Key to segments)
- `name` (VARCHAR(100), Required)
- `email` (VARCHAR(255), Required)
- `description` (TEXT, Optional)
- `emails_opened` (INTEGER, Default: 0)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## API Endpoints

### Segment Management

#### Create Segment
```
POST /api/v1/segments
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Alumni List",
  "description": "Former students and graduates"
}
```

#### Get All Segments
```
GET /api/v1/segments
Authorization: Bearer <token>
```

#### Get Segment by ID
```
GET /api/v1/segments/:segmentId
Authorization: Bearer <token>
```

#### Update Segment
```
PUT /api/v1/segments/:segmentId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Alumni List",
  "description": "Updated description"
}
```

#### Delete Segment
```
DELETE /api/v1/segments/:segmentId
Authorization: Bearer <token>
```

### Contact Management

#### Create Contact in Segment
```
POST /api/v1/segments/:segmentId/contacts
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "description": "Alumni from 2020"
}
```

#### Get Contacts in Segment
```
GET /api/v1/segments/:segmentId/contacts
Authorization: Bearer <token>
```

#### Get Contact by ID
```
GET /api/v1/contacts/:contactId
Authorization: Bearer <token>
```

#### Update Contact
```
PUT /api/v1/contacts/:contactId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "description": "Updated description"
}
```

#### Delete Contact
```
DELETE /api/v1/contacts/:contactId
Authorization: Bearer <token>
```

## Business Rules

1. **Segment Ownership**: Only the organizer who created a segment can access it
2. **Unique Segment Names**: Segment names must be unique per organizer
3. **Unique Contact Emails**: Contact emails must be unique within a segment
4. **Segment Deletion**: Segments can only be deleted if they have no contacts
5. **Contact Authorization**: Contacts can only be managed by the segment owner

## Error Responses

### Validation Errors (400)
```json
{
  "success": false,
  "status": "fail",
  "message": "Validation error message",
  "errorCode": "VALIDATION_ERROR"
}
```

### Not Found Errors (404)
```json
{
  "success": false,
  "status": "fail",
  "message": "Segment not found",
  "errorCode": "NOT_FOUND_ERROR"
}
```

### Conflict Errors (409)
```json
{
  "success": false,
  "status": "fail",
  "message": "Segment name already exists for this organizer",
  "errorCode": "CONFLICT_ERROR"
}
```

## Success Responses

### Create Segment
```json
{
  "success": true,
  "status": "success",
  "message": "Segment created successfully",
  "data": {
    "segmentId": "uuid",
    "name": "Alumni List",
    "description": "Former students and graduates",
    "contactCount": 0,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get Segments
```json
{
  "success": true,
  "status": "success",
  "message": "Segments retrieved successfully",
  "data": [
    {
      "segment_id": "uuid",
      "name": "Alumni List",
      "description": "Former students and graduates",
      "contact_count": 5,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Rate Limiting

All endpoints are protected by rate limiting:
- 100 requests per 15 minutes per IP in production
- 1000 requests per 15 minutes per IP in development

## Authentication

All endpoints require:
1. Valid JWT token in Authorization header
2. User must be an organization user (organizer)
3. User account must be active

## File Structure

```
src/modules/outreach/
├── index.js                 # Main module entry point
├── segments/
│   ├── segment.controller.js
│   ├── segment.repository.js
│   ├── segment.routes.js
│   ├── segment.service.js
│   └── segment.validation.js
├── contacts/
│   ├── contact.controller.js
│   ├── contact.repository.js
│   ├── contact.routes.js
│   ├── contact.service.js
│   └── contact.validation.js
└── README.md
``` 