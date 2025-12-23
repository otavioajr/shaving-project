import requests
from datetime import datetime, timezone
import dateutil.parser

BASE_URL = "http://localhost:3000"
AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtaXZxZThvcjAwMDJycGh2dmY3OWJ1ZGIiLCJlbWFpbCI6ImFkbWluQGJhcmJlYXJpYS10ZXN0ZS5jb20iLCJiYXJiZXJzaG9wSWQiOiJjbWl2cWU4NW8wMDAwcnBodjllbWJleTcyIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzY2NDYzMTc5LCJleHAiOjE3NjY0NjQwNzl9.cq5AhFg2zCo1d9tIqI8Sdh__qQo95mJZ2V3vct0-_Aw"
HEADERS = {
    "Authorization": f"Bearer {AUTH_TOKEN}"
}

def test_public_api_health_check_endpoint():
    try:
        url = f"{BASE_URL}/health"
        # No tenant slug header is required
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        data = response.json()

        # Validate status
        assert "status" in data, "Missing 'status' in response"
        assert data["status"] == "ok", f"Unexpected status value: {data['status']}"

        # Validate timestamp is ISO 8601 datetime and is recent (within 1 min)
        assert "timestamp" in data, "Missing 'timestamp' in response"
        timestamp_str = data["timestamp"]
        timestamp = dateutil.parser.isoparse(timestamp_str)
        now = datetime.now(timezone.utc)
        delta = abs((now - timestamp).total_seconds())
        assert delta < 60, f"Timestamp is not recent. Now: {now} Timestamp: {timestamp}"

        # Validate environment info is string and not empty
        assert "environment" in data, "Missing 'environment' in response"
        environment = data["environment"]
        assert isinstance(environment, str) and environment, "Environment should be non-empty string"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    except (ValueError, AssertionError) as e:
        assert False, f"Validation failed: {e}"

test_public_api_health_check_endpoint()