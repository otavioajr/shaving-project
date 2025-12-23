import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
LOGIN_ENDPOINT = f"{BASE_URL}/api/auth/login"
REFRESH_ENDPOINT = f"{BASE_URL}/api/auth/refresh"

HEADERS = {
    "x-tenant-slug": TENANT_SLUG,
    "Content-Type": "application/json"
}

ADMIN_EMAIL = "admin@barbearia.com"
ADMIN_PASSWORD = "senha123"


def test_refresh_access_token_with_valid_and_invalid_refresh_token():
    # Step 1: Login to obtain valid refresh token
    login_payload = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    try:
        login_resp = requests.post(LOGIN_ENDPOINT, headers=HEADERS, json=login_payload, timeout=30)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}: {login_resp.text}"
        login_data = login_resp.json()
        assert "refreshToken" in login_data and isinstance(login_data["refreshToken"], str)
        valid_refresh_token = login_data["refreshToken"]
    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"Login step failed: {e}")

    # Step 2: Use valid refresh token to get new access token (expect 200)
    refresh_payload = {"refreshToken": valid_refresh_token}
    try:
        refresh_resp = requests.post(REFRESH_ENDPOINT, headers=HEADERS, json=refresh_payload, timeout=30)
        assert refresh_resp.status_code == 200, f"Valid refresh token request failed with status {refresh_resp.status_code}: {refresh_resp.text}"
        refresh_data = refresh_resp.json()
        assert "accessToken" in refresh_data and isinstance(refresh_data["accessToken"], str)
    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"Refresh token with valid token failed: {e}")

    # Step 3: Use invalid refresh token (expect 401)
    invalid_refresh_payload = {"refreshToken": "invalid_or_expired_token_example"}
    try:
        invalid_resp = requests.post(REFRESH_ENDPOINT, headers=HEADERS, json=invalid_refresh_payload, timeout=30)
        assert invalid_resp.status_code == 401, f"Invalid refresh token should return 401 but got {invalid_resp.status_code}"
    except requests.RequestException as e:
        raise AssertionError(f"Refresh token request with invalid token failed: {e}")

    # Step 4: Missing tenant slug header (expect 404)
    try:
        resp_no_tenant = requests.post(REFRESH_ENDPOINT, headers={"Content-Type": "application/json"}, json=refresh_payload, timeout=30)
        assert resp_no_tenant.status_code == 404, f"Missing tenant slug should return 404 but got {resp_no_tenant.status_code}"
    except requests.RequestException as e:
        raise AssertionError(f"Refresh token request with missing tenant slug failed: {e}")

    # Step 5: Invalid tenant slug header (expect 404)
    invalid_headers = {
        "x-tenant-slug": "invalid-tenant-slug",
        "Content-Type": "application/json"
    }
    try:
        resp_invalid_tenant = requests.post(REFRESH_ENDPOINT, headers=invalid_headers, json=refresh_payload, timeout=30)
        assert resp_invalid_tenant.status_code == 404, f"Invalid tenant slug should return 404 but got {resp_invalid_tenant.status_code}"
    except requests.RequestException as e:
        raise AssertionError(f"Refresh token request with invalid tenant slug failed: {e}")


test_refresh_access_token_with_valid_and_invalid_refresh_token()