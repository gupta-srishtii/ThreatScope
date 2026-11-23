from threatscope.detection import activity, auth_sequence, failed_login, off_hours
from threatscope.models.schemas import Alert, Event


def analyze(events: list[Event]) -> list[Alert]:
    alerts = [a for rule in (failed_login, auth_sequence, activity, off_hours) for a in rule.detect(events)]
    return sorted(alerts, key=lambda a: (a.timestamp, a.id), reverse=True)
