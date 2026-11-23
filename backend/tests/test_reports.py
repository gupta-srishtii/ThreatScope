import csv
import io
import json

from threatscope.services.synthetic import generate


def test_report_includes_triage_and_notes(client, dataset):
    path = f"/api/datasets/{dataset['id']}"
    alert = client.get(path + "/alerts").json()[0]
    client.post(path + f"/alerts/{alert['id']}/notes", json={"body": "Reviewed evidence"})
    report = client.get(path + "/report").json()
    assert report["notes"][0]["body"] == "Reviewed evidence"
    assert len(report["alerts"]) == 4
    assert report["metrics"]["total_events"] == 527
    assert "attachment" in client.get(path + "/report").headers["content-disposition"]
    assert client.get(path + "/report?format=html").status_code == 422


def test_csv_prevents_formula_injection(client):
    events = generate("baseline", count=20)
    events[0] = events[0].model_copy(update={"user": "=SUM(1,2)"})
    data = json.dumps([e.model_dump(mode="json") for e in events])
    dataset = client.post("/api/datasets/upload", files={"file": ("events.json", data)}).json()
    result = client.get(f"/api/datasets/{dataset['id']}/report?format=csv")
    rows = list(csv.DictReader(io.StringIO(result.text)))
    assert len(rows) == 20
    assert rows[0]["user"] == "'=SUM(1,2)"


def test_ml_api_and_evaluation(client, dataset):
    result = client.get(f"/api/datasets/{dataset['id']}/ml")
    assert result.status_code == 200
    assert "scores" not in result.json()
    assert result.json()["model"]["training_events"] == 1920
    evidence = client.get("/api/ml/evaluation").json()
    assert evidence["events"] == 7482
