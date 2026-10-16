# Local setup

## Requirements

- Node.js 20 or later and npm
- PostgreSQL 14 or later
- PowerShell on Windows, or a POSIX shell on macOS/Linux

## Install

```powershell
cd C:\Users\hp\GitHub\smart-document-approval
cd backend
npm ci
Copy-Item .env.example .env
```

Edit `backend/.env` and set the PostgreSQL connection string, two different random JWT secrets of at least 32 characters, and the initial Admin email, name, and a unique password of at least 12 characters. Keep `.env` private; it is ignored by Git. Do not use the example placeholder values.

Create the PostgreSQL database named by `DATABASE_URL`, then apply migrations and generate the client:

```powershell
npx prisma migrate deploy
npx prisma generate
```

For an existing database containing the original schema but no migration history, mark only the checked-in baseline as applied before deploying additive migrations:

```powershell
npx prisma migrate resolve --applied 20261015000000_baseline
npx prisma migrate deploy
```

Do not baseline a fresh or unrelated database. The migrations preserve existing application records.

## Create the development Admin

After setting `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, and `SEED_ADMIN_PASSWORD` in `backend/.env`:

```powershell
cd backend
npm run prisma:seed
```

The command upserts only that Admin account. Use the same email and password on the existing Login page. Public registration always creates a SUBMITTER; an Admin assigns APPROVER or ADMIN in **Manage Users / Roles**. The seed rejects the `.env.example` placeholders and requires a password of at least 12 characters. Never place production credentials in source files or frontend environment variables; use the deployment secret manager in production.

## Frontend setup

```powershell
cd ..\frontend
npm ci
Copy-Item .env.example .env
npx playwright install chromium
```

The local frontend default points to `http://localhost:5000/api`.

## Run locally

Terminal 1:

```powershell
cd backend
npm run dev
```

Terminal 2:

```powershell
cd frontend
npm run dev
```

Open `http://localhost:5173` and sign in using the seeded Admin account or a registered user.

## Approval workflow

1. An Admin opens **Manage Users / Roles** and changes eligible registered users to APPROVER.
2. The Admin opens **Workflow Configuration & Approver Assignment**, creates ordered stages, and assigns one or more active Approvers to each stage.
3. A Submitter creates a draft and submits it. The backend chooses the active category workflow (or General fallback), creates a revision, records audit history, and notifies first-stage approvers.
4. Every approver assigned to the active stage must approve. The backend then activates the next stage and notifies its approvers; future stages cannot act early.
5. Once every stage approves, the document becomes APPROVED. An approver can instead reject or return it with a required comment. A returned Submitter may edit and resubmit; the new workflow revision preserves the previous decision history.
6. A Submitter may withdraw a pending document. Remaining tasks are marked CANCELLED, approvers are notified, and the action is audited.

Admin can view all documents and audit history, but cannot approve, reject, or return a document. API authorization and ownership checks enforce these rules even when a client bypasses the UI.

## Verification commands

```powershell
cd backend
npm test
npm run build
npx prisma migrate status
$env:RUN_DB_INTEGRATION_TESTS = 'true'
npm run test:integration
```

The database integration suite writes uniquely tagged users, documents, and workflows to the configured database and removes those fixtures afterward. Prefer a disposable test database. Only set `RUN_DB_INTEGRATION_TESTS=true` for a database where this test data is permitted.

```powershell
cd frontend
npm run build
npm run lint
npm run test:e2e
```

Playwright requires Chromium. Tests needing a role account use `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`, `E2E_SUBMITTER_EMAIL`/`E2E_SUBMITTER_PASSWORD`, or `E2E_APPROVER_EMAIL`/`E2E_APPROVER_PASSWORD`. Browser registration, document-creation, and workflow-configuration tests also require `E2E_ALLOW_DATABASE_WRITES=true`; use that only with a disposable test database.

## Docker Compose

For local containers, configure `backend/.env` as above and create a root `.env` with `POSTGRES_PASSWORD` (and optionally `POSTGRES_USER`). Then run:

```powershell
docker compose up --build
```

The compose stack runs migrations and the Admin seed. It does not insert demo users or documents. Keep both environment files private.
