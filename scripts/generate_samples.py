"""Regenerate small, authorized synthetic import fixtures."""

import csv
import io
import json
from pathlib import Path

from threatscope.detection import analyze
from threatscope.services.ingestion import parse_events
from threatscope.services.synthetic import generate


def main():
    target = Path(__file__).resolve().parents[1] / "sample-data"
    target.mkdir(exist_ok=True)
    events = generate("mixed", seed=42, count=120)
    content = json.dumps([e.model_dump(mode="json") for e in events], indent=2) + "\n"
    assert parse_events(content.encode(), "mixed.json") == events
    assert len(analyze(events)) == 4
    (target / "mixed.json").write_text(content, encoding="utf-8")
    baseline = generate("baseline", seed=29, count=60)
    output = io.StringIO(newline="")
    rows = [e.model_dump(mode="json") for e in baseline]
    writer = csv.DictWriter(output, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
    assert parse_events(output.getvalue().encode(), "baseline.csv") == baseline
    assert not analyze(baseline)
    (target / "baseline.csv").write_bytes(output.getvalue().encode("utf-8"))
    print(f"Generated and validated {len(events)} mixed JSON events and {len(baseline)} baseline CSV events.")


if __name__ == "__main__":
    main()
