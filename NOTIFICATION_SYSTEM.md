# Real-time Notification System

This document describes the implementation of the real-time notification system for FundFlow.

## Overview

The notification system provides:

- Real-time in-app notifications using Socket.IO
- Badge count management with automatic updates
- Broadcast notifications for organizers to all subscribers
- Email notifications (existing functionality preserved)
- Redis support for scaling (optional)

## Architecture

### Backend Components

1. **Socket.IO Server** (`src/config/socket.config.js`)

   - Handles WebSocket connections
   - Authenticates users via JWT tokens
   - Manages user rooms for targeted notifications

2. **Notification Service** (`src/modules/notifications/notification.service.js`)

   - Creates and dispatches notifications
   - Sends real-time updates via Socket.IO
   - Handles broadcast notifications to subscribers
   - Manages unread count updates

3. **Notification Repository** (`src/modules/notifications/notification.repository.js`)

   - Database operations for notifications
   - Subscriber management queries
   - Unread count calculations

4. **Redis Configuration** (`src/config/redis.config.js`)
   - Redis client setup for caching and scaling
   - Optional for MVP, can be enabled later

### Frontend Components

1. **Socket Context** (`src/contexts/SocketContext.jsx`)

   - Manages Socket.IO connection
   - Handles authentication and reconnection

2. **Real-time Notification Context** (`src/contexts/RealtimeNotificationContext.jsx`)

   - Manages notification state
   - Handles real-time updates
   - Updates badge counts automatically

3. **Broadcast Modal** (`src/features/notifications/components/BroadcastNotificationModal.jsx`)
   - UI for organizers to send broadcast notifications
   - Form validation and submission

## Features

### Real-time Notifications

- Instant delivery via WebSocket
- Automatic badge count updates
- User-specific notification rooms

### Badge Management

- Badge appears on bell icon in header
- Badge appears on notifications link in sidebar
- Badge disappears when notifications page is opened
- Real-time count updates

### Broadcast Notifications

- Organizers can send notifications to all subscribers
- Subscribers are users who have donated to campaigns or liked posts
- Real-time delivery to all subscribers

### Email Notifications

- Existing email functionality preserved
- Can be sent alongside in-app notifications
- Retry mechanism for failed emails

## API Endpoints

### GET /api/v1/notifications

- List user's notifications
- Supports unread-only filter

### GET /api/v1/notifications/unread-count

- Get current unread count
- Updates real-time count

### PATCH /api/v1/notifications/:id/read

- Mark notification as read
- Updates badge count

### POST /api/v1/notifications/broadcast

- Send notification to all subscribers
- Organization users only

### POST /api/v1/notifications/test

- Send test notification
- For testing real-time functionality

## Socket.IO Events

### Client to Server

- `notification:acknowledge` - Acknowledge notification receipt

### Server to Client

- `notification:new` - New notification received
- `notification:count` - Updated unread count

## Database Schema

The notifications table includes:

- `notificationId` - Unique identifier
- `userId` - Target user
- `type` - 'email' or 'inApp'
- `category` - Notification category
- `priority` - low, medium, high, critical
- `title` - Notification title
- `message` - Notification content
- `data` - JSON payload
- `readAt` - When marked as read
- `deliveryStatus` - pending, sent, failed, delivered

## Setup Instructions

### Backend Dependencies

```bash
npm install socket.io ioredis
```

### Frontend Dependencies

```bash
npm install socket.io-client
```

### Environment Variables

```env
# Backend
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
FRONTEND_URL=http://localhost:5173

# Frontend
REACT_APP_API_URL=http://localhost:3000
```

## Usage Examples

### Sending a Test Notification

```javascript
// Frontend
await testNotification();

// Backend
await notificationService.createAndDispatch({
  userId: "user-id",
  type: "inApp",
  category: "system",
  title: "Test",
  message: "Test notification",
});
```

### Broadcasting to Subscribers

```javascript
// Frontend
await broadcastNotification({
  title: "New Campaign",
  message: "Check out our latest campaign!",
  category: "campaign",
  priority: "medium",
});

// Backend
await notificationService.broadcastToSubscribers({
  organizerId: "organizer-id",
  category: "campaign",
  title: "New Campaign",
  message: "Check out our latest campaign!",
});
```

## Testing

1. Start the backend server
2. Start the frontend development server
3. Login as a user
4. Go to notifications page
5. Click "Test Notification" button
6. Verify notification appears in real-time
7. Check badge count updates

## Troubleshooting

### Socket Connection Issues

- Check CORS configuration
- Verify JWT token is valid
- Check network connectivity

### Badge Not Updating

- Check localStorage permissions
- Verify Socket.IO connection
- Check browser console for errors

### Notifications Not Sending

- Check database connection
- Verify user authentication
- Check Socket.IO server status

## Future Enhancements

1. **Redis Adapter** - Enable for multi-server scaling
2. **Push Notifications** - Browser push notifications
3. **Notification Templates** - Predefined notification formats
4. **Analytics** - Notification delivery and engagement metrics
5. **Batching** - Batch multiple notifications
6. **Scheduling** - Schedule notifications for later delivery


