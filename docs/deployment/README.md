# Deployment runbook

ThreatScope is prepared for a static Vercel frontend and a Render FastAPI backend with persistent PostgreSQL. Hosting accounts, provider authentication, the production origin, and any required billing approval must be supplied by the owner. No hosted infrastructure has been provisioned by this implementation.

## Backend on Render

1. Import `gupta-srishtii/ThreatScope` as a Blueprint using `render.yaml`. Review the selected compute/database plans and billing before creating resources. They are persistent paid-resource configurations, not a free-tier promise.
2. Set `ALLOWED_ORIGINS` to the exact HTTPS frontend URL, without a trailing slash. Multiple explicitly trusted origins can be comma-separated. Wildcards and HTTP origins fail startup in production. Do not allow arbitrary Vercel preview domains.
3. Render generates `API_KEY` and supplies the database URL through its secret settings. Retrieve the generated key privately for authorized workspace users. Never put it in Git, a Vite variable, a URL, or a build log. Rotation means replacing this value and restarting the backend.
4. The build runs `uv sync --frozen --no-dev`; the service runs one Uvicorn worker with a concurrency limit. `/api/health` checks a database connection. Production documentation/OpenAPI endpoints are disabled. SQLAlchemy creates the initial schema at startup.
5. The database has external IP access disabled by `ipAllowList: []`; the service uses the provider's internal connection string. Plain `postgres://` and `postgresql://` URLs are normalized to the installed psycopg v3 driver.
6. `autoDeployTrigger: checksPass` requests deployment after repository checks succeed. Confirm the provider can see all required GitHub checks and enforce branch protection for the default branch.

The blueprint uses the current [Render Blueprint schema](https://render.com/docs/blueprint-spec). Provider validation and provisioning require the owner's account. The service plan is intentionally small; profile memory/CPU against your actual authorized dataset workload before expanding use.

## Frontend on Vercel

1. Import the same GitHub repository. Use the repository root, Node 24, the root npm workspace, `npm ci`, `npm run build`, and output `frontend/dist`. `vercel.json` sets the build and browser security headers.
2. Set the public `VITE_API_BASE_URL` to the Render HTTPS origin, **without** `/api` or a trailing slash. Rebuild after changing it. No API key belongs in Vercel's build-time environment.
3. Record the final HTTPS URL, set that exact URL in Render's `ALLOWED_ORIGINS`, and redeploy/restart the backend as required.
4. Open **Connection** in ThreatScope and enter the backend workspace key. It stays only in JavaScript memory and is cleared on reload; there is no local-storage or cookie persistence.
5. Test a synthetic scenario, a deliberately malformed upload, an investigation note, and both report downloads. Check that an unauthenticated backend request returns 401.

`connect-src` currently permits HTTPS API connections because the final backend hostname is not known. After provisioning, tighten that directive in `vercel.json` to `'self' https://YOUR-API.onrender.com`. The other CSP directives intentionally prevent remote scripts, frames and object content. Review a Vercel preview before promoting it; connect only an explicitly allowed preview origin.

See [Vercel's Vite documentation](https://vercel.com/docs/frameworks/frontend/vite).

## Persistence, limits and operations

- SQLite is for loopback/local use. Render's ordinary filesystem is ephemeral; do not use the default SQLite file for persistent deployment.
- Single shared workspace, one service worker, one shared API key. There is no per-user attribution, SSO, RBAC, tenant isolation, append-only audit trail, automated incident response or regulatory compliance claim.
- The in-process limiter allows 240 API requests/minute and 60 writes/minute per observed peer address; maps are bounded to 4,096 addresses. Proxy clients can share a budget. Uvicorn does not trust forwarded-address headers. For broader use, add a trusted edge limiter and verified identity layer before increasing workers.
- Dataset and note quotas are checked before writes, not serialized across concurrent requests. They are resource safeguards for a small shared workspace, not strict multi-tenant billing counters.
- Initial schema creation uses `create_all`; future schema changes require reviewed versioned migrations and a backup before deployment. Do not point an experimental schema at an unrelated database.
- Use provider database backups and test restoring into an isolated database. Delete unused datasets in **Data sources → Manage datasets**. Deletion permanently removes their events, alerts and notes.
- JSON reports and event CSV are logical analysis exports, not complete database backups. Notes have no author identity because the product uses a shared workspace key.
- Do not expose development mode on a public interface. Keep production behind HTTPS, restrict account access, and retain only authorized data. No remote telemetry or third-party runtime assets are loaded by the application.

## Verification and rollback

CI runs schema/parser/rule/ML/API tests, PostgreSQL integration, lint, typecheck, frontend interaction tests, production builds, Chromium workflows, mobile axe checks, artifact reproducibility and dependency audits. A local green run does not prove that hosted accounts or infrastructure have been configured.

Roll back frontend source through a normal revert commit or the provider's previous deployment. Before rolling back backend source, verify database-schema compatibility. Restore a database only into a verified intended target after confirming the affected records and backup age. Never force-push to simulate a rollback.

## Unfinished external actions

- Connect authenticated Vercel and Render accounts to the repository.
- Review paid resource creation and confirm the exact production origins.
- Provision resources, set private runtime secrets, and run the hosted smoke checks above.
- PostgreSQL integration is defined in CI; this Windows workspace has no PostgreSQL installation, so that one local test is explicitly skipped.
