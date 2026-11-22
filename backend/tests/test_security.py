from threatscope.security import RequestGuard


def test_rate_limiter_and_client_map_are_bounded():
    guard = RequestGuard(None, [])
    assert all(guard.allow_request('client', 1, writes=True) for _ in range(60))
    assert not guard.allow_request('client', 2, writes=True)
    assert guard.allow_request('client', 62, writes=True)
    for i in range(4096):
        assert guard.allow_request(str(i), 1)
    assert not guard.allow_request('overflow', 1)
    assert len(guard.all_requests) == 4096
    assert guard.allow_request('new-client', 62)
    assert len(guard.all_requests) == 1


def test_read_limit_and_security_headers(client):
    for _ in range(240):
        assert client.get('/api/datasets').status_code == 200
    response = client.get('/api/datasets')
    assert response.status_code == 429
    assert response.headers['retry-after'] == '60'
    assert client.get('/api/health').status_code == 200
    assert response.headers['x-content-type-options'] == 'nosniff'


def test_validation_errors_do_not_echo_private_input(client):
    private = 'private-investigation-text'
    response = client.post('/api/datasets/scenario', json={'seed': private})
    assert response.status_code == 422
    assert private not in response.text
    assert 'input' not in response.text


def test_unicode_bad_key_is_rejected_without_server_error(client):
    assert client.get('/api/datasets', headers={b'X-API-Key': b'\xff'}).status_code == 401
