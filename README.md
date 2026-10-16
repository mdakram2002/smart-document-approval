# Smart Document Approval and Workflow Management System

A full-stack web application for managing document approval workflows with role-based access control, sequential approval stages, notifications, and comprehensive audit trails.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Application Architecture](#application-architecture)
- [Folder Structure](#folder-structure)
- [Prerequisites](#prerequisites)
- [Installation and Setup](#installation-and-setup)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Seed Data and Demo Credentials](#seed-data-and-demo-credentials)
- [User Roles and Permissions](#user-roles-and-permissions)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Document Status Transitions](#document-status-transitions)
- [Approval Workflow Design](#approval-workflow-design)
- [File Upload Security](#file-upload-security)
- [Testing](#testing)
- [Running the Application](#running-the-application)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)

## Overview

This application enables organizations to:
- Create and submit documents for approval
- Configure sequential approval workflows
- Track approval decisions and progress
- Maintain complete audit trails
- Send notifications to relevant users
- Manage users and their permissions

## Key Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control (RBAC)
- **Document Management**: Create, edit, submit, and track documents
- **Sequential Approval Engine**: Configurable multi-stage approval workflows
- **Real-time Notifications**: In-app notification system for workflow events
- **Audit Trail**: Complete history of all application events
- **Role-Specific Dashboards**: Customized views for Admins, Submitters, and Approvers
- **Secure File Uploads**: Validated attachment handling with size and type restrictions
- **Responsive UI**: Modern, accessible interface built with React and Tailwind CSS

## Technology Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for build tooling
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Axios** for API communication
- **Lucide React** for icons

### Backend
- **Node.js** with Express.js
- **TypeScript**
- **Prisma ORM** for database access
- **PostgreSQL** as the database
- **JWT** for authentication
- **bcrypt** for password hashing
- **Multer** for file uploads
- **Zod** for validation

### Testing
- **Playwright** for end-to-end testing

## Application Architecture

The application follows a layered architecture:

```
┌─────────────────────────────────────────┐
│           Frontend (React)              │
│  - UI Components                         │
│  - State Management (Auth Context)       │
│  - API Client (Axios)                    │
└─────────────────┬───────────────────────┘
                  │ HTTP/REST API
┌─────────────────┴───────────────────────┐
│           Backend (Express)              │
│  - Routes (API Endpoints)                │
│  - Controllers (Request Handling)        │
│  - Services (Business Logic)             │
│  - Middleware (Auth, Validation)        │
└─────────────────┬───────────────────────┘
                  │ Prisma ORM
┌─────────────────┴───────────────────────┐
│         Database (PostgreSQL)            │
│  - Users                                 │
│  - Documents                             │
│  - Workflows                             │
│  - Approvals                             │
│  - Notifications                         │
│  - Audit Logs                            │
└─────────────────────────────────────────┘
```

## Folder Structure

```
smart-document-approval/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts             # Seed data script
│   ├── src/
│   │   ├── middleware/         # Auth, error handling
│   │   ├── routes/             # API route handlers
│   │   ├── services/           # Business logic
│   │   ├── types/              # TypeScript definitions
│   │   ├── utils/              # Utilities (validation, env)
│   │   └── index.ts            # Server entry point
│   ├── uploads/                # File upload directory
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── e2e/                    # Playwright tests
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── contexts/           # React contexts (Auth)
│   │   ├── lib/                # API client
│   │   ├── pages/              # Page components
│   │   ├── types/              # TypeScript types
│   │   ├── App.tsx             # Main app component
│   │   └── index.css           # Global styles
│   ├── .env.example
│   ├── package.json
│   ├── playwright.config.ts
│   └── tailwind.config.js
└── README.md
```

## Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher)
- **npm** or **yarn**
- **Git**

## Installation and Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd smart-document-approval
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### 4. Install Playwright Browsers

```bash
cd frontend
npx playwright install
```

## Environment Configuration

### Backend Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smart_document_approval?schema=public"

# JWT Configuration
JWT_ACCESS_SECRET="your-super-secret-access-key-min-32-chars-long"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-chars-long"
ACCESS_TOKEN_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"

# File Upload
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=5242880

# CORS
CORS_ORIGIN="http://localhost:5173"
```

### Frontend Environment Variables

Copy `frontend/.env.example` to `frontend/.env` and configure:

```env
VITE_API_URL=http://localhost:5000/api
```

## Database Setup

### 1. Create PostgreSQL Database

```sql
CREATE DATABASE smart_document_approval;
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Run Prisma Migrations

```bash
npx prisma migrate deploy
```

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Seed the Database

```bash
npm run prisma:seed
```

## Seed Data and Administrator Setup

One active Admin account already exists in the configured local database. To set/reset its development login, put the same Admin email and a unique password of at least 12 characters in `backend/.env` as `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`, then run `npm run prisma:seed` from `backend/`. The seed upserts only that account and does not create sample users or documents. Public registration creates SUBMITTER accounts; an administrator can assign APPROVER or ADMIN roles through User Management.

```env
SEED_ADMIN_EMAIL="your-admin-email@example.com"
SEED_ADMIN_NAME="Local Administrator"
SEED_ADMIN_PASSWORD="your-own-unique-password-of-12-or-more-characters"
```

Sign in at the regular Login page with the configured email and password. The seed never prints the password.

## User Roles and Permissions

### Admin
- Manage users and assign roles
- Activate or deactivate user accounts
- Configure approval workflows
- View organization-wide documents and statistics
- View audit logs
- Monitor approval activity

### Submitter
- Create documents
- Save and edit their own drafts
- Upload attachments
- Submit documents for approval
- View their own documents and approval history
- Withdraw documents when permitted
- Edit and resubmit documents returned for changes

### Approver
- View documents assigned to them at the current approval stage
- Review document details and attachments
- Approve, reject, or return documents with comments
- View their pending and completed approval tasks
- Review approval history for documents they are authorized to access

## Database Schema

### Core Tables

**Users**
- Stores user accounts with email, password hash, name, role, and status
- Relationships: Documents (submitter), ApprovalRecords (approver), Notifications, AuditEntries

**Documents**
- Stores document metadata including title, description, category, status, version
- Relationships: Submitter, Attachments, WorkflowInstance

**WorkflowDefinitions**
- Defines approval workflow templates with ordered stages
- Relationships: WorkflowStages, WorkflowInstances

**WorkflowStages**
- Individual approval stages within a workflow
- Relationships: WorkflowDefinition, ApprovalRecords

**WorkflowInstances**
- Tracks a specific document's approval cycle
- Relationships: Document, WorkflowDefinition, ApprovalRecords

**ApprovalRecords**
- Records approval decisions at each stage
- Relationships: WorkflowInstance, WorkflowStage, Approver

**Notifications**
- In-app notifications for users
- Relationships: Recipient (User)

**AuditEntries**
- Append-only audit trail of all events
- Relationships: Actor (User)

**Attachments**
- File attachment metadata
- Relationships: Document

## API Documentation

### Authentication

#### POST /api/auth/register
Register a new user account (defaults to Submitter role)

**Request:**
```json
{
  "email": "user@example.com",
  "password": "your-local-password",
  "name": "John Doe"
}
```

**Response:** 201 Created
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "SUBMITTER",
  "status": "ACTIVE"
}
```

#### POST /api/auth/login
Authenticate and receive access token

**Request:**
```json
{
  "email": "user@example.com",
  "password": "your-local-password"
}
```

**Response:** 200 OK
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "SUBMITTER",
    "status": "ACTIVE"
  },
  "accessToken": "jwt-token",
  "refreshToken": "jwt-token"
}
```

#### POST /api/auth/logout
Logout the current user (requires authentication)

**Response:** 200 OK
```json
{
  "message": "Logged out successfully"
}
```

#### GET /api/auth/me
Get current user profile (requires authentication)

**Response:** 200 OK
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "SUBMITTER",
  "status": "ACTIVE"
}
```

### Documents

#### GET /api/documents
List documents with pagination and filters (requires authentication)

**Query Parameters:**
- `status`: Filter by document status
- `category`: Filter by category
- `submitterId`: Filter by submitter (Admin only)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response:** 200 OK
```json
{
  "documents": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

#### POST /api/documents
Create a new document (requires Submitter or Admin role)

**Request:**
```json
{
  "title": "Document Title",
  "description": "Document description",
  "category": "General"
}
```

**Response:** 201 Created
```json
{
  "id": "uuid",
  "title": "Document Title",
  "description": "Document description",
  "category": "General",
  "status": "DRAFT",
  "version": 1,
  "submitterId": "uuid",
  "submitter": {...},
  "attachments": [],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### GET /api/documents/:id
Get document details (requires authentication and authorization)

**Response:** 200 OK
```json
{
  "id": "uuid",
  "title": "Document Title",
  "description": "Document description",
  "category": "General",
  "status": "PENDING_APPROVAL",
  "version": 1,
  "submitterId": "uuid",
  "submitter": {...},
  "attachments": [...],
  "workflowInstance": {
    "id": "uuid",
    "workflowDefinition": {...},
    "approvalRecords": [...]
  },
  "currentStage": 1,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "submittedAt": "2024-01-01T00:00:00Z"
}
```

#### PATCH /api/documents/:id
Update a document (requires owner or Admin role, only for Draft or Returned status)

**Request:**
```json
{
  "title": "Updated Title",
  "description": "Updated description"
}
```

**Response:** 200 OK
```json
{
  "id": "uuid",
  "title": "Updated Title",
  "description": "Updated description",
  "version": 2,
  ...
}
```

#### POST /api/documents/:id/submit
Submit a document for approval (requires owner or Admin role)

**Response:** 200 OK
```json
{
  "id": "uuid",
  "status": "PENDING_APPROVAL",
  "currentStage": 1,
  "submittedAt": "2024-01-01T00:00:00Z",
  ...
}
```

#### POST /api/documents/:id/withdraw
Withdraw a document from approval (requires owner or Admin role)

**Response:** 200 OK
```json
{
  "id": "uuid",
  "status": "DRAFT",
  "currentStage": null,
  "submittedAt": null,
  ...
}
```

#### GET /api/documents/:id/history
Get document audit history (requires authentication and authorization)

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "actor": {...},
    "action": "DOCUMENT_CREATED",
    "entityType": "Document",
    "entityId": "uuid",
    "timestamp": "2024-01-01T00:00:00Z"
  }
]
```

#### POST /api/documents/:id/attachments
Upload an attachment (requires owner or Admin role)

**Request:** multipart/form-data with file field

**Response:** 201 Created
```json
{
  "id": "uuid",
  "documentId": "uuid",
  "filename": "generated-filename.pdf",
  "originalName": "document.pdf",
  "mimeType": "application/pdf",
  "size": 12345,
  "path": "/uploads/file.pdf",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Approvals

#### GET /api/approvals/my-tasks
Get pending approval tasks for the current approver (requires Approver or Admin role)

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "workflowInstance": {
      "document": {...},
      "workflowDefinition": {...}
    },
    "workflowStage": {...},
    "approver": {...},
    "decision": "PENDING",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

#### POST /api/approvals/:id/approve
Approve a document at the current stage (requires assigned approver or Admin role)

**Response:** 200 OK
```json
{
  "id": "uuid",
  "decision": "APPROVED",
  "decisionAt": "2024-01-01T00:00:00Z",
  ...
}
```

#### POST /api/approvals/:id/reject
Reject a document (requires assigned approver or Admin role)

**Request:**
```json
{
  "comment": "Reason for rejection"
}
```

**Response:** 200 OK
```json
{
  "id": "uuid",
  "decision": "REJECTED",
  "comment": "Reason for rejection",
  "decisionAt": "2024-01-01T00:00:00Z",
  ...
}
```

#### POST /api/approvals/:id/return
Return a document for changes (requires assigned approver or Admin role)

**Request:**
```json
{
  "comment": "Changes requested"
}
```

**Response:** 200 OK
```json
{
  "id": "uuid",
  "decision": "RETURNED",
  "comment": "Changes requested",
  "decisionAt": "2024-01-01T00:00:00Z",
  ...
}
```

### Notifications

#### GET /api/notifications
Get notifications for the current user (requires authentication)

**Query Parameters:**
- `unreadOnly`: Set to "true" to get only unread notifications

**Response:** 200 OK
```json
{
  "notifications": [...],
  "unreadCount": 5
}
```

#### PATCH /api/notifications/:id/read
Mark a notification as read (requires authentication)

**Response:** 200 OK
```json
{
  "id": "uuid",
  "isRead": true,
  ...
}
```

#### POST /api/notifications/read-all
Mark all notifications as read (requires authentication)

**Response:** 200 OK
```json
{
  "message": "All notifications marked as read"
}
```

### Dashboard

#### GET /api/dashboard/summary
Get dashboard statistics (requires authentication)

**Response:** 200 OK (varies by role)

**Admin Response:**
```json
{
  "totalDocuments": 100,
  "pendingDocuments": 20,
  "approvedDocuments": 60,
  "rejectedDocuments": 15,
  "returnedDocuments": 5,
  "activeUsers": 10,
  "pendingApprovals": 20,
  "recentActivity": [...]
}
```

**Submitter Response:**
```json
{
  "totalDocuments": 10,
  "drafts": 2,
  "pendingApprovals": 3,
  "approvedDocuments": 4,
  "rejectedDocuments": 1,
  "returnedDocuments": 0,
  "recentDocuments": [...]
}
```

**Approver Response:**
```json
{
  "pendingTasks": 5,
  "completedTasks": 15,
  "recentApprovals": [...]
}
```

### Users (Admin Only)

#### GET /api/users
List all users (requires Admin role)

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "SUBMITTER",
    "status": "ACTIVE",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

#### PATCH /api/users/:id
Update user details (requires Admin role)

**Request:**
```json
{
  "name": "Updated Name",
  "role": "APPROVER",
  "status": "ACTIVE"
}
```

**Response:** 200 OK
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Updated Name",
  "role": "APPROVER",
  "status": "ACTIVE",
  ...
}
```

#### PATCH /api/users/:id/status
Activate or deactivate a user (requires Admin role)

**Request:**
```json
{
  "status": "INACTIVE"
}
```

**Response:** 200 OK
```json
{
  "id": "uuid",
  "status": "INACTIVE",
  ...
}
```

### Workflows (Admin Only)

#### GET /api/workflows
List all workflow definitions (requires Admin role)

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "name": "Standard Approval",
    "description": "Two-stage approval",
    "category": "General",
    "isActive": true,
    "stages": [...],
    "_count": {
      "instances": 10
    }
  }
]
```

#### POST /api/workflows
Create a new workflow (requires Admin role)

**Request:**
```json
{
  "name": "New Workflow",
  "description": "Workflow description",
  "category": "Finance",
  "stages": [
    {
      "name": "Manager Review",
      "description": "First approval",
      "approverId": "uuid"
    },
    {
      "name": "Director Review",
      "description": "Final approval",
      "approverId": "uuid"
    }
  ]
}
```

**Response:** 201 Created
```json
{
  "id": "uuid",
  "name": "New Workflow",
  "description": "Workflow description",
  "category": "Finance",
  "isActive": true,
  "stages": [...]
}
```

#### POST /api/workflows/:id/activate
Activate a workflow (requires Admin role)

**Response:** 200 OK
```json
{
  "id": "uuid",
  "isActive": true,
  ...
}
```

#### POST /api/workflows/:id/deactivate
Deactivate a workflow (requires Admin role)

**Response:** 200 OK
```json
{
  "id": "uuid",
  "isActive": false,
  ...
}
```

### Audit Logs (Admin Only)

#### GET /api/audit-logs
Get audit log entries (requires Admin role)

**Query Parameters:**
- `action`: Filter by action type
- `entityType`: Filter by entity type
- `actorId`: Filter by actor
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)

**Response:** 200 OK
```json
{
  "auditEntries": [
    {
      "id": "uuid",
      "actor": {...},
      "action": "DOCUMENT_CREATED",
      "entityType": "Document",
      "entityId": "uuid",
      "previousState": null,
      "newState": "{\"title\":\"Document Title\"}",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

## Document Status Transitions

### Valid State Transitions

```
DRAFT
  ↓ (Submit)
PENDING_APPROVAL
  ↓ (Approve at all stages)
APPROVED
  ↓ (Reject at any stage)
REJECTED
  ↓ (Return for changes)
RETURNED_FOR_CHANGES
  ↓ (Edit and resubmit)
PENDING_APPROVAL
```

### Transition Rules

1. **Draft → Pending Approval**: Document can be submitted when:
   - Status is DRAFT or RETURNED_FOR_CHANGES
   - An active workflow exists for the document's category
   - The submitter is the document owner or an admin

2. **Pending Approval → Approved**: Document is approved when:
   - All approval stages are completed
   - All approvers have approved
   - No stage was rejected or returned

3. **Pending Approval → Rejected**: Document is rejected when:
   - Any approver rejects at their assigned stage
   - A rejection reason is provided
   - No further approvals are allowed in that workflow instance

4. **Pending Approval → Returned for Changes**: Document is returned when:
   - Any approver returns for changes at their assigned stage
   - A comment explaining required changes is provided
   - The document can be edited and resubmitted

5. **Returned for Changes → Pending Approval**: Document can be resubmitted when:
   - The owner edits the document
   - A new workflow revision is created
   - Previous approval decisions are preserved for reference

6. **Pending Approval → Draft**: Document can be withdrawn when:
   - The workflow permits withdrawal
   - The submitter is the document owner or an admin
   - The document has not yet been approved

## Approval Workflow Design

### Workflow Execution Strategy

1. **Document Submission**:
   - Validate document and required fields
   - Find active workflow for document category
   - Create workflow instance
   - Create approval records for each stage
   - Set document status to PENDING_APPROVAL
   - Set current stage to 1
   - Notify assigned approver
   - Record submission in audit history

2. **Approval Decision**:
   - Authenticate current user
   - Verify user is assigned approver for current stage
   - Verify document is awaiting that stage's decision
   - Validate required comments/decision fields
   - Record approval decision
   - Advance to next stage if approved, or mark final status
   - Notify next approver or submitter
   - Record event in audit history

### Transaction Strategy

All multi-step workflow operations use PostgreSQL transactions to ensure:
- Atomicity: All related changes succeed or fail together
- Consistency: Database remains in a valid state
- Isolation: Concurrent operations don't interfere
- Durability: Committed changes persist

Example transaction for document approval:
```typescript
await prisma.$transaction(async (tx) => {
  // Update approval record
  await tx.approvalRecord.update({...});
  
  // Check if last stage
  if (isLastStage) {
    // Mark document approved
    await tx.document.update({...});
    // Mark workflow instance complete
    await tx.workflowInstance.update({...});
  } else {
    // Advance to next stage
    await tx.document.update({...});
  }
});
```

### Concurrency Protection

- Database constraints prevent duplicate approvals
- Conditional updates check current state before applying changes
- Transactions prevent race conditions during state transitions
- Optimistic locking via version numbers where applicable

## File Upload Security

### Security Measures

1. **File Type Validation**:
   - Allowed extensions: .pdf, .doc, .docx, .txt, .jpg, .jpeg, .png
   - MIME type validation on upload
   - Server-controlled filename generation

2. **Size Limits**:
   - Maximum file size: 5MB (configurable)
   - Enforced at both application and web server level

3. **Path Security**:
   - Files stored outside public directory
   - Server-controlled upload directory
   - Prevention of path traversal attacks

4. **Access Control**:
   - Authorization required for download
   - File access validated against document ownership
   - No direct public access to upload directory

5. **Future Improvements**:
   - Replace local storage with cloud object storage (S3, etc.)
   - Implement virus scanning
   - Add file content validation (magic bytes)
   - Implement file encryption at rest

## Testing

### Running Playwright Tests

```bash
cd frontend
npm run test:e2e
```

Backend validation and workflow rule tests:

```bash
cd backend
npm test
npm run build
```

### Test Coverage

The test suite covers:

1. **Authentication**
   - User registration and login
   - Invalid credential rejection
   - Protected route access control
   - Logout functionality

2. **Authorization**
   - Role-based page access
   - Admin-only endpoints
   - Submitter restrictions
   - Approver permissions

3. **Document Management**
   - Document creation
   - Document viewing
   - Draft editing
   - Document filtering

4. **Approval Workflow**
   - Pending task viewing
   - Document approval
   - Approval timeline display

### Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## Docker Setup

### Using Docker Compose

The application includes Docker configuration for easy deployment:

```bash
# Build and start all services
docker-compose up --build

# Stop services
docker-compose down

# Stop services and remove volumes
docker-compose down -v
```

This will start:
- PostgreSQL database on port 5432
- Backend API on port 5000
- Frontend application on port 5173

The Docker setup automatically:
- Runs database migrations
- Generates Prisma client
- Seeds the database with demo data
- Starts both frontend and backend servers

### Manual Docker Builds

**Backend:**
```bash
cd backend
docker build -t smart-doc-backend .
docker run -p 5000:5000 --env-file .env smart-doc-backend
```

**Frontend:**
```bash
cd frontend
docker build -t smart-doc-frontend .
docker run -p 5173:5173 --env-file .env smart-doc-frontend
```

## Running the Application

### Start Backend

```bash
cd backend
npm run dev
```

Backend runs on http://localhost:5000

### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on http://localhost:5173

### Production Build

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

## Known Limitations

1. **Email Notifications**: The application currently uses in-app notifications only. Email notifications would require an email service integration.

2. **File Storage**: Files are stored locally. For production deployment, cloud object storage (AWS S3, etc.) is recommended.

3. **Refresh Tokens**: The refresh token strategy is not utilized in the frontend. A more complete implementation would include refresh and revocation.

4. **Real-time Updates**: The application does not use WebSockets or similar technology for real-time updates. Users must refresh to see new notifications.

5. **Advanced Workflow Features**: Features like conditional routing and approval delegation are not implemented. Stage group approval requires every assigned approver to approve.

6. **Document Versioning**: The current version tracking is basic. A more sophisticated version control system with diff viewing would be beneficial.

## Current implementation notes (2026-10-16)

- Configure workflow stages with active approver assignments in the Admin Workflow page. Every approver assigned to a stage must approve before the next stage activates. A rejection or return ends that revision. Resubmission creates a new workflow revision and keeps the old decisions. Unused workflow configurations can be edited; workflows already used by documents are immutable, so create a new workflow for future submissions.
- The schema-only baseline is `backend/prisma/migrations/20261015000000_baseline`; the stage assignment migration is `backend/prisma/migrations/20261016000000_stage_approver_assignments`. Fresh databases can run `npx prisma migrate deploy`. For a pre-existing database with the prior schema, first mark the baseline applied with `npx prisma migrate resolve --applied 20261015000000_baseline`, then run `npx prisma migrate deploy`. The configured local database has been baselined and both migrations verified.
- The seed is non-destructive and only ensures an administrator. Copy `backend/.env.example` to `.env`, set unique secrets and `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, and `SEED_ADMIN_PASSWORD`, then run `npm run prisma:seed`. It will update that email to the configured administrator role and password; it does not create demo users or sample documents.
- Create Submitter and Approver accounts through public registration (SUBMITTER by default), then have the administrator assign APPROVER using User Management. No demo passwords are provided.
- Backend unit tests cover registration role stripping, workflow configuration validation, current-task authorization, sequential stage advancement, final approval, rejection, and return rules. Database-backed API integration coverage still needs to be added and run against an isolated test database. Browser tests require Playwright Chromium and `E2E_ADMIN_*`, `E2E_SUBMITTER_*`, or `E2E_APPROVER_*` credentials; set `E2E_ALLOW_DATABASE_WRITES=true` only when the backend points at an isolated test database.

## Future Improvements

1. **Enhanced Workflow Designer**: A visual workflow builder UI for creating complex approval flows.

2. **Email Integration**: SMTP or email service integration for email notifications.

3. **Real-time Updates**: WebSocket integration for live notifications and status updates.

4. **Cloud Storage**: Integration with AWS S3 or similar for file storage.

5. **Advanced Analytics**: More detailed reporting and analytics dashboard.

6. **Document Templates**: Pre-defined document templates for common use cases.

7. **Bulk Operations**: Support for bulk document actions and approvals.

8. **API Rate Limiting**: Implement rate limiting to prevent abuse.

9. **Caching**: Add Redis caching for frequently accessed data.

10. **Internationalization**: Multi-language support for the UI.

## License

This project is created for the Edvexa Software Developer Intern technical assessment.

## Support

For issues or questions, please refer to the project documentation or contact the development team.
