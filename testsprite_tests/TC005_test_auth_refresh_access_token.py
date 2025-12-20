import requests
import time
from urllib.parse import quote
from requests.exceptions import ReadTimeout, ProxyError

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
ADMIN_EMAIL = "admin@barbearia-teste.com"
ADMIN_PASSWORD = "senha123"
HEADERS = {"x-tenant-slug": TENANT_SLUG}
LOGIN_URL = f"{BASE_URL}/api/auth/login"
REFRESH_URL = f"{BASE_URL}/api/auth/refresh"

def request_with_retries(method, url, **kwargs):
    retries = 3
    backoff = 1
    for attempt in range(retries):
        try:
            return requests.request(method, url, **kwargs)
        except (ReadTimeout, ProxyError) as e:
            if "tun.testsprite.com" in url and attempt < retries - 1:
                time.sleep(backoff)
                continue
            raise e

def login(email, password):
    payload = {"email": email, "password": password}
    headers = {**HEADERS, "Content-Type": "application/json"}
    response = request_with_retries(
        "POST", LOGIN_URL, json=payload, headers=headers, timeout=60
    )
    response.raise_for_status()
    data = response.json()
    assert "accessToken" in data and "refreshToken" in data
    return data["accessToken"], data["refreshToken"]

def test_auth_refresh_access_token():
    # Login to get valid tokens
    access_token, refresh_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    headers = {**HEADERS, "Content-Type": "application/json"}

    # Test valid refresh token
    valid_payload = {"refreshToken": refresh_token}
    valid_response = requests.post(
        REFRESH_URL, json=valid_payload, headers=headers, timeout=30
    )
    assert valid_response.status_code == 200, (
        f"Expected 200 for valid refresh token, got {valid_response.status_code}"
    )
    valid_data = valid_response.json()
    assert "accessToken" in valid_data and isinstance(valid_data["accessToken"], str)
    assert valid_data["accessToken"] != ""

    # Test invalid refresh token
    invalid_payload = {"refreshToken": "invalid_or_expired_token_value"}
    invalid_response = requests.post(
        REFRESH_URL, json=invalid_payload, headers=headers, timeout=30
    )
    assert invalid_response.status_code == 401, (
        f"Expected 401 for invalid refresh token, got {invalid_response.status_code}"
    )

test_auth_refresh_access_token()