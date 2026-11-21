from threatscope.rules import analyze
from threatscope.rules.activity import detect
from threatscope.rules.off_hours import detect as off_hours
from threatscope.synthetic import generate


def test_burst_threshold():
    events = [e for e in generate("burst") if e.label == "suspicious"]
    assert not detect(events[:24])
    assert detect(events[:25])[0].evidence["event_count"] == 25
    assert len(detect(events)) == 1


def test_business_hour_boundaries():
    event = generate("off_hours")[0]
    for hour, expected in [(5, 1), (6, 0), (21, 0), (22, 1)]:
        assert len(off_hours([event.model_copy(update={"timestamp": event.timestamp.replace(hour=hour)})])) == expected


def test_combined_rules_and_benign():
    assert not analyze(generate("baseline"))
    assert {a.rule_id for a in analyze(generate())} == {"AUTH-001", "AUTH-002", "AUTH-003", "ACT-001"}
