import requests

def test_root_info_endpoint():
    base_url = "http://localhost:3000"
    url = f"{base_url}/"
    headers = {
        "x-tenant-slug": "barbearia-teste"
    }

    response = requests.get(url, headers=headers, timeout=30)
    assert response.status_code == 200
    # The exact content isn't specified; verify the response has a JSON or expected data presence
    # We assert it's JSON and has some keys (could be empty body but usually has some info)
    try:
        data = response.json()
        assert isinstance(data, dict)
    except ValueError:
        # If not JSON, that's acceptable only if the API returns empty or non-json with 200.
        # But per PRD, root info likely returns info JSON, so fail if not parseable.
        assert False, "Response is not JSON"

test_root_info_endpoint()