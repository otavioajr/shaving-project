import requests

base_url = "http://localhost:3000"

def test_public_endpoints_health_and_docs_accessibility():
    timeout = 30

    # Test /health endpoint
    health_url = f"{base_url}/health"
    try:
        health_response = requests.get(health_url, timeout=timeout)
        health_response.raise_for_status()
    except Exception as e:
        assert False, f"GET /health failed with exception: {e}"

    assert health_response.status_code == 200, f"/health returned status {health_response.status_code}, expected 200"
    health_json = health_response.json()
    assert "status" in health_json, "/health response missing 'status' field"
    assert health_json["status"] == "ok", f"/health status expected 'ok', got '{health_json['status']}'"
    assert "timestamp" in health_json, "/health response missing 'timestamp' field"
    assert "environment" in health_json, "/health response missing 'environment' field"

    # Test /docs endpoint
    docs_url = f"{base_url}/docs"
    try:
        docs_response = requests.get(docs_url, timeout=timeout)
        docs_response.raise_for_status()
    except Exception as e:
        assert False, f"GET /docs failed with exception: {e}"

    assert docs_response.status_code == 200, f"/docs returned status {docs_response.status_code}, expected 200"
    # Check content-type includes html
    content_type = docs_response.headers.get("Content-Type", "")
    assert "text/html" in content_type or "html" in content_type.lower(), \
        f"/docs content-type expected to include 'html', got '{content_type}'"

test_public_endpoints_health_and_docs_accessibility()