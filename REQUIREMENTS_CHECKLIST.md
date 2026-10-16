# Implementation checklist

Status from code inspection and verification on 2026-10-16.

| Area | Initial finding | Status |
|---|---|---|
| Authentication and roles | Public registration defaults to submitter; role is fetched from `/auth/me` on session restore and JWT checked against active DB user. No server-side token revocation or refresh flow. One active Admin exists in the configured DB; seed credential variables are absent from its `.env`. | Partial |
| Document lifecycle | Draft/edit/submit/return/resubmit/download exist; submit, edit, withdraw, decision operations include transactional safeguards. | Partial |
| Workflow configuration | Stage approvers persist; Admin can create, view, and edit unused sequential workflows with one or more active approvers per stage. Workflows already used by documents are immutable; create another for future submissions. | Partial |
| Sequential approvals | Only assigned current-stage approvers can decide; every approver at a stage must approve; serializable transaction and conditional writes guard concurrency. | Implemented, integration unverified |
| Notifications | Private list/read endpoints; submit, return, decision and stage activation notifications are written transactionally. No reassignment action exists. | Partial |
| Audit | Create/edit/submit/withdraw/decision and workflow create/update/activate/deactivate events recorded; admin list and per-document history exist. User management events remain incomplete. | Partial |
| Dashboards and filters | Role-aware database aggregates; list supports status/category/submitter/date and pagination validation. Dashboard-specific filter controls are limited. | Partial |
| UI and navigation | Role routes and role-specific navigation exist; workflow configuration supports stage assignments and editing unused definitions. Several older pages still log errors to console. | Partial |
| Schema and migration | Introspected schema-only baseline and additive stage assignment migration created and applied without data reset. | Implemented |
| Tests and build | Six backend validation/transition-rule tests pass. Browser tests use role-specific environment variables and database-writing tests are opt-in; Playwright could not run because the Chromium binary is absent. API integration tests are still missing. | Partial |
| Setup docs and secrets | Non-destructive configurable admin seed; safe env examples; role setup and workflow policy documented. | Implemented |

## Verification

Verified: backend TypeScript build, frontend production build, frontend lint (warnings only), six backend tests, Prisma migration deploy and migration status. Playwright was attempted but every case failed to launch because the required Chromium executable is not installed. No live API/UI role walkthrough or database integration test was run.
