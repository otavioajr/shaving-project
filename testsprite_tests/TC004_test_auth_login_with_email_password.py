import requests
import time
from urllib.parse import quote
from requests.exceptions import ReadTimeout, ProxyError

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
HEADERS = {"x-tenant-slug": TENANT_SLUG, "Content-Type": "application/json"}
LOGIN_URL = f"{BASE_URL}/api/auth/login"
RETRIES = 3
BACKOFF = 1
TIMEOUT = 60  # per instructions


def do_post_with_retry(url, json, headers, timeout=TIMEOUT):
    for attempt in range(RETRIES):
        try:
            return requests.post(url, json=json, headers=headers, timeout=timeout)
        except (ReadTimeout, ProxyError):
            if attempt == RETRIES - 1:
                raise
            time.sleep(BACKOFF)


def test_auth_login_with_email_password():
    # Valid credentials login attempt
    valid_payload = {
        "email": "admin@barbearia-teste.com",
        "password": "senha123"
    }
    response = do_post_with_retry(LOGIN_URL, json=valid_payload, headers=HEADERS, timeout=TIMEOUT)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    # Validate tokens presence
    assert "accessToken" in data and isinstance(data["accessToken"], str) and data["accessToken"], "accessToken missing or empty"
    assert "refreshToken" in data and isinstance(data["refreshToken"], str) and data["refreshToken"], "refreshToken missing or empty"
    # Validate professional data presence (assuming "professional" field exists and is dict)
    assert "professional" in data and isinstance(data["professional"], dict) and data["professional"], "professional data missing or empty"

    # Invalid credentials login attempt
    invalid_payload = {
        "email": "admin@barbearia-teste.com",
        "password": "wrongpassword"
    }
    response_invalid = do_post_with_retry(LOGIN_URL, json=invalid_payload, headers=HEADERS, timeout=TIMEOUT)
    assert response_invalid.status_code == 401, f"Expected 401 for invalid credentials, got {response_invalid.status_code}"


test_auth_login_with_email_password()