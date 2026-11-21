from collections import defaultdict, deque

from threatscope.rules.base import alert
from threatscope.schemas import Alert, Event, Severity


def detect(events: list[Event]) -> list[Alert]:
    failures = defaultdict(deque)
    results = []
    for event in sorted(events, key=lambda e: (e.timestamp, e.id)):
        if event.action != "login":
            continue
        queue = failures[(event.source_ip, event.user)]
        while queue and (event.timestamp - queue[0].timestamp).total_seconds() > 300:
            queue.popleft()
        if event.outcome == "failure":
            queue.append(event)
        elif event.outcome == "success":
            if len(queue) >= 5:
                results.append(alert("AUTH-002", "Successful login after repeated failures", Severity.critical,
                    f"{event.user} · {event.source_ip}", [*queue, event],
                    f"A successful authentication followed {len(queue)} failures for the same user and "
                    "source in 5 minutes. Account compromise is a hypothesis requiring verification.",
                    "Verify the session with the account owner; inspect MFA and session history.",
                    {"preceding_failures": len(queue), "window_seconds": 300}))
            queue.clear()
    return results
