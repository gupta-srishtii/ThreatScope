# Authorized synthetic samples

These files contain only generated identities, documentation IP ranges and fixed November 20, 2026 timestamps. They are not collected telemetry.

- `mixed.json`: 167 events: 120 background events and 47 labeled suspicious demonstration events. Four rule detections are expected.
- `baseline.csv`: 60 benign business-hour events. No configured rule detections are expected for this seed.

Load either through **Import events → Upload file**. JSON must be an array of normalized objects; CSV must have one header row and UTF-8 text. See [the event schema](../docs/development/EVENT_SCHEMA.md).

Regenerate from the repository root:

```powershell
$env:PYTHONPATH = 'backend'
uv run python scripts/generate_samples.py
```

On macOS/Linux: `PYTHONPATH=backend uv run python scripts/generate_samples.py`.
