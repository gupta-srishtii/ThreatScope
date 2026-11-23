import numpy as np

from threatscope.ml.features import FEATURES, features
from threatscope.services.synthetic import generate


def test_features_are_finite_ordered_and_label_independent():
    events = generate()
    ordered, frame = features(list(reversed(events)))
    assert ordered == events
    assert list(frame.columns) == FEATURES
    assert np.isfinite(frame.to_numpy()).all()
    changed = [
        e.model_copy(update={"label": "benign", "severity": "critical", "message": "changed"}) for e in events
    ]
    assert features(changed)[1].equals(frame)


def test_features_are_causal_and_handle_empty_input():
    events = generate()
    first = features(events[:30])[1]
    assert first.equals(features(events)[1].iloc[:30].reset_index(drop=True))
    assert features([])[1].shape == (0, len(FEATURES))
