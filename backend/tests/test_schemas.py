import pytest
from pydantic import ValidationError

from threatscope.schemas import Event


def event_data(**overrides):
    return dict(
        id="evt-1",
        timestamp="2026-11-20T10:00:00+05:30",
        source_ip="192.0.2.10",
        user="analyst",
        host="gateway-01",
        action="login",
        outcome="success",
        **overrides,
    )


def test_normalizes_utc():
    event = Event(**event_data())
    assert event.timestamp.hour == 4
    assert event.timestamp.minute == 30


@pytest.mark.parametrize(
    "field,value",
    [
        ("timestamp", "2026-11-20T10:00:00"),
        ("source_ip", "example.com"),
        ("bytes_sent", -1),
        ("bytes_sent", True),
        ("action", "execute"),
        ("user", "bad\nname"),
        ("extra", "ignored?"),
        ("id", "../file"),
        ("timestamp", 123456),
        ("timestamp", "123456"),
    ],
)
def test_rejects_invalid_event(field, value):
    data = event_data()
    data[field] = value
    with pytest.raises(ValidationError):
        Event(**data)
