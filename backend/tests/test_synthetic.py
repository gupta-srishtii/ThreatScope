from ipaddress import ip_address, ip_network

from threatscope.synthetic import SCENARIOS, generate


def test_seeded_complete_scenarios():
    for scenario in SCENARIOS:
        a = generate(scenario)
        assert a == generate(scenario)
        assert len({e.id for e in a}) == len(a)
        assert a == sorted(a, key=lambda e: (e.timestamp, e.id))
        assert all(
            any(
                ip_address(e.source_ip) in ip_network(n)
                for n in ["192.0.2.0/24", "198.51.100.0/24", "203.0.113.0/24"]
            )
            for e in a
        )


def test_baseline_has_no_suspicious_labels():
    assert all(e.label == "benign" for e in generate("baseline"))
    assert any(e.label == "suspicious" for e in generate("mixed"))
