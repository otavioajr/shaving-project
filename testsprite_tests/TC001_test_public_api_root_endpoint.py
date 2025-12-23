import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_public_api_root_endpoint():
    url = f"{BASE_URL}/"
    headers = {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtaXZxZThvcjAwMDJycGh2dmY3OWJ1ZGIiLCJlbWFpbCI6ImFkbWluQGJhcmJlYXJpYS10ZXN0ZS5jb20iLCJiYXJiZXJzaG9wSWQiOiJjbWl2cWU4NW8wMDAwcnBodjllbWJleTcyIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzY2NDYzMTc5LCJleHAiOjE3NjY0NjQwNzl9.cq5AhFg2zCo1d9tIqI8Sdh__qQo95mJZ2V3vct0-_Aw"
    }
    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
        response.raise_for_status()
        data = response.json()
        assert isinstance(data, dict), "Response JSON is not an object"
        assert "name" in data and isinstance(data["name"], str) and data["name"], "Missing or invalid 'name'"
        assert "version" in data and isinstance(data["version"], str) and data["version"], "Missing or invalid 'version'"
        assert "docs" in data and isinstance(data["docs"], str) and data["docs"], "Missing or invalid 'docs'"
    except requests.RequestException as e:
        raise AssertionError(f"Request failed: {e}")

test_public_api_root_endpoint()