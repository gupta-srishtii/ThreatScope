"""Seeded fixtures using documentation-only IP ranges; never live telemetry."""

import random
from datetime import datetime, timedelta, timezone

from threatscope.schemas import Event

SCENARIOS = {
    "mixed": "Command center: authentication sequence, activity burst and off-hours login",
    "authentication": "Repeated failures followed by a successful authentication",
    "burst": "A concentrated file-access burst from a single source",
    "off_hours": "Successful authentication outside the documented 06:00–22:00 UTC window",
    "baseline": "Benign business-hour activity, including occasional isolated failures",
}


def generate(scenario: str = "mixed", seed: int = 42, count: int = 480) -> list[Event]:
    if scenario not in SCENARIOS:
        raise ValueError("unknown scenario")
    if not 20 <= count <= 5000:
        raise ValueError("count must be between 20 and 5000")
    rng = random.Random(seed)
    start = datetime(2026, 11, 20, 8, tzinfo=timezone.utc)
    events: list[Event] = []

    def add(timestamp, ip, user, action="login", outcome="success", label="benign", **kw):
        events.append(
            Event(
                id=f"evt-{seed}-{len(events):05d}",
                timestamp=timestamp,
                source_ip=ip,
                user=user,
                host=kw.pop("host", "gateway-01"),
                action=action,
                outcome=outcome,
                label=label,
                **kw,
            )
        )

    for _ in range(count):
        action = rng.choice(["login", "file_access", "network_connection", "process_start"])
        add(
            start + timedelta(seconds=rng.randrange(8 * 3600)),
            f"192.0.2.{rng.randint(1, 24)}",
            rng.choice(["a.chen", "s.patel", "j.rivera", "m.brooks", "service-ci"]),
            action,
            "failure" if rng.random() < 0.025 and action == "login" else "success",
            bytes_sent=rng.randint(200, 25000),
            host=rng.choice(["gateway-01", "app-02", "vault-01"]),
            message="Synthetic business activity",
        )
    if scenario in ("mixed", "authentication"):
        for i in range(9):
            add(
                start + timedelta(hours=6, seconds=i * 15),
                "198.51.100.42",
                "admin.demo",
                outcome="failure",
                label="suspicious",
                severity="medium",
                message="Synthetic failed authentication",
            )
        add(
            start + timedelta(hours=6, minutes=3),
            "198.51.100.42",
            "admin.demo",
            label="suspicious",
            severity="high",
            message="Synthetic successful login after failures",
        )
    if scenario in ("mixed", "burst"):
        for i in range(36):
            add(
                start + timedelta(hours=5, seconds=i),
                "203.0.113.77",
                "service-export",
                "file_access",
                label="suspicious",
                bytes_sent=8000000 + i * 10000,
                severity="medium",
                message="Synthetic concentrated file access",
                host="vault-01",
            )
    if scenario in ("mixed", "off_hours"):
        add(
            start.replace(hour=2, minute=14),
            "198.51.100.91",
            "admin.demo",
            label="suspicious",
            severity="medium",
            message="Synthetic off-hours authentication",
        )
    return sorted(events, key=lambda e: (e.timestamp, e.id))
