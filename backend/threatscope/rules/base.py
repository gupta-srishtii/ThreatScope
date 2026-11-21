from hashlib import sha256

from threatscope.schemas import Alert, Event, Severity


def alert(rule: str, title: str, severity: Severity, entity: str, events: list[Event],
          explanation: str, recommendation: str, evidence: dict) -> Alert:
    ordered = sorted(events, key=lambda e: (e.timestamp, e.id))
    key = f"{rule}:{entity}:" + ",".join(e.id for e in ordered)
    return Alert(id="alt-" + sha256(key.encode()).hexdigest()[:20], rule_id=rule, title=title,
                 severity=severity, timestamp=ordered[-1].timestamp, entity=entity,
                 explanation=explanation, recommendation=recommendation,
                 event_ids=[e.id for e in ordered], evidence=evidence)


def densest_window(events: list[Event], seconds: int) -> list[Event]:
    """Inclusive rolling window; stable tie-breaking chooses the earliest window."""
    ordered = sorted(events, key=lambda e: (e.timestamp, e.id))
    left = 0
    best = (0, 0)
    for right, event in enumerate(ordered):
        while (event.timestamp - ordered[left].timestamp).total_seconds() > seconds:
            left += 1
        if right + 1 - left > best[1] - best[0]:
            best = (left, right + 1)
    return ordered[best[0]:best[1]]
