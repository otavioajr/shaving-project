import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
LOGIN_ENDPOINT = f"{BASE_URL}/api/auth/login"
LOGOUT_ENDPOINT = f"{BASE_URL}/api/auth/logout"

LOGIN_EMAIL = "admin@barbearia.com"
LOGIN_PASSWORD = "senha123"

HEADERS_TENANT = {"x-tenant-slug": TENANT_SLUG}
TIMEOUT = 30


def test_logout_invalidate_tokens_and_handle_unauthorized_access():
    # Step 1: Login to get valid tokens
    login_payload = {"email": LOGIN_EMAIL, "password": LOGIN_PASSWORD}
    login_resp = requests.post(
        LOGIN_ENDPOINT, json=login_payload, headers=HEADERS_TENANT, timeout=TIMEOUT
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    login_data = login_resp.json()
    access_token = login_data.get("accessToken")
    refresh_token = login_data.get("refreshToken")
    assert access_token and refresh_token, "Tokens not received from login"

    auth_headers = {
        "Authorization": f"Bearer {access_token}",
        "x-tenant-slug": TENANT_SLUG,
    }

    # Step 2: Call logout endpoint and verify success message and token invalidation
    logout_resp = requests.post(LOGOUT_ENDPOINT, headers=auth_headers, timeout=TIMEOUT)
    assert logout_resp.status_code == 200, f"Logout failed: {logout_resp.text}"
    logout_data = logout_resp.json()
    assert "message" in logout_data and isinstance(logout_data["message"], str)

    # Step 3: Attempt to access a protected endpoint with the same access token to check unauthorized (401)
    # Using /api/professionals as a typical protected endpoint
    protected_url = f"{BASE_URL}/api/professionals"
    protected_resp = requests.get(protected_url, headers=auth_headers, timeout=TIMEOUT)
    assert protected_resp.status_code == 401, f"Expected 401 after logout but got {protected_resp.status_code}"

    # Step 4: Test logout endpoint missing tenant slug => expect 404
    headers_no_tenant = {"Authorization": f"Bearer {access_token}"}
    logout_resp_no_tenant = requests.post(
        LOGOUT_ENDPOINT, headers=headers_no_tenant, timeout=TIMEOUT
    )
    assert logout_resp_no_tenant.status_code == 404, f"Expected 404 for missing tenant slug but got {logout_resp_no_tenant.status_code}"

    # Step 5: Test logout endpoint with invalid tenant slug => expect 404
    headers_invalid_tenant = {
        "Authorization": f"Bearer {access_token}",
        "x-tenant-slug": "invalid-tenant",
    }
    logout_resp_invalid_tenant = requests.post(
        LOGOUT_ENDPOINT, headers=headers_invalid_tenant, timeout=TIMEOUT
    )
    assert logout_resp_invalid_tenant.status_code == 404, f"Expected 404 for invalid tenant slug but got {logout_resp_invalid_tenant.status_code}"


test_logout_invalidate_tokens_and_handle_unauthorized_access()