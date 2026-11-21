"""Causal numeric features; no labels, severity, message, or event IDs."""

import math
from collections import defaultdict, deque

import pandas as pd

from threatscope.schemas import Event

FEATURES = ["hour_sin", "hour_cos", "off_hours", "is_login", "is_failure", "log_bytes_sent",
            "source_events_60s", "source_failures_300s"]


def features(events: list[Event]) -> tuple[list[Event], pd.DataFrame]:
    ordered = sorted(events, key=lambda e: (e.timestamp, e.id))
    activity, failures = defaultdict(deque), defaultdict(deque)
    rows = []
    for e in ordered:
        recent, failed = activity[e.source_ip], failures[e.source_ip]
        while recent and (e.timestamp - recent[0]).total_seconds() > 60:
            recent.popleft()
        while failed and (e.timestamp - failed[0]).total_seconds() > 300:
            failed.popleft()
        recent.append(e.timestamp)
        if e.action == "login" and e.outcome == "failure":
            failed.append(e.timestamp)
        hour = e.timestamp.hour + e.timestamp.minute / 60
        rows.append([math.sin(hour * math.tau / 24), math.cos(hour * math.tau / 24),
                     int(not 6 <= hour < 22), int(e.action == "login"), int(e.outcome == "failure"),
                     math.log1p(e.bytes_sent), len(recent), len(failed)])
    return ordered, pd.DataFrame(rows, columns=FEATURES, dtype=float)
