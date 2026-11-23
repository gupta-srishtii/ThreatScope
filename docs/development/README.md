# Development

Run `uv sync --frozen` and `npm ci` from the repository root. Python's virtual environment and lock remain at root; npm installs the `frontend` workspace with the shared lockfile. Frontend commands such as `npm run dev`, `npm test`, `npm run typecheck`, `npm run build` delegate to that workspace. Shared lint/format commands remain root commands.

Launch the API with `uv run uvicorn threatscope.main:app --app-dir backend --host 127.0.0.1 --port 8000`. Root `.env` remains the backend runtime environment; frontend's `.env.example` describes public Vite settings.

Use `uv run pytest` for backend/ML/API/security tests; `uv run ruff check backend scripts` and `uv run ruff format --check backend scripts` for Python checks. PostgreSQL integration requires an isolated `TEST_POSTGRES_URL`; CI supplies one.

`npm run test:e2e` loads `frontend/playwright.config.ts`, runs frontend tests from `frontend/tests/e2e`, and starts both servers from the repository root. Root `.venv`, test-results and browser reports remain compatible with CI. On this Windows workspace set `PLAYWRIGHT_BROWSERS_PATH` to the existing root `.playwright` directory before running.

- [Event contract](EVENT_SCHEMA.md)
- [Audit](REPOSITORY_AUDIT.md)
- [Move manifest](MOVE_MANIFEST.json)
- [Refactor report](REFACTOR_REPORT.md)
- [Historical progress](PROGRESS.md)
