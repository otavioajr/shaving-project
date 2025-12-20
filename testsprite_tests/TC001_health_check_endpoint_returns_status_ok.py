import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_health_check_endpoint_returns_status_ok():
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to /health failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
    json_response = None
    try:
        json_response = response.json()
    except ValueError:
        assert False, "Response from /health endpoint is not valid JSON"

    assert "status" in json_response, "Response JSON does not contain 'status' key"
    assert json_response["status"] == "ok", f"Expected status 'ok', but got {json_response['status']}"

test_health_check_endpoint_returns_status_ok()