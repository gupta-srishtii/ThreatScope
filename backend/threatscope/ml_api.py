import json
from pathlib import Path

from fastapi import APIRouter, Depends

from threatscope.dependencies import DB, dataset_or_404, require_access
from threatscope.ml.model import score
from threatscope.storage import load_events

router = APIRouter(prefix="/api", dependencies=[Depends(require_access)])


@router.get("/datasets/{dataset_id}/ml")
def anomaly_analysis(dataset_id: str, session: DB):
    dataset_or_404(session, dataset_id)
    result = score(load_events(session, dataset_id))
    result.pop("scores", None)
    return result


@router.get("/ml/evaluation")
def evaluation_evidence():
    path = Path(__file__).resolve().parents[2] / "docs" / "ml-evaluation.json"
    return json.loads(path.read_text(encoding="utf-8"))
