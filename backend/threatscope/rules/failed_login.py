from collections import defaultdict

from threatscope.rules.base import alert, densest_window
from threatscope.schemas import Alert, Event, Severity


def detect(events: list[Event]) -> list[Alert]:
    groups = defaultdict(list)
    for event in events:
        if event.action == "login" and event.outcome == "failure":
            groups[(event.source_ip, event.user)].append(event)
    results = []
    for (ip, user), group in sorted(groups.items()):
        window = densest_window(group, 300)
        if len(window) >= 5:
            results.append(
                alert(
                    "AUTH-001",
                    "Repeated authentication failures",
                    Severity.high,
                    f"{user} · {ip}",
                    window,
                    f"{len(window)} failed logins for {user} from {ip} within 5 minutes. "
                    "This may indicate password guessing or a misconfigured client.",
                    "Confirm the user's activity and review identity-provider logs before taking action.",
                    {"failure_count": len(window), "threshold": 5, "window_seconds": 300},
                )
            )
    return results
