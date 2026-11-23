import json

from fastapi import APIRouter, Depends

from threatscope.dependencies import DB, dataset_or_404, require_access
from threatscope.ml.model import score
from threatscope.models.storage import load_events
from threatscope.paths import ML_EVALUATION_PATH

router = APIRouter(prefix="/api", dependencies=[Depends(require_access)])


@router.get("/datasets/{dataset_id}/ml")
def anomaly_analysis(dataset_id: str, session: DB):
    dataset_or_404(session, dataset_id)
    result = score(load_events(session, dataset_id))
    result.pop("scores", None)
    return result


@router.get("/ml/evaluation")
def evaluation_evidence():
    path = ML_EVALUATION_PATH
    return json.loads(path.read_text(encoding="utf-8"))
