from functools import lru_cache
from threading import Lock

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from threatscope.ml.features import FEATURES, features
from threatscope.schemas import Event
from threatscope.synthetic import generate

TRAIN_SEEDS = (17, 29, 43, 61)
MODEL_SEED = 42
_training_lock = Lock()


@lru_cache(maxsize=1)
def trained_model():
    frames = [features(generate("baseline", seed=seed))[1] for seed in TRAIN_SEEDS]
    training = pd.concat(frames, ignore_index=True)
    model = IsolationForest(n_estimators=160, max_samples=256, contamination=.025,
                            random_state=MODEL_SEED, n_jobs=1)
    model.fit(training)
    center = training.median()
    spread = (training.quantile(.75) - training.quantile(.25)).clip(lower=1)
    return model, center, spread


def score(events: list[Event]) -> dict:
    ordered, frame = features(events)
    if frame.empty:
        return {"candidate_count": 0, "results": [], "scores": []}
    with _training_lock:
        model, center, spread = trained_model()
    scores = -model.decision_function(frame)
    candidates = []
    for index in np.argsort(-scores, kind="stable"):
        if scores[index] <= 0:
            continue
        row = frame.iloc[index]
        deviations = ((row - center).abs() / spread).sort_values(ascending=False)
        evidence = [{"feature": key, "value": round(float(row[key]), 4),
                     "baseline_median": round(float(center[key]), 4)} for key in deviations.index[:3]]
        candidates.append({"event_id": ordered[index].id, "timestamp": ordered[index].timestamp.isoformat(),
                           "user": ordered[index].user, "source_ip": ordered[index].source_ip,
                           "score": round(float(scores[index]), 6), "features": evidence})
    return {"candidate_count": len(candidates), "results": candidates[:30],
            "scores": [{"event_id": e.id, "score": float(s)} for e, s in zip(ordered, scores, strict=True)],
            "model": {"algorithm": "Isolation Forest", "seed": MODEL_SEED, "training_seeds": TRAIN_SEEDS,
                      "training_events": len(TRAIN_SEEDS) * 480, "contamination": .025,
                      "features": FEATURES, "threshold": 0},
            "limitation": "Unusual activity is not proof of malicious intent. This model is trained only on "
                          "synthetic data. Feature deviations are context, not causal feature attribution."}
