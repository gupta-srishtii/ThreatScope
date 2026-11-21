def test_pagination_and_filters(client, dataset):
    path = f"/api/datasets/{dataset['id']}"
    first = client.get(path + "/events?limit=10").json()
    second = client.get(path + "/events?limit=10&offset=10").json()
    assert first["total"] == 527
    assert len(first["items"]) == 10
    assert not ({e["id"] for e in first["items"]} & {e["id"] for e in second["items"]})
    filtered = client.get(path + "/events?q=198.51.100.42&outcome=failure").json()
    assert filtered["total"] == 9
    assert client.get(path + "/events?q=%25").json()["total"] == 0
    assert client.get(path + "/events?start=2026-11-20T12:00:00").status_code == 422
    assert client.get(path + "/events?limit=101").status_code == 422
    assert client.get("/api/datasets/missing/events").status_code == 404


def test_metrics_are_derived_from_evidence(client, dataset):
    path = f"/api/datasets/{dataset['id']}"
    metrics = client.get(path + "/metrics").json()
    alerts = client.get(path + "/alerts").json()
    assert metrics["total_events"] == sum(b["events"] for b in metrics["timeline"])
    assert len(metrics["timeline"]) <= 36
    assert metrics["flagged_events"] == sum(b["flagged"] for b in metrics["timeline"]) == 47
    assert sum(metrics["severity"].values()) == len(alerts) == 4
