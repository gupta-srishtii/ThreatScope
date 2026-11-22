from datetime import timedelta

from threatscope.rules.auth_sequence import detect
from threatscope.synthetic import generate


def test_success_requires_correlated_recent_failures():
    events = [e for e in generate("authentication") if e.label == "suspicious"]
    assert len(detect(events)) == 1
    assert len(detect(events)[0].event_ids) == 10
    assert not detect(events[:-1])
    assert not detect([*events[:-1], events[-1].model_copy(update={"user": "another"})])
    assert not detect(
        [*events[:-1], events[-1].model_copy(update={"timestamp": events[-1].timestamp + timedelta(hours=1)})]
    )


def test_success_clears_failure_window():
    events = [e for e in generate("authentication") if e.label == "suspicious"]
    assert len(detect([*events, events[-1].model_copy(update={"id": "second-success"})])) == 1
