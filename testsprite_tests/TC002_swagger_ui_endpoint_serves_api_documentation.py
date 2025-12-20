import requests

def test_swagger_ui_endpoint_serves_api_documentation():
    url = "http://localhost:3000/docs"
    timeout = 30
    try:
        response = requests.get(url, timeout=timeout)
    except requests.RequestException as e:
        assert False, f"Request to /docs endpoint failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
    content_type = response.headers.get("Content-Type", "")
    assert "text/html" in content_type, f"Expected 'text/html' Content-Type but got {content_type}"
    # Basic check that the response content contains typical Swagger UI elements
    content = response.text.lower()
    assert "swagger" in content or "swagger-ui" in content, "Response does not contain Swagger UI indicators"
    assert "<title>" in content, "Response HTML does not contain a <title> element"

test_swagger_ui_endpoint_serves_api_documentation()