from threatscope.ml.model import score, trained_model
from threatscope.services.synthetic import generate


def test_seeded_scoring_and_no_mutation():
    events = generate()
    original = [e.model_dump() for e in events]
    a = score(events)
    trained_model.cache_clear()
    b = score(events)
    assert a == b
    assert len(a["scores"]) == len(events)
    assert a["candidate_count"] > 0
    assert all(e["score"] > 0 for e in a["results"])
    assert [e.model_dump() for e in events] == original
    assert "proof" in a["limitation"]


def test_empty_score():
    assert score([])["candidate_count"] == 0
