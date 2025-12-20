import requests

def test_swagger_ui_documentation_endpoint():
    base_url = "http://localhost:3000"
    url = f"{base_url}/docs"
    timeout = 30

    try:
        response = requests.get(url, timeout=timeout)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        # Check that response content contains indicative Swagger UI elements (e.g., HTML with swagger-ui)
        content_type = response.headers.get("Content-Type", "")
        assert "text/html" in content_type, f"Expected content-type to include 'text/html', got {content_type}"
        content = response.text
        assert "Swagger UI" in content or "swagger-ui" in content or "Swagger" in content, "Swagger UI content not found in response body"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_swagger_ui_documentation_endpoint()