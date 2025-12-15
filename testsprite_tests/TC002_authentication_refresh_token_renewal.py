import requests

BASE_URL = 'http://localhost:3000'
TIMEOUT = 30
TENANT_SLUG = 'test-tenant'
EMAIL = 'testuser@example.com'
PASSWORD = 'TestPass123!'

def test_authentication_refresh_token_renewal():
    login_url = f"{BASE_URL}/api/auth/login"
    refresh_url = f"{BASE_URL}/api/auth/refresh"
    headers = {
        "Content-Type": "application/json",
        "x-tenant-slug": TENANT_SLUG
    }

    # Step 1: Login to obtain refresh token
    login_payload = {
        "email": EMAIL,
        "password": PASSWORD
    }
    try:
        login_response = requests.post(login_url, json=login_payload, headers=headers, timeout=TIMEOUT)
        login_response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"

    login_data = login_response.json()
    assert "refreshToken" in login_data, "refreshToken not found in login response"
    assert "accessToken" in login_data, "accessToken not found in login response"
    refresh_token = login_data["refreshToken"]

    # Step 2: Use refresh token to get new access token
    refresh_payload = {
        "refreshToken": refresh_token
    }
    try:
        refresh_response = requests.post(refresh_url, json=refresh_payload, headers=headers, timeout=TIMEOUT)
        refresh_response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Refresh token request failed: {e}"

    refresh_data = refresh_response.json()
    assert "accessToken" in refresh_data, "accessToken not found in refresh response"
    new_access_token = refresh_data["accessToken"]
    assert isinstance(new_access_token, str) and len(new_access_token) > 0, "Invalid accessToken returned"

    # Verify new access token is different from the old one
    old_access_token = login_data["accessToken"]
    assert new_access_token != old_access_token, "New accessToken should be different from the old one"

test_authentication_refresh_token_renewal()