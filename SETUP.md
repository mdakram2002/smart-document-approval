# Quick Setup Guide

## Prerequisites

Make sure you have installed:
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm

## Initial Setup

1. **Clone and navigate to the project**
```bash
cd smart-document-approval
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Install frontend dependencies**
```bash
cd ../frontend
npm install
```

4. **Install Playwright browsers**
```bash
npx playwright install
```

## Database Setup

1. **Create PostgreSQL database**
```sql
CREATE DATABASE smart_document_approval;
```

2. **Configure backend environment**
```bash
cd ../backend
cp .env.example .env
```

Edit `.env` with your database credentials (default should work if PostgreSQL is running locally).

3. **Reinstall dependencies (to use stable Prisma version)**
```bash
npm install
```

4. **Run migrations**
```bash
npx prisma migrate deploy
```

For an existing database created before Prisma migrations were added, baseline its current schema first; `migrate deploy` reports P3005 on a non-empty unbaselined database. Do not reset the database to work around this.

For a database whose schema matches the original application schema, use the checked-in baseline:
```bash
npx prisma migrate resolve --applied 20261015000000_baseline
npx prisma migrate deploy
```

5. **Generate Prisma client**
```bash
npx prisma generate
```

5. **Seed the database**
```bash
npm run prisma:seed
```

## Frontend Environment

```bash
cd ../frontend
cp .env.example .env
```

The default configuration should work for local development.

## Running the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Note:** If you see TypeScript errors about Prisma types not being found, run:
```bash
npx prisma generate
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Access the application at http://localhost:5173

## Local accounts

Set `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, and a unique `SEED_ADMIN_PASSWORD` of at least 12 characters in `backend/.env` before running `npm run prisma:seed`. This non-destructive seed creates only that administrator. Register submitters using the app, then assign the Approver role in User Management.

## Running Tests

```bash
cd frontend
npm run test:e2e
```

## Docker Setup (Alternative)

If you prefer Docker:

```bash
docker-compose up --build
```

This will automatically set up PostgreSQL, run migrations, seed the database, and start both services.
