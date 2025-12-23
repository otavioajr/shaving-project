import requests

def test_public_api_swagger_ui_endpoint():
    base_url = "http://localhost:3000"
    url = f"{base_url}/docs"
    headers = {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtaXZxZThvcjAwMDJycGh2dmY3OWJ1ZGIiLCJlbWFpbCI6ImFkbWluQGJhcmJlYXJpYS10ZXN0ZS5jb20iLCJiYXJiZXJzaG9wSWQiOiJjbWl2cWU4NW8wMDAwcnBodjllbWJleTcyIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzY2NDYzMTc5LCJleHAiOjE3NjY0NjQwNzl9.cq5AhFg2zCo1d9tIqI8Sdh__qQo95mJZ2V3vct0-_Aw"
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
        # Swagger UI typically returns HTML content with 200 OK
        assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
        content_type = response.headers.get("Content-Type", "")
        # Content type should be HTML text for Swagger UI
        assert "text/html" in content_type.lower(), f"Expected HTML content, got {content_type}"
        # The response text should contain typical Swagger UI markers
        assert "<html" in response.text.lower(), "Response does not contain HTML content"
        assert "swagger-ui" in response.text.lower() or "swagger" in response.text.lower(), "Swagger UI page expected in response"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_public_api_swagger_ui_endpoint()