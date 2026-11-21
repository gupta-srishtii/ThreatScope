# ThreatScope implementation roadmap

Build a defensive, single-workspace security analytics platform. Synthetic data is always marked; uploaded data is accepted only for authorized local analysis. No network scanning or attack execution.

## Architecture and engineering decisions

- React / TypeScript / Vite, Tailwind, shadcn-style owned primitives, Motion and Recharts.
- FastAPI / Pydantic for typed contracts; SQLAlchemy with SQLite locally and PostgreSQL in deployment.
- Dataset-scoped event, alert and investigation records. A bounded JSON/CSV import validates the complete dataset before atomic persistence.
- Deterministic, sliding-window rules precede an optional Isolation Forest trained on an independent benign synthetic dataset. Labels never enter model features.
- A shared workspace API key is optional on loopback and mandatory in production. This is a deployment baseline, not enterprise identity or multi-tenancy.
- Vercel static frontend and Render Python backend; explicit CORS allowlist. Never embed backend credentials in a frontend build.

## Ordered delivery units

1. Workspace inspection, roadmap and repository hygiene.
2. Python dependency and test scaffold.
3. Normalized event schema with negative tests.
4. Deterministic, labeled synthetic scenarios.
5. Strict bounded CSV/JSON normalization.
6. Explainable failed-login rule.
7. Successful authentication after failures rule.
8. Activity burst and off-hours authentication rules.
9. Persistent dataset/event/alert storage.
10. Health, workspace access and dataset APIs.
11. Streaming upload limits and atomic import API.
12. Filtered event query and metrics APIs.
13. Independent ML feature engineering.
14. Seeded Isolation Forest training and scoring.
15. Held-out evaluation and model evidence.
16. Persistent investigation notes and alert triage.
17. Downloadable JSON/CSV security reports.
18. React/Vite/Tailwind and test scaffold.
19. Design tokens and accessible UI primitives.
20. Typed API client and workspace connection.
21. Responsive command center shell and overview.
22. Interactive event volume and severity charts.
23. Explainable alert queue and investigation drawer.
24. Searchable, filtered, paginated event explorer.
25. Synthetic scenario and validated upload experience.
26. ML evidence view and report downloads.
27. Motion and accessibility interaction verification.
28. Full-stack Playwright investigation checks.
29. CI, dependency/security checks and deployment configuration.
30. Operations, detection documentation and final verification.

Each unit is committed when its applicable checks pass. Follow-up fixes get their own honest commits. Maintain `docs/PROGRESS.md` and `CHANGELOG.md`; never manufacture history to meet a count.

## Acceptance checks

Schema/ingestion rejection tests; deterministic rule boundaries; feature label independence and seeded model evaluation; authenticated API and persistence tests; frontend interactions; keyboard dialog flows; end-to-end scenario → alert → note → report; typecheck and production build. Record actual measurements only.
