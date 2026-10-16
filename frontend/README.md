# Frontend

This React application uses the backend API at `VITE_API_URL` (default: `http://localhost:5000/api`). Copy `.env.example` to `.env` to override it for local development.

Run the development server with `npm run dev`. Use `npm run build` for a production build, `npm run lint` for Oxlint, and `npm run test:e2e` for Playwright browser tests.

Role-specific browser tests use Admin, Submitter, and two Approver credential pairs plus a unique `E2E_FIXTURE_TAG`. Create/remove the database fixtures with the helper documented in [SETUP.md](../SETUP.md). Database-writing browser tests require `E2E_ALLOW_DATABASE_WRITES=true` and a disposable test database. The suite includes the complete two-stage approval acceptance flow.
