from datetime import timedelta

from threatscope.rules.failed_login import detect
from threatscope.synthetic import generate


def failures():
    return [e for e in generate("authentication") if e.label == "suspicious" and e.outcome == "failure"]


def test_failure_threshold_and_evidence():
    events = failures()
    assert detect(events[:4]) == []
    result = detect(events[:5])[0]
    assert result.evidence["failure_count"] == 5
    assert result.event_ids == [e.id for e in events[:5]]
    assert detect(list(reversed(events))) == detect(events)


def test_window_inclusive_and_users_isolated():
    events = failures()[:5]
    events[-1] = events[-1].model_copy(update={"timestamp": events[0].timestamp + timedelta(seconds=300)})
    assert len(detect(events)) == 1
    events[-1] = events[-1].model_copy(update={"timestamp": events[0].timestamp + timedelta(seconds=301)})
    assert not detect(events)
    events = [e.model_copy(update={"user": f"user-{i}"}) for i, e in enumerate(events)]
    assert not detect(events)
