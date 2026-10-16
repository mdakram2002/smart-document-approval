# Edvexa assignment audit

Verified 2026-10-16 against the configured development PostgreSQL database. PASS means exercised by an automated API or browser test, not inferred from source alone.

| # | Requirement | Status | Verification |
|---|---|---|---|
| 1 | Authentication and roles | **PASS** | Integration test used the Admin seed helper and login API, checked public registration cannot set ADMIN, role changes, token-backed `/auth/me`, and server-side logout revocation. Playwright Admin, Submitter, and Approver sign-in/navigation cases passed. |
| 2 | Document management | **PASS** | API integration created and edited a draft, submitted, checked status, returned and edited/resubmitted a new revision, withdrew, and tested non-owner/Admin edits are forbidden. |
| 3 | Admin workflow configuration | **PASS** | API integration configured and assigned a two-stage workflow, rejected an inactive approver, allowed edits before use, then rejected edits after use. Playwright verified Admin can open Workflow Configuration and separately created/assigned a two-stage workflow in the UI. |
| 4 | Approval actions and sequence | **PASS** | API integration verified stage 1 then stage 2, comments, final APPROVED status, rejection, return, duplicate and out-of-order conflicts, wrong-actor denial, and Admin denial. |
| 5 | Notifications | **PASS** | Integration verified first-stage notification, no premature second-stage notification, second-stage assignment, submitter decision notifications, cancellation notifications for ended workflows, withdrawal notifications, private read access, and unread counts. |
| 6 | Audit history | **PASS** | Integration verified document submission/decision comments, return history, login/logout/user events, and Admin audit listing. Playwright verified the Admin Audit History page. |
| 7 | Dashboard and reporting | **PASS** | Integration verified status/category/submitter/date filters against database results, date-only full-day bounds, invalid ranges, and active pending counts. The filter form is included in the frontend build. |
| 8 | Database and APIs | **PASS** | Prisma schema validates; all five migrations are applied; the integration test covers input validation, authorization, ownership, and conflict HTTP statuses. Backend build passes. |
| 9 | Automated testing | **PASS** | Six backend unit tests pass. The PostgreSQL integration workflow passes. Full Playwright role/browser run: 15 passed, 4 skipped, 0 failed; the separate write-gated two-stage workflow UI test also passed. Skips are browser registration/document writes and a deliberately disabled arbitrary-draft edit test; API integration covers the lifecycle paths. |
| 10 | Documentation | **PASS** | README and SETUP include Admin seed/login, roles, full workflow, Prisma schema/migrations, API routes/filters, environment handling, and test commands. Docker Compose uses private environment files and no fixed JWT/Admin password. |

## Commands and results

- `npm test` (`backend`): 6 passed, 1 integration test skipped by default.
- `$env:RUN_DB_INTEGRATION_TESTS='true'; npm run test:integration` (`backend`): 1 passed against PostgreSQL; uniquely tagged records were removed.
- `npm run build` (`backend`): passed.
- `npx prisma validate`: passed.
- `npx prisma migrate status`: five migrations found, schema up to date.
- `npm run build` (`frontend`): passed.
- `npm run lint` (`frontend`): exit 0 with 11 warnings (10 set-state-in-effect warnings on data-fetching effects and one React Compiler memoization warning in MySubmissions).
- `npm run test:e2e -- --workers=1` (`frontend`, with temporary role fixtures): 15 passed, 4 skipped, 0 failed; temporary users, workflow, document, notifications, and audit records were removed.
- `npm run test:e2e -- --workers=1 --grep 'admin can configure two sequential stages'` (`frontend`, write-enabled for this single test only): 1 passed; fixtures removed afterward.

Browser tests that create additional accounts or documents remain opt-in through `E2E_ALLOW_DATABASE_WRITES=true`; run them only against a disposable test database. Docker image builds were not run.
