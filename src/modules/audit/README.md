# AuditLog Module Implementation Plan

## Overview

The AuditLog module will provide comprehensive logging of significant user actions and system events for security auditing, compliance, and monitoring purposes. This module will be integrated throughout the application to track important activities.

## Database Schema

### AuditLog Table

```sql
CREATE TABLE "auditLogs" (
    "logId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NULL REFERENCES "users"("userId") ON DELETE SET NULL,
    "actionType" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" UUID NULL,
    "details" JSONB NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" VARCHAR(45) NULL,
    "userAgent" VARCHAR(500) NULL,
    "sessionId" VARCHAR(255) NULL
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_user_id ON "auditLogs"("userId");
CREATE INDEX idx_audit_logs_action_type ON "auditLogs"("actionType");
CREATE INDEX idx_audit_logs_entity_type ON "auditLogs"("entityType");
CREATE INDEX idx_audit_logs_timestamp ON "auditLogs"("timestamp");
CREATE INDEX idx_audit_logs_entity_id ON "auditLogs"("entityId");
```

### Action Types Enum

```sql
CREATE TYPE auditActionType AS ENUM(
    -- Authentication Actions
    'USER_LOGIN',
    'USER_LOGOUT',
    'USER_REGISTERED',
    'PASSWORD_CHANGED',
    'PASSWORD_RESET_REQUESTED',
    'PASSWORD_RESET_COMPLETED',
    'EMAIL_VERIFIED',
    'ACCOUNT_SUSPENDED',
    'ACCOUNT_ACTIVATED',

    -- Campaign Actions
    'CAMPAIGN_CREATED',
    'CAMPAIGN_UPDATED',
    'CAMPAIGN_DELETED',
    'CAMPAIGN_SUBMITTED',
    'CAMPAIGN_APPROVED',
    'CAMPAIGN_REJECTED',
    'CAMPAIGN_PUBLISHED',
    'CAMPAIGN_PAUSED',
    'CAMPAIGN_RESUMED',

    -- User Management Actions
    'USER_PROFILE_UPDATED',
    'USER_ROLE_CHANGED',
    'USER_PERMISSIONS_UPDATED',
    'ORGANIZATION_CREATED',
    'ORGANIZATION_UPDATED',

    -- Donation Actions
    'DONATION_MADE',
    'DONATION_REFUNDED',
    'DONATION_CANCELLED',

    -- System Actions
    'SYSTEM_BACKUP',
    'SYSTEM_MAINTENANCE',
    'CONFIGURATION_CHANGED',
    'SECURITY_ALERT',

    -- Outreach Actions
    'CONTACT_CREATED',
    'CONTACT_UPDATED',
    'CONTACT_DELETED',
    'SEGMENT_CREATED',
    'SEGMENT_UPDATED',
    'SEGMENT_DELETED',

    -- Notification Actions
    'NOTIFICATION_SENT',
    'NOTIFICATION_READ',
    'EMAIL_SENT',
    'SMS_SENT'
);
```

## Implementation Steps

### Phase 1: Core Infrastructure (Week 1)

#### Step 1.1: Database Migration

- [x] Create migration file: `016_create_audit_logs_table.sql`
- [x] Add auditActionType enum
- [x] Create auditLogs table with proper indexes
- [ ] Test migration rollback

#### Step 1.2: Core Module Structure

- [ ] Create module directory: `src/modules/audit/`
- [ ] Create basic files:
  - `audit.repository.js` - Database operations
  - `audit.service.js` - Business logic
  - `audit.controller.js` - API endpoints
  - `audit.routes.js` - Route definitions
  - `audit.validation.js` - Input validation
  - `audit.constants.js` - Action types and constants
  - `README.md` - Documentation

#### Step 1.3: Core Service Implementation

- [ ] Implement `createAuditLog()` method
- [ ] Implement `getAuditLogs()` with filtering and pagination
- [ ] Implement `getAuditLogsByUser()`
- [ ] Implement `getAuditLogsByEntity()`
- [ ] Add proper error handling and validation

#### Step 1.4: Repository Layer

- [ ] Implement database operations for audit logs
- [ ] Add proper transaction support
- [ ] Implement efficient querying with indexes
- [ ] Add data sanitization and validation

### Phase 2: Integration Framework (Week 2)

#### Step 2.1: Audit Middleware

- [ ] Create `audit.middleware.js` for automatic logging
- [ ] Implement request context capture
- [ ] Add IP address and user agent extraction
- [ ] Create session tracking

#### Step 2.2: Audit Helper Functions

- [ ] Create `audit.utils.js` with helper functions:
  - `logAction()` - Main logging function
  - `logUserAction()` - User-specific actions
  - `logSystemAction()` - System-level actions
  - `logSecurityEvent()` - Security-related events

#### Step 2.3: Context Management

- [ ] Implement request context to capture user info
- [ ] Add middleware to inject audit context
- [ ] Create audit context utilities

### Phase 3: Module Integration (Week 3)

#### Step 3.1: Auth Module Integration

- [ ] Integrate audit logging in `auth.service.js`:
  - User registration
  - Login/logout events
  - Password changes
  - Email verification
  - Account status changes

#### Step 3.2: Campaign Module Integration

- [ ] Integrate audit logging in `campaign.service.js`:
  - Campaign creation
  - Campaign updates
  - Campaign submission
  - Campaign approval/rejection
  - Campaign status changes

#### Step 3.3: User Module Integration

- [ ] Integrate audit logging in `user.service.js`:
  - Profile updates
  - Role changes
  - Permission updates
  - Organization management

### Phase 4: Advanced Features (Week 4)

#### Step 4.1: API Endpoints

- [ ] Implement GET `/api/audit/logs` - List audit logs
- [ ] Implement GET `/api/audit/logs/:logId` - Get specific log
- [ ] Implement GET `/api/audit/logs/user/:userId` - User-specific logs
- [ ] Implement GET `/api/audit/logs/entity/:entityType/:entityId` - Entity-specific logs
- [ ] Add proper authorization (admin-only access)

#### Step 4.2: Advanced Filtering

- [ ] Implement date range filtering
- [ ] Add action type filtering
- [ ] Add entity type filtering
- [ ] Implement search functionality
- [ ] Add export functionality (CSV/JSON)

#### Step 4.3: Performance Optimization

- [ ] Implement audit log archiving strategy
- [ ] Add log retention policies
- [ ] Optimize queries for large datasets
- [ ] Implement caching for frequently accessed logs

### Phase 5: Security & Compliance (Week 5)

#### Step 5.1: Security Features

- [ ] Implement audit log integrity checks
- [ ] Add tamper detection
- [ ] Implement secure log storage
- [ ] Add encryption for sensitive data in details

#### Step 5.2: Compliance Features

- [ ] Add GDPR compliance features
- [ ] Implement data retention policies
- [ ] Add audit log export for compliance
- [ ] Implement audit trail verification

#### Step 5.3: Monitoring & Alerts

- [ ] Implement suspicious activity detection
- [ ] Add alert system for critical events
- [ ] Create audit log monitoring dashboard
- [ ] Implement automated reporting

## File Structure

```
src/modules/audit/
├── README.md
├── audit.constants.js          # Action types and constants
├── audit.controller.js         # API endpoints
├── audit.middleware.js         # Request logging middleware
├── audit.repository.js         # Database operations
├── audit.routes.js            # Route definitions
├── audit.service.js           # Business logic
├── audit.utils.js             # Helper functions
├── audit.validation.js        # Input validation
└── __tests__/
    ├── audit.service.test.js
    ├── audit.repository.test.js
    └── audit.controller.test.js
```

## Key Features

### 1. Comprehensive Logging

- All significant user actions
- System events and changes
- Security-related activities
- Administrative operations

### 2. Flexible Data Storage

- JSONB details field for flexible data
- Structured action types
- Entity relationship tracking
- Timestamp and context information

### 3. Performance Optimized

- Proper database indexing
- Efficient querying
- Pagination support
- Archival strategies

### 4. Security Focused

- Tamper detection
- Secure storage
- Access control
- Data integrity

### 5. Compliance Ready

- GDPR compliance
- Data retention policies
- Audit trail verification
- Export capabilities

## Integration Points

### Existing Modules to Integrate With:

1. **Auth Module** - Login, registration, password changes
2. **Campaign Module** - Campaign lifecycle events
3. **User Module** - Profile and permission changes
4. **Notification Module** - Communication events
5. **Outreach Module** - Contact and segment management

### New Middleware Integration:

- Request context capture
- Automatic IP and user agent logging
- Session tracking
- Performance monitoring

## Testing Strategy

### Unit Tests

- Service layer business logic
- Repository layer database operations
- Validation functions
- Utility functions

### Integration Tests

- API endpoint functionality
- Database operations
- Middleware integration
- Cross-module integration

### Performance Tests

- Large dataset handling
- Query optimization
- Concurrent access
- Memory usage

## Security Considerations

1. **Access Control** - Only authorized users can view audit logs
2. **Data Protection** - Sensitive data encryption in details field
3. **Tamper Detection** - Hash-based integrity checks
4. **Retention Policies** - Automatic cleanup of old logs
5. **Audit Trail** - Log access to audit logs themselves

## Monitoring & Maintenance

1. **Regular Reviews** - Periodic audit log analysis
2. **Performance Monitoring** - Query performance tracking
3. **Storage Management** - Disk space monitoring
4. **Backup Strategy** - Audit log backup procedures
5. **Alert System** - Critical event notifications

## Future Enhancements

1. **Real-time Monitoring** - Live audit log streaming
2. **Advanced Analytics** - Pattern recognition and anomaly detection
3. **Machine Learning** - Automated threat detection
4. **Integration APIs** - Third-party security tool integration
5. **Compliance Reporting** - Automated compliance report generation
