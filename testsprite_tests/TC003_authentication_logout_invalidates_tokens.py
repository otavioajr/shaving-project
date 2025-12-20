import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "default"  # Replace with a valid tenant slug if known
TEST_EMAIL = "testuser@example.com"
TEST_PASSWORD = "Password123!"

def test_authentication_logout_invalidates_tokens():
    login_url = f"{BASE_URL}/api/auth/login"
    logout_url = f"{BASE_URL}/api/auth/logout"

    headers = {
        "Content-Type": "application/json",
        "x-tenant-slug": TENANT_SLUG,
    }

    # Step 1: Login to get access and refresh tokens
    login_payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
    }
    login_response = requests.post(login_url, json=login_payload, headers=headers, timeout=30)
    assert login_response.status_code == 200, f"Login failed with status {login_response.status_code}"
    login_data = login_response.json()
    access_token = login_data.get("accessToken")
    refresh_token = login_data.get("refreshToken")
    assert access_token and isinstance(access_token, str), "Missing or invalid accessToken in login response"
    assert refresh_token and isinstance(refresh_token, str), "Missing or invalid refreshToken in login response"

    auth_headers = {
        "Authorization": f"Bearer {access_token}",
        "x-tenant-slug": TENANT_SLUG,
        "Content-Type": "application/json"
    }

    try:
        # Step 2: Logout to invalidate tokens
        logout_response = requests.post(logout_url, headers=auth_headers, timeout=30)
        assert logout_response.status_code == 200, f"Logout failed with status {logout_response.status_code}"

        # Step 3: Attempt to use access token after logout - should fail
        test_url = f"{BASE_URL}/api/professionals"
        test_response = requests.get(test_url, headers=auth_headers, timeout=30)
        assert test_response.status_code in (401, 403), (
            f"Expected unauthorized or forbidden after logout, got {test_response.status_code}"
        )

        # Step 4: Attempt to refresh token after logout - should fail
        refresh_url = f"{BASE_URL}/api/auth/refresh"
        refresh_payload = {"refreshToken": refresh_token}
        refresh_response = requests.post(
            refresh_url,
            json=refresh_payload,
            headers={"Content-Type": "application/json", "x-tenant-slug": TENANT_SLUG},
            timeout=30,
        )
        assert refresh_response.status_code in (401, 403), (
            f"Expected unauthorized or forbidden on refresh after logout, got {refresh_response.status_code}"
        )
    except requests.RequestException as e:
        assert False, f"Request exception occurred: {e}"

test_authentication_logout_invalidates_tokens()