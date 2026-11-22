from threatscope.rules.base import alert
from threatscope.schemas import Alert, Event, Severity


def detect(events: list[Event]) -> list[Alert]:
    return [
        alert(
            "AUTH-003",
            "Off-hours successful authentication",
            Severity.medium,
            f"{e.user} · {e.source_ip}",
            [e],
            f"Successful login at {e.timestamp:%H:%M} UTC outside the example 06:00–22:00 UTC window. "
            "Time zones, on-call work and service accounts may explain this activity.",
            "Compare with the account's approved working hours and location.",
            {"hour_utc": e.timestamp.hour, "start_hour_utc": 6, "end_hour_utc": 22},
        )
        for e in sorted(events, key=lambda e: (e.timestamp, e.id))
        if e.action == "login" and e.outcome == "success" and not 6 <= e.timestamp.hour < 22
    ]
