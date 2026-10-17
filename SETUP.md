# Local setup

## Production deployment

The production frontend is hosted on Vercel, the API on Render, and the PostgreSQL database on Neon:

- Frontend: [https://smart-document-approval.vercel.app/](https://smart-document-approval.vercel.app/)
- Backend health check: [https://smart-document-approval.onrender.com/health](https://smart-document-approval.onrender.com/health)
- Database: Neon PostgreSQL (the connection string is private and must only be configured on Render)

### Connect the services

1. In Neon, open the project and copy its PostgreSQL connection string. Use the connection string shown by Neon (including `sslmode=require`); it should begin with `postgresql://` or `postgres://`.
2. In the Render backend service, set **Root Directory** to `backend`, **Build Command** to `npm ci && npx prisma generate && npm run build`, and **Start Command** to `npx prisma migrate deploy && npm start`.
3. Add these environment variables to the Render backend service:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Neon PostgreSQL connection string |
   | `NODE_ENV` | `production` |
   | `FRONTEND_URL` | `https://smart-document-approval.vercel.app` |
   | `CORS_ORIGIN` | `https://smart-document-approval.vercel.app` |
   | `JWT_ACCESS_SECRET` | A unique random secret of at least 32 characters |
   | `JWT_REFRESH_SECRET` | A different unique random secret of at least 32 characters |
   | `ACCESS_TOKEN_EXPIRES_IN` | `15m` |
   | `REFRESH_TOKEN_EXPIRES_IN` | `7d` |

   Render supplies `PORT` automatically. Enter the Neon URL as the variable value only; do not include quotes or the `DATABASE_URL=` prefix. Never put the Neon URL or JWT secrets in the frontend or commit them to Git. Saving the environment variables and deploying starts the migrations before the API.
4. In Vercel, set the project **Root Directory** to `frontend`, use the Vite framework preset, build command `npm run build`, and output directory `dist`. Add this environment variable for Production:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://smart-document-approval.onrender.com/api` |

   Redeploy the Vercel project after adding or changing this variable; Vite embeds it in the frontend build.
5. Confirm the backend is live by opening [https://smart-document-approval.onrender.com/health](https://smart-document-approval.onrender.com/health). It should return JSON containing `"status":"ok"`. Then open the Vercel site and register or sign in.

### Create the production Admin

Public registration creates Submitter accounts. To create the initial Admin in the **Neon database used by Render**, add these variables to the Render backend service:

| Variable | Value |
|---|---|
| `SEED_ADMIN_EMAIL` | The Admin login email you choose |
| `SEED_ADMIN_NAME` | The Admin's display name |
| `SEED_ADMIN_PASSWORD` | A unique password with at least 12 characters |

After the Render service has deployed and migrations have completed, open its Shell and run this command from the backend service directory:

```bash
npm run prisma:seed
```

The seed creates or updates only the Admin account in the database named by Render's `DATABASE_URL`. Log in at the Vercel site's regular Login page using `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. Keep the password private. Do not use a local development Admin account's credentials unless you seeded that same account into the production Neon database.

The backend currently stores uploaded attachments on its local filesystem. Render's filesystem is ephemeral by default, so uploads may be lost on restart or redeploy. Use persistent file storage for production attachments.

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

Playwright requires Chromium. Role tests use `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`, `E2E_SUBMITTER_EMAIL`/`E2E_SUBMITTER_PASSWORD`, `E2E_APPROVER_EMAIL`/`E2E_APPROVER_PASSWORD`, `E2E_APPROVER_TWO_EMAIL`/`E2E_APPROVER_TWO_PASSWORD`, and a unique `E2E_FIXTURE_TAG`. Create and remove the real role/document fixtures from `backend` with `node --loader ts-node/esm tests/e2eFixtures.ts create` and `node --loader ts-node/esm tests/e2eFixtures.ts remove`. Browser registration, document, and workflow tests require `E2E_ALLOW_DATABASE_WRITES=true`; point the backend at a disposable test database for those tests.

## Docker Compose

For local containers, configure `backend/.env` as above and create a root `.env` with `POSTGRES_PASSWORD` (and optionally `POSTGRES_USER`). Then run:

```powershell
docker compose up --build
```

The compose stack runs migrations and the Admin seed. It does not insert demo users or documents. Keep both environment files private.
