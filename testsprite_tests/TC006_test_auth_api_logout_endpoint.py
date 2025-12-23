import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "cmivqe85o000rphv9embey72"
AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtaXZxZThvcjAwMDJycGh2dmY3OWJ1ZGIiLCJlbWFpbCI6ImFkbWluQGJhcmJlYXJpYS10ZXN0ZS5jb20iLCJiYXJiZXJzaG9wSWQiOiJjbWl2cWU4NW8wMDAwcnBodjllbWJleTcyIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzY2NDYzMTc5LCJleHAiOjE3NjY0NjQwNzl9.cq5AhFg2zCo1d9tIqI8Sdh__qQo95mJZ2V3vct0-_Aw"

def test_auth_api_logout_endpoint():
    headers_valid = {
        "Authorization": f"Bearer {AUTH_TOKEN}",
        "x-tenant-slug": TENANT_SLUG,
        "Accept": "application/json"
    }
    headers_unauthorized = {
        "Authorization": "Bearer invalidtoken",
        "x-tenant-slug": TENANT_SLUG,
        "Accept": "application/json"
    }
    headers_missing_tenant = {
        "Authorization": f"Bearer {AUTH_TOKEN}",
        "Accept": "application/json"
    }
    headers_invalid_tenant = {
        "Authorization": f"Bearer {AUTH_TOKEN}",
        "x-tenant-slug": "invalid-tenant",
        "Accept": "application/json"
    }

    logout_url = f"{BASE_URL}/api/auth/logout"

    timeout = 30

    # Successful logout with valid token and tenant slug: expect 200
    response = requests.post(logout_url, headers=headers_valid, timeout=timeout)
    try:
        assert response.status_code == 200, f"Expected 200, got {response.status_code}, body: {response.text}"
    except AssertionError as e:
        # Possibly token already invalidated, just raise for visibility
        raise e

    # Logout with invalid token but valid tenant slug: expect 401
    response_unauth = requests.post(logout_url, headers=headers_unauthorized, timeout=timeout)
    assert response_unauth.status_code == 401, f"Expected 401 for invalid token, got {response_unauth.status_code}"

    # Logout missing tenant slug header: expect 404
    response_missing_tenant = requests.post(logout_url, headers=headers_missing_tenant, timeout=timeout)
    assert response_missing_tenant.status_code == 404, f"Expected 404 for missing tenant slug, got {response_missing_tenant.status_code}"

    # Logout with invalid tenant slug: expect 404
    response_invalid_tenant = requests.post(logout_url, headers=headers_invalid_tenant, timeout=timeout)
    assert response_invalid_tenant.status_code == 404, f"Expected 404 for invalid tenant slug, got {response_invalid_tenant.status_code}"

test_auth_api_logout_endpoint()