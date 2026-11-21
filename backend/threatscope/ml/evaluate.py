"""Run: PYTHONPATH=backend python -m threatscope.ml.evaluate"""

import json
from pathlib import Path

import sklearn
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support

from threatscope.ml.model import MODEL_SEED, TRAIN_SEEDS, score
from threatscope.rules import analyze
from threatscope.synthetic import SCENARIOS, generate

TEST_SEEDS = (101, 203, 307)


def evaluate() -> dict:
    truth, rule_pred, ml_pred = [], [], []
    for seed in TEST_SEEDS:
        for scenario in SCENARIOS:
            events = generate(scenario, seed)
            flagged = {eid for a in analyze(events) for eid in a.event_ids}
            scores = {r["event_id"]: r["score"] for r in score(events)["scores"]}
            truth.extend(int(e.label == "suspicious") for e in events)
            rule_pred.extend(int(e.id in flagged) for e in events)
            ml_pred.extend(int(scores[e.id] > 0) for e in events)

    def metrics(pred):
        precision, recall, f1, _ = precision_recall_fscore_support(truth, pred, average="binary", zero_division=0)
        return {"precision": round(float(precision), 6), "recall": round(float(recall), 6),
                "f1": round(float(f1), 6), "confusion_matrix": confusion_matrix(truth, pred, labels=[0, 1]).tolist()}

    return {"protocol": "Held-out event-level synthetic evaluation; no test labels or test seeds in training",
            "training_seeds": TRAIN_SEEDS, "test_seeds": TEST_SEEDS, "model_seed": MODEL_SEED,
            "sklearn_version": sklearn.__version__, "datasets": len(TEST_SEEDS) * len(SCENARIOS),
            "events": len(truth), "positive_labels": sum(truth),
            "confusion_matrix_axes": "rows=true [benign,suspicious], columns=predicted [benign,suspicious]",
            "rules": metrics(rule_pred), "isolation_forest": metrics(ml_pred),
            "limitations": "Synthetic labels intentionally match demonstration rules. Rule performance is "
            "optimistic by construction and does not estimate real-world efficacy. ML threshold was fixed "
            "before evaluation. Correlated events are not independent samples; no confidence intervals claimed."}


if __name__ == "__main__":
    result = evaluate()
    destination = Path(__file__).resolve().parents[3] / "docs" / "ml-evaluation.json"
    destination.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
