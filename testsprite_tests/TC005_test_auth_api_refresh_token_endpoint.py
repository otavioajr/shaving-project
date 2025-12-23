import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

# Provided valid Bearer token for Authorization header
BEARER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtaXZxZThvcjAwMDJycGh2dmY3OWJ1ZGIiLCJlbWFpbCI6ImFkbWluQGJhcmJlYXJpYS10ZXN0ZS5jb20iLCJiYXJiZXJzaG9wSWQiOiJjbWl2cWU4NW8wMDAwcnBodjllbWJleTcyIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzY2NDYzMTc5LCJleHAiOjE3NjY0NjQwNzl9.cq5AhFg2zCo1d9tIqI8Sdh__qQo95mJZ2V3vct0-_Aw"
TENANT_SLUG = "cmivqe85o000rphv9embey72"

def test_auth_api_refresh_token_endpoint():
    headers = {
        "Authorization": f"Bearer {BEARER_TOKEN}",
        "x-tenant-slug": TENANT_SLUG,
        "Content-Type": "application/json"
    }

    # First, perform a login to get valid refresh token for testing
    login_payload = {
        "email": "admin@barbearia-teste.com",
        "password": "password123"
    }
    login_headers = {
        "x-tenant-slug": TENANT_SLUG,
        "Content-Type": "application/json"
    }
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload, headers=login_headers, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
    login_data = login_resp.json()
    refresh_token = login_data.get("refreshToken")
    assert isinstance(refresh_token, str) and refresh_token, "No refreshToken returned from login"

    # --- Test valid refresh token returns new access token ---
    refresh_headers = {
        "x-tenant-slug": TENANT_SLUG,
        "Content-Type": "application/json"
    }
    refresh_payload = {
        "refreshToken": refresh_token
    }
    resp = requests.post(f"{BASE_URL}/api/auth/refresh", json=refresh_payload, headers=refresh_headers, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Expected 200 for valid refresh token, got {resp.status_code}"
    resp_json = resp.json()
    new_access_token = resp_json.get("accessToken")
    assert isinstance(new_access_token, str) and new_access_token, "No accessToken in refresh response"

    # --- Test invalid refresh token returns 401 ---
    invalid_refresh_payload = {
        "refreshToken": "invalid.refresh.token.value"
    }
    resp_invalid = requests.post(f"{BASE_URL}/api/auth/refresh", json=invalid_refresh_payload, headers=refresh_headers, timeout=TIMEOUT)
    assert resp_invalid.status_code == 401, f"Expected 401 for invalid refresh token, got {resp_invalid.status_code}"

    # --- Test expired refresh token returns 401 ---
    # Since we can't produce a true expired token here, simulate with a nonsense token which should also be unauthorized
    expired_refresh_payload = {
        "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.cq5AhFg2zCo1d9tIqI8Sdh__qQo95mJZ2V3vct0-_AW"
    }
    resp_expired = requests.post(f"{BASE_URL}/api/auth/refresh", json=expired_refresh_payload, headers=refresh_headers, timeout=TIMEOUT)
    assert resp_expired.status_code == 401, f"Expected 401 for expired refresh token, got {resp_expired.status_code}"

    # --- Test missing tenant slug returns 404 ---
    missing_tenant_headers = {
        "Content-Type": "application/json"
    }
    resp_missing_tenant = requests.post(f"{BASE_URL}/api/auth/refresh", json=refresh_payload, headers=missing_tenant_headers, timeout=TIMEOUT)
    assert resp_missing_tenant.status_code == 404, f"Expected 404 for missing tenant slug, got {resp_missing_tenant.status_code}"

    # --- Test invalid tenant slug returns 404 ---
    invalid_tenant_headers = {
        "x-tenant-slug": "unknown-tenant-slug",
        "Content-Type": "application/json"
    }
    resp_invalid_tenant = requests.post(f"{BASE_URL}/api/auth/refresh", json=refresh_payload, headers=invalid_tenant_headers, timeout=TIMEOUT)
    assert resp_invalid_tenant.status_code == 404, f"Expected 404 for invalid tenant slug, got {resp_invalid_tenant.status_code}"

test_auth_api_refresh_token_endpoint()