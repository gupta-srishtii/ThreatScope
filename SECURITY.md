# Security model and reporting

ThreatScope is a defensive, single-workspace analysis application. Use synthetic or explicitly authorized local logs. It does not collect live telemetry, scan networks, execute uploads or perform credential attacks.

Production requires a random API key of at least 32 characters and an explicit HTTPS CORS allowlist. The frontend keeps the key only in memory. Development without a key is suitable only for loopback use. The key grants full access to the shared workspace: there is no SSO, RBAC, per-user audit log or tenant boundary.

Uploads are bounded before parsing and validated atomically against a strict event schema. Rendered values remain text; exports protect against common spreadsheet formula prefixes. Request counters and quotas constrain a small deployment, but do not provide distributed rate limiting or protection against every resource-exhaustion strategy. Configure provider-level controls before broader exposure.

Anomaly scores and rule findings are leads, not confirmed malicious activity. Synthetic evaluation cannot establish real-world detection quality. See [detection limitations](docs/DETECTIONS.md), [ML evidence](docs/ML.md), [event limits](docs/EVENT_SCHEMA.md) and [deployment operations](docs/DEPLOYMENT.md).

Keep private logs, database URLs, workspace keys and investigation notes out of GitHub issues. Report a vulnerability through the repository owner's private GitHub security-reporting channel when enabled; otherwise contact the owner privately. Do not post working credentials or private event data publicly. No vulnerability report is sent automatically by this application.
