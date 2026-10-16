# Frontend

This React application uses the backend API at `VITE_API_URL` (default: `http://localhost:5000/api`). Copy `.env.example` to `.env` to override it for local development.

Run the development server with `npm run dev`. Use `npm run build` for a production build, `npm run lint` for Oxlint, and `npm run test:e2e` for Playwright browser tests.

Role-specific browser tests use `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`, `E2E_SUBMITTER_EMAIL`/`E2E_SUBMITTER_PASSWORD`, and `E2E_APPROVER_EMAIL`/`E2E_APPROVER_PASSWORD`. Database-writing browser tests are opt-in through `E2E_ALLOW_DATABASE_WRITES=true` and should only run against a disposable test database. See the repository [SETUP.md](../SETUP.md) for Admin setup, database migrations, and the complete workflow.
