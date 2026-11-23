# Repository structure refactor report

## Scope and before/after

Baseline: `99dc8e6` on main. Dedicated branch: `refactor/repository-structure`. Original Git history is retained; no force push or history rewrite. The [pre-change audit](REPOSITORY_AUDIT.md) records the original tree and findings.

```text
Before                             After
root frontend configs/public       frontend/{index.html,public,configs}
root npm app package               root npm workspace → frontend/package.json
root playwright + e2e              frontend/playwright.config.ts + tests/e2e
backend/threatscope flat modules    backend/threatscope/{api,models,services,detection,ml}
flat docs                          docs/{architecture,development,detection,ml,security,deployment,product}
samples                            sample-data
root UV project + lock             unchanged root UV project + lock
```

## Exact moves and removals

The [machine-readable move manifest](MOVE_MANIFEST.json) lists **all 34 old → new tracked file paths**. Its file-level inventory covers directory moves too. Git rename detection provides a second reviewable inventory in the PR.

**Deleted content files: none.** Old paths disappear only because files were relocated. No security test, synthetic fixture, ML evidence, license notice, cache, user upload, database or model artifact was deleted. Local ignored installations remain in place to avoid destructive cleanup and needless downloads. No dependency was proven unused, so none was removed as unused. Dependencies were reassigned to their workspace owner.

## Root configuration intentionally retained

- `package.json`, `package-lock.json`: shared npm workspace, one dependency lock, backwards-compatible root task delegates.
- `pyproject.toml`, `uv.lock`, `.python-version`: existing UV resolution, root virtual environment, pytest/Ruff configuration and Render/CI contract. Introducing a UV workspace or renaming the Python distribution offers no benefit for this one backend.
- `eslint.config.js`, Prettier files, `.nvmrc`, `.gitattributes`, `.gitignore`: shared source quality/runtime/ignore rules.
- `vercel.json`, `render.yaml`: provider discovery from repository root. Vercel output is now `frontend/dist`; Render's ASGI command and root UV environment are preserved.
- `.env.example`: root backend runtime environment contract; frontend public Vite configuration stays in `frontend/.env.example`.
- README, changelog, security policy and third-party notices: canonical repository/product/license entry points. No original LICENSE existed.
- `scripts/generate_samples.py`: repository-level reproducibility tool spanning backend generation, sample-data and CI verification.

## Preserved contracts

`threatscope.main:app --app-dir backend`, root `uv` commands, root `npm run` task names, API paths, database schema, event validation, source limits, rule parameters, model parameters, synthetic labels, note/report behavior and all test cases remain intact. Internal Python imports are updated to domain packages. A single `paths.py` locates evaluation evidence independently of caller working directory.

Frontend unit tests remain colocated with components; cross-system browser tests now reside in `frontend/tests/e2e`. Playwright resolves repository cwd and root Python executable explicitly. CI artifacts remain in root test-results/playwright-report paths. The shared npm lock avoids competing installation roots.

## Documentation and product accuracy

README and documentation links follow the new hierarchy. Existing progress is retained as history rather than erased. The source audit found **no Incident Replay player or What-if Detection implementation**; these are explicitly documented as planned labs. The available scenario investigation walkthrough is preserved. No missing product feature was fabricated or rebuilt under this refactor request.

## Verification

- Backend: 61 tests passed, 1 local PostgreSQL integration skip; 97.20% statement coverage. All existing security tests retained.
- Frontend: lint, typecheck, 9 unit/interaction tests and production workspace build passed.
- Python Ruff lint/format checks and frozen UV lock validation passed.
- Generated JSON/CSV fixtures round-trip through the parser and preserve expected rule outcomes; ML evaluation reproduces its original metrics.
- Browser, dependency-audit and remote CI outcomes are recorded below when completed. PostgreSQL is available in CI, not installed on this Windows host.

## Deployment compatibility

Root Vercel install/build commands continue to work through npm workspace delegates; only the static output location changes. Render still installs from root UV lock and launches the same Python package/ASGI target. CI tracks the moved evidence/sample paths. No Docker configuration existed to update. Hosted provisioning and accounts are outside this refactor; configuration compatibility is verified locally and via repository CI, not claimed as a new hosted deployment.

## Git and PR

Audit committed before moves. Implementation and documentation commits preserve original history. Branch/PR/check state will be recorded after publication. No merge is attempted without passing required checks.
