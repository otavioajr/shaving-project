import requests
import time

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
ADMIN_EMAIL = "admin@barbearia.com"
ADMIN_PASSWORD = "senha123"
TIMEOUT = 30

def test_rate_limiting_enforcement_on_protected_endpoints():
    login_url = f"{BASE_URL}/api/auth/login"
    professionals_url = f"{BASE_URL}/api/professionals"

    headers = {
        "x-tenant-slug": TENANT_SLUG,
        "Content-Type": "application/json",
    }

    # Step 1: Login to get bearer token
    login_payload = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    resp = requests.post(login_url, json=login_payload, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Login failed with status {resp.status_code}"
    tokens = resp.json()
    access_token = tokens.get("accessToken")
    assert access_token, "Access token missing in login response"

    auth_headers = {
        "x-tenant-slug": TENANT_SLUG,
        "Authorization": f"Bearer {access_token}"
    }

    # Step 2: Determine rate limit threshold by making requests until 429 or until a reasonable max attempts
    max_attempts = 30  # upper ceiling to avoid infinite loop
    success_responses = 0
    rate_limit_hit = False

    for i in range(max_attempts):
        r = requests.get(professionals_url, headers=auth_headers, timeout=TIMEOUT)
        if r.status_code == 429:
            rate_limit_hit = True
            # Validate response content for rate limit
            # Could have a retry-after header or error json but since not documented, just basic check
            break
        elif r.status_code == 200:
            success_responses += 1
        else:
            # Unexpected status code, fail
            assert False, f"Unexpected status code {r.status_code} on attempt {i+1}"

    # Step 3: Assert that rate limiting was enforced (at least one 429)
    assert rate_limit_hit, f"Rate limiting was not enforced after {max_attempts} requests. Success responses: {success_responses}"

test_rate_limiting_enforcement_on_protected_endpoints()