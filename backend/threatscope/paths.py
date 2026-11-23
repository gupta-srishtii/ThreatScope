"""Repository-owned artifacts, independent of caller working directory."""

from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
ML_EVALUATION_PATH = REPOSITORY_ROOT / "docs" / "ml" / "evaluation.json"
