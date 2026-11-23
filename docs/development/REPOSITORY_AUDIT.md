# Repository audit — before structural changes

Audit baseline: `99dc8e6`, 33 commits, clean `main`, origin `gupta-srishtii/ThreatScope`. No AGENTS.md found in the checkout. This report was written before moving or changing application files.

## Confirmed capabilities and scope

The existing React/FastAPI platform implements five product views, deterministic synthetic scenarios, bounded authorized uploads, four explainable rules, Isolation Forest analysis, evidence investigation, persistent notes/triage, and reports. Tests cover contracts, malformed inputs, boundaries, dataset isolation, ML reproducibility, browser investigations and accessibility. The checked-in ML evidence reports precision 0.252874 / recall 0.234043; these are synthetic results, not operational efficacy.

Incident Replay, a replay landing page, and configurable What-if Detection are **absent** in this baseline. The attached product-upgrade brief describes future functionality. The direct request authorizes an existing-project structural refactor, not a rebuild; README walkthroughs must accurately explain the available scenario workflow and mark absent labs as roadmap items.

## Classification and findings

| Category | Existing files / finding | Decision |
| --- | --- | --- |
| Required shared root | README, changelog, security policy, ignore/attributes, runtime version hints, third-party notices | Preserve; no repository LICENSE exists to move or invent |
| Python project / lock | Root pyproject.toml, uv.lock, .python-version; root .venv, CI, Render and scripts depend on this working directory | Keep root UV project/lock; avoid unnecessary UV workspace migration |
| JavaScript project | Root package.json/package-lock own all frontend dependencies and scripts | Root becomes an npm workspace coordinator; frontend owns application dependencies; preserve lock and versions |
| Frontend-only configuration | Root index.html, public/, vite.config.ts, tsconfig.json, components.json | Move into frontend and update entry, includes, aliases, output and test paths |
| Shared source tooling | ESLint and Prettier configuration; lint tools | Retain shared tooling at root, adjust file selectors |
| Browser tests | Root e2e/ and playwright.config.ts | Move into frontend/tests/e2e and frontend configuration; keep isolated API processes and root .venv |
| Backend code | Stable threatscope package with flat routers/contracts/storage/services and rules/ | Keep package name and ASGI entry point; group API, models, services and detection internals; update all imports |
| Documentation | Flat docs; several current-progress statements are historical rather than current | Categorize architecture/development/detection/ml/security/deployment/product; retain progress/history and rewrite current index |
| Runtime evidence path | ml_api.py and ml/evaluate.py locate docs using parent counts | Replace with a single repository-path definition before moving evidence |
| Synthetic fixtures | samples/, generator and CI compare exact generated artifacts | Rename to sample-data; preserve data and expected outcomes |
| Hosting | Root vercel.json and render.yaml use root npm/UV commands | Keep provider entry files at root; update frontend output to frontend/dist while retaining backend launch contract |
| Generated outputs | Ignored node_modules, dist, .venv, browser binaries, caches, coverage and test reports | Do not commit or delete local installations; expand ignore rules for uploads/model artifacts |
| Dependency ownership | Runtime imports account for declared frontend libraries; all Python direct dependencies serve APIs, persistence or analytics | No dependency proven unused; do not remove dependencies speculatively. NumPy is imported directly but currently supplied transitively; note for future dependency hygiene |
| Duplicate configuration | No independently conflicting Vite/Python configuration found | Relocate rather than create competing copies |
| Scripts | Scripts currently work but assume root frontend files and flat docs/samples paths | Update workspace delegates, Playwright working directories, artifact generator and CI references together |
| Security/ML | Shared-key workspace; explicit CORS, streaming body limits, rule evidence and label-independent causal features | Preserve all security tests and behavior; preserve synthetic evaluation limitations and model parameters |

## Before tree

```text
root/
  package.json, package-lock.json, pyproject.toml, uv.lock
  index.html, public/, vite.config.ts, tsconfig.json, components.json
  playwright.config.ts, e2e/, eslint.config.js, shared format files
  frontend/src/, frontend/.env.example
  backend/threatscope/{main,config,dependencies,security,schemas,storage,*_api,ingestion,synthetic}.py
  backend/threatscope/{rules,ml}/, backend/tests/
  docs/*.md, docs/ml-evaluation.json, docs/screenshots/
  samples/, scripts/, .github/, vercel.json, render.yaml
```

## Risks and verification plan

Primary risks are Vite root/output resolution, npm workspace lock consistency, Python imports, Playwright child-process cwd, runtime evaluation paths, generated-fixture drift and relative Markdown links. Preserve root setup/run commands through delegates. Verify lint/typecheck, frontend/backend tests, production browser workflows, evaluation regeneration, dependency audits, startup/health and deployment configuration. PostgreSQL integration runs against CI's isolated service; local absence must remain explicit. Record every move/removal and external PR/CI state in the final refactor report.
