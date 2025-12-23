import requests

BASE_URL = "http://localhost:3000"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtaXZxZThvcjAwMDJycGh2dmY3OWJ1ZGIiLCJlbWFpbCI6ImFkbWluQGJhcmJlYXJpYS10ZXN0ZS5jb20iLCJiYXJiZXJzaG9wSWQiOiJjbWl2cWU4NW8wMDAwcnBodjllbWJleTcyIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzY2NDYzMTc5LCJleHAiOjE3NjY0NjQwNzl9.cq5AhFg2zCo1d9tIqI8Sdh__qQo95mJZ2V3vct0-_Aw"
HEADERS_BASE = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}

VALID_TENANT_SLUG = "barbearia-teste"
INVALID_TENANT_SLUG = "invalid-tenant-slug"
VALID_EMAIL = "admin@barbearia-teste.com"
INVALID_EMAIL = "invalidemail@barbearia-teste.com"

def test_auth_api_request_otp_endpoint():
    url = f"{BASE_URL}/api/auth/request-otp"
    
    # Test case 1: Valid email and valid tenant slug, expect 200
    headers_valid = {**HEADERS_BASE, "x-tenant-slug": VALID_TENANT_SLUG}
    payload_valid = {"email": VALID_EMAIL}
    try:
        response = requests.post(url, json=payload_valid, headers=headers_valid, timeout=30)
        assert response.status_code == 200, f"Expected 200 for valid tenant and email, got {response.status_code}"
        # Response body might be empty or a message, no specific schema detailed
    except requests.RequestException as e:
        assert False, f"Request failed for valid input: {e}"

    # Test case 2: Missing tenant slug header, expect 404
    headers_missing_tenant = {k: v for k, v in HEADERS_BASE.items() if k != "x-tenant-slug"}
    payload = {"email": VALID_EMAIL}
    try:
        response = requests.post(url, json=payload, headers=headers_missing_tenant, timeout=30)
        assert response.status_code == 404, f"Expected 404 for missing tenant slug, got {response.status_code}"
    except requests.RequestException as e:
        assert False, f"Request failed for missing tenant slug: {e}"

    # Test case 3: Invalid tenant slug, expect 404
    headers_invalid_tenant = {**HEADERS_BASE, "x-tenant-slug": INVALID_TENANT_SLUG}
    try:
        response = requests.post(url, json=payload, headers=headers_invalid_tenant, timeout=30)
        assert response.status_code == 404, f"Expected 404 for invalid tenant slug, got {response.status_code}"
    except requests.RequestException as e:
        assert False, f"Request failed for invalid tenant slug: {e}"

test_auth_api_request_otp_endpoint()