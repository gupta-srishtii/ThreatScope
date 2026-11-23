# Event contract and import behavior

Imports accept UTF-8 CSV (optional BOM) or a JSON array. Files are data only; they are not executed, fetched or used as filesystem paths. A complete file is validated before any records are persisted. Each import creates an independent dataset; identical IDs across different datasets are allowed.

| Field | Required | Contract |
| --- | --- | --- |
| `id` | Yes | Unique within dataset; 1–80 ASCII letters, digits, underscores or hyphens |
| `timestamp` | Yes | ISO 8601 datetime containing `T` and an explicit timezone; normalized to UTC |
| `source_ip` | Yes | Valid IPv4 or IPv6 address; hostnames are rejected |
| `user` | Yes | Trimmed string, 1–120 characters; no control characters |
| `host` | Yes | Trimmed string, 1–120 characters; no control characters |
| `action` | Yes | `login`, `file_access`, `process_start`, `network_connection` |
| `outcome` | Yes | `success`, `failure`, `allowed`, `blocked` |
| `severity` | No | `critical`, `high`, `medium`, `low`, `info`; default `info` |
| `bytes_sent` | No | Integer 0–1,000,000,000,000; default 0; JSON booleans/floats rejected |
| `message` | No | Trimmed string, up to 1,000 characters; no control characters |
| `label` | No | `benign`, `suspicious`, or null; evaluation only, never an ML feature |

Unknown fields, duplicate IDs, malformed rows, missing CSV values and duplicate headers are rejected. CSV `bytes_sent` is explicitly converted to an integer and an empty label becomes null. JSON numbers are not accepted as timestamps. Uploaded severity and synthetic labels do not drive deterministic rules.

```json
[
  {
    "id": "local-event-001",
    "timestamp": "2026-11-20T12:00:00Z",
    "source_ip": "192.0.2.10",
    "user": "demo.analyst",
    "host": "gateway-01",
    "action": "login",
    "outcome": "success",
    "severity": "info",
    "bytes_sent": 0,
    "message": "Synthetic authorized example"
  }
]
```

Limits: 2 MiB per file, 10,000 events per dataset, 50 datasets per workspace, 200 notes per alert and 4,000 characters per note. Multipart request overhead has a separate 64 KiB allowance. HTTP bodies are bounded before multipart or JSON parsing, including requests without `Content-Length`.

CSV exports prefix strings starting with `=`, `+`, `-` or `@` (after whitespace) with an apostrophe to reduce spreadsheet formula injection. This may change the displayed text when reimporting an export. JSON reports contain metrics, alert evidence references, triage and notes; event CSV contains the entire selected dataset.
