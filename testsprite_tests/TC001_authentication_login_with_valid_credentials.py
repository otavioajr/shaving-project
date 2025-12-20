import requests

def test_authentication_login_with_valid_credentials():
    base_url = "http://localhost:3000"
    url = f"{base_url}/api/auth/login"
    headers = {
        "Content-Type": "application/json",
        "x-tenant-slug": "valid-tenant-slug"
    }
    # Replace these credentials with valid ones for the test environment
    payload = {
        "email": "validuser@example.com",
        "password": "validpassword"
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
    except requests.exceptions.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not a valid JSON"

    # Validate presence of accessToken, refreshToken, and professional object
    assert "accessToken" in data and isinstance(data["accessToken"], str) and data["accessToken"], "Missing or invalid accessToken"
    assert "refreshToken" in data and isinstance(data["refreshToken"], str) and data["refreshToken"], "Missing or invalid refreshToken"
    assert "professional" in data and isinstance(data["professional"], dict) and data["professional"], "Missing or invalid professional details"

test_authentication_login_with_valid_credentials()