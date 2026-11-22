from collections import defaultdict

from threatscope.rules.base import alert, densest_window
from threatscope.schemas import Alert, Event, Severity


def detect(events: list[Event]) -> list[Alert]:
    groups = defaultdict(list)
    for event in events:
        groups[event.source_ip].append(event)
    results = []
    for ip, group in sorted(groups.items()):
        window = densest_window(group, 60)
        if len(window) >= 25:
            results.append(
                alert(
                    "ACT-001",
                    "Concentrated activity burst",
                    Severity.high,
                    ip,
                    window,
                    f"{len(window)} events originated from {ip} within 60 seconds (threshold: 25). "
                    "Automated jobs can also produce this pattern.",
                    "Check scheduled jobs and investigate affected hosts and transferred volumes.",
                    {"event_count": len(window), "threshold": 25, "window_seconds": 60},
                )
            )
    return results
