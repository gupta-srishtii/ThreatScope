def test_notes_and_status_persist_and_scope(client, dataset):
    path = f"/api/datasets/{dataset['id']}"
    alert = client.get(path + "/alerts").json()[0]
    target = path + f"/alerts/{alert['id']}"
    assert client.post(target + "/notes", json={"body": "Verified with synthetic account owner"}).status_code == 201
    assert len(client.get(target + "/notes").json()) == 1
    assert client.patch(target, json={"status": "investigating"}).json()["status"] == "investigating"
    assert client.get(path + "/metrics").json()["open_alerts"] == 4
    assert client.patch(target, json={"status": "resolved"}).status_code == 200
    assert client.get(path + "/metrics").json()["open_alerts"] == 3
    assert client.post(target + "/notes", json={"body": " "}).status_code == 422
    other = client.post("/api/datasets/scenario", json={"scenario": "baseline"}).json()
    assert client.get(f"/api/datasets/{other['id']}/alerts/{alert['id']}/notes").status_code == 404
