import requests

def test_health_check_endpoint():
    base_url = "http://localhost:3000"
    url = f"{base_url}/health"
    timeout = 30

    try:
        response = requests.get(url, timeout=timeout)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
    except requests.RequestException as e:
        assert False, f"Request to /health endpoint failed: {e}"

test_health_check_endpoint()