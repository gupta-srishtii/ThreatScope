# ThreatScope architecture

ThreatScope has one shared workspace and independent datasets. It separates normalized events, deterministic alert evidence, optional model results and analyst notes. It has no network collectors, job agents, external event enrichments or automated response execution.

## Source layout

```text
frontend/src/
  components/       charts, event/alert investigation, source controls, UI primitives
  pages/            overview, event explorer, detections, anomaly lab, reports
  lib/              typed API client, workspace context, abortable resources, formatters
backend/threatscope/
  api/              HTTP routers
  models/           schemas and persistence
  services/         parsing and synthetic generation
  detection/        explainable rules
  main.py           application factory, lifecycle, workspace/import routes
  dependencies.py   scoped sessions, access checks, dataset lookup and quotas
  schemas.py        normalized Pydantic event/alert contracts
  ingestion.py      bounded CSV/JSON decoding and validation
  synthetic.py      seeded, labeled demonstration scenarios
  storage.py        SQLAlchemy models and transactional dataset persistence
  rules/            deterministic correlation and evidence construction
  ml/               causal features, seeded model training, held-out evaluation
  *_api.py          query, investigation, evidence, ML and report routers
backend/tests/      schema, parser, rule, feature/model, API and database checks
frontend/tests/e2e/ production-browser synthetic investigation workflows
sample-data/        validated synthetic JSON/CSV imports
docs/               contracts, methodology, evidence and deployment runbooks
```

## Request and data flow

The frontend sends a workspace key in `X-API-Key`; it never stores the key on disk, in local storage, in a URL or in a Vite build variable. `ENVIRONMENT=production` refuses startup with a weak/missing key or a wildcard/non-HTTPS origin allowlist. CORS allows explicit trusted origins. Origin enforcement applies independently to browser write requests.

ASGI request guarding counts streamed bytes before multipart/JSON parsing, bounds client-accounting maps, and applies read/write budgets. Parsing validates the entire upload and rejects malformed rows or duplicate IDs before persistence. CPU-bound rule/model work uses FastAPI's synchronous worker-thread path. Per-request concurrency is limited by the production Uvicorn command.

Synthetic generation and imports both feed the same normalized `Event` contract and rule pipeline. Dataset, event and alert inserts commit together. Alerts contain the actual event IDs used for correlation and stable explanations; the UI reads those records rather than synthesizing detections. Queries use parameterized SQL expressions, explicit dataset IDs and bounded pagination.

Metrics derive from stored events and findings. Empty timeline bins are retained, evidence-event counts deduplicate overlapping findings, and source counts are unique normalized IP addresses. The overview labels each dataset's provenance and treats the data as a snapshot. No timer simulates a live stream.

Optional ML fits a cached independent benign synthetic baseline. Current/uploaded event labels never enter training or feature processing. Model candidates are separate from rule alerts and do not silently change triage, severity or incident status. Feature context is a baseline comparison, not a causal attribution claim.

React resource hooks cancel obsolete reads and avoid applying results after unmount or a dataset change. Pages are code-split. Motion respects the user's reduced-motion preference; charts have text/data-table alternatives. Dialogs trap focus and restore it to the initiating control, including refreshed table rows. Hidden mobile navigation is inert; its open state traps focus and closes with Escape.

## Persistence model

| Table | Scope and purpose |
| --- | --- |
| `datasets` | UUID, display name, source, UTC creation time, normalized event count |
| `events` | Composite dataset/event key, indexed timestamp/severity, filter columns, searchable text and normalized JSON |
| `alerts` | Composite dataset/alert key, immutable rule/evidence payload, mutable triage status |
| `notes` | UUID, dataset/alert references, plain-text body and UTC creation time |

Foreign-key cascades remove dataset-owned records. Evidence routes validate both dataset and alert scope; the same event IDs can appear in unrelated datasets without sharing notes. SQLite's timezone-less datetime storage is converted back to explicit UTC at response boundaries. Initial schemas use SQLAlchemy `create_all`; later releases need versioned migrations.

The JSON payload preserves the normalized event contract while SQL columns support filtering and stable pagination. At the current 10,000-event bound, aggregate metrics and feature engineering read one dataset into memory. This is deliberately not an unbounded streaming or distributed analytics design.

## API catalog

All routes except health require the configured workspace key. Development permits keyless loopback access when `API_KEY` is empty.

| Method / route | Behavior |
| --- | --- |
| `GET /api/health` | Public liveness/readiness metadata and database connection check |
| `GET /api/scenarios` | Available synthetic scenario descriptions |
| `GET /api/datasets` | List workspace datasets |
| `POST /api/datasets/scenario` | Generate one scenario with a bounded integer seed |
| `POST /api/datasets/upload` | Validate one multipart `file` and create a dataset atomically |
| `DELETE /api/datasets/{dataset}` | Permanently remove dataset-owned records |
| `GET /api/datasets/{dataset}/events` | Search, severity/action/outcome/date filters, limit/offset pagination |
| `GET /api/datasets/{dataset}/events/{event}` | Normalized event detail |
| `GET /api/datasets/{dataset}/metrics` | Evidence-derived counts, severity and timeline bins |
| `GET /api/datasets/{dataset}/alerts` | Rule findings and current triage statuses |
| `GET /api/datasets/{dataset}/alerts/{alert}/events` | Paginated supporting evidence |
| `PATCH /api/datasets/{dataset}/alerts/{alert}` | Set `open`, `investigating`, or `resolved` |
| `GET/POST /api/datasets/{dataset}/alerts/{alert}/notes` | Read or append validated investigation notes |
| `GET /api/datasets/{dataset}/ml` | Optional current-dataset anomaly scoring, top 30 candidates |
| `GET /api/ml/evaluation` | Checked-in measured held-out evaluation artifact |
| `GET /api/datasets/{dataset}/report?format=json\|csv` | Download investigation JSON or complete event CSV |

Validation errors omit raw input values. Upload failures report a row and field without echoing the private event. Report responses use attachment disposition and no-store caching. Development API documentation is available at `/docs`; production disables it and its OpenAPI schema.

## Operational boundaries

One shared API key grants full workspace access. Limits are in-process and quota checks are not strict across concurrent writes. There is no durable task queue, model registry, federated identity, tenant isolation, author audit trail or continuous ingestion. Worker restarts retrain the same synthetic baseline, and changing dependencies can change model outputs. [Deployment](../deployment/README.md), [detection](../detection/README.md) and [ML](../ml/README.md) documents explain these limits and required external setup.
