from threatscope.ml.evaluate import TEST_SEEDS, evaluate
from threatscope.ml.model import TRAIN_SEEDS


def test_independent_evaluation_and_confusion_matrix():
    assert not set(TEST_SEEDS) & set(TRAIN_SEEDS)
    result = evaluate()
    assert result["events"] == 7482
    for name in ("rules", "isolation_forest"):
        metrics = result[name]
        assert sum(map(sum, metrics["confusion_matrix"])) == result["events"]
        assert 0 <= metrics["precision"] <= 1
        assert 0 <= metrics["recall"] <= 1
