# Edvexa assignment audit

Verified 2026-10-16 using the executed backend unit tests, an isolated PostgreSQL API integration run, and the isolated full Playwright run. PASS means the behavior was exercised by an automated API or browser test, not inferred from source alone. Test databases and temporary fixtures were removed after the runs.

| # | Requirement | Status | Verification |
|---|---|---|---|
| 1 | Authentication and roles | **PASS** | Integration test used the Admin seed helper and login API, checked public registration cannot set ADMIN, role changes, token-backed `/auth/me`, and server-side logout revocation. Playwright Admin, Submitter, and Approver sign-in/navigation cases passed. |
| 2 | Document management | **PASS** | API integration created and edited a draft, uploaded/downloaded a real attachment, verified the server path is not exposed, checked non-owner denial, submitted, returned and edited/resubmitted a revision, and withdrew. Browser tests covered create and editing a tagged owned draft. |
| 3 | Admin workflow configuration | **PASS** | API integration configured and assigned a two-stage workflow, rejected an inactive approver, allowed edits before use, then rejected edits after use. Playwright verified Admin can open Workflow Configuration and separately created/assigned a two-stage workflow in the UI. |
| 4 | Approval actions and sequence | **PASS** | API integration verified ordered stages, comments, final APPROVED status, rejection, return, duplicate, simultaneous duplicate (one 200 and one 409), out-of-order conflicts, wrong-actor denial, and Admin denial. Full browser acceptance completed configuration, submit, staged task/notification checks, approvals, and status verification. |
| 5 | Notifications | **PASS** | Integration verified first-stage notification, no premature second-stage notification, second-stage assignment, submitter decision notifications, cancellation notifications for ended workflows, withdrawal notifications, private read access, and unread counts. |
| 6 | Audit history | **PASS** | Integration verified document submission/decision comments, return history, login/logout/user events, and Admin audit listing. Playwright verified the Admin Audit History page. |
| 7 | Dashboard and reporting | **PASS** | Integration verified status/category/submitter/date filters against database results, date-only full-day bounds, invalid ranges, and active pending counts. Full browser acceptance filtered approved results by status, category, submitter, and date and checked the resulting counts. |
| 8 | Database and APIs | **PASS** | `npx prisma validate` passed; `npx prisma migrate status` reported five migrations and an up-to-date schema. The isolated PostgreSQL integration test passed, covering input validation, authorization, ownership, and conflict HTTP statuses. Backend build passed. |
| 9 | Automated testing | **PASS** | `npm test` reported 8 passed and 1 database integration test skipped by default. The separately enabled isolated PostgreSQL integration run reported 1 passed. Playwright reported 20 passed, 0 skipped, and 0 failed, including registration/document writes, owned draft editing, and the complete two-stage browser acceptance. |
| 10 | Documentation | **PASS** | README and SETUP include Admin seed/login, roles, full workflow, Prisma schema/migrations, API routes/filters, environment handling, and test commands. Docker Compose uses private environment files and no fixed JWT/Admin password. |

## Commands and results

- `npm test` (`backend`): 8 passed, 1 integration test skipped by default.
- Isolated PostgreSQL QA: created a random `smart_document_approval_qa_*` database, ran `npx prisma migrate deploy`, and ran `npm run test:integration` with `RUN_DB_INTEGRATION_TESTS=true` (1 passed); the database was dropped after testing.
- `npm run build` (`backend`): passed.
- `npx prisma validate`: passed.
- `npx prisma migrate status`: five migrations found, schema up to date.
- `npm run build` (`frontend`): passed.
- `npm run lint` (`frontend`): exit 0, zero warnings (11 before this audit; 1 memoization dependency and 10 asynchronous data-load effects fixed).
- `npm run test:e2e -- --workers=1 --retries=0` (`frontend`, temporary fixtures on the isolated database): 20 passed, 0 skipped, 0 failed; temporary users, documents, workflows, notifications, audit records, and the test database were removed.
- The full browser acceptance verifies two distinct approvers, task and notification sequencing, stage comments, final approval, and dashboard status/category/submitter/date filters.
- `docker version`: Docker CLI is installed, but Docker Desktop's Linux engine is unavailable (`dockerDesktopLinuxEngine` pipe missing), so image builds could not run.

Browser tests that create accounts or documents remain opt-in through `E2E_ALLOW_DATABASE_WRITES=true`; run them only against a disposable test database. **Docker image build: BLOCKED** because Docker Desktop's Linux daemon is unavailable, although the Docker CLI is installed.
