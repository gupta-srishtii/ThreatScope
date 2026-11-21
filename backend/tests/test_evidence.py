def test_evidence_references_real_scoped_events(client, dataset):
    path = f"/api/datasets/{dataset['id']}"
    alert = client.get(path + "/alerts").json()[0]
    evidence = client.get(path + f"/alerts/{alert['id']}/events?limit=3").json()
    assert evidence["total"] == len(alert["event_ids"])
    assert len(evidence["items"]) == 3
    assert all(e["id"] in alert["event_ids"] for e in evidence["items"])
    event = evidence["items"][0]
    assert client.get(path + f"/events/{event['id']}").json() == event
    assert client.get(path + "/events/unknown").status_code == 404
