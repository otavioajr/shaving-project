import requests
import time
from urllib.parse import quote
from requests.exceptions import ReadTimeout, ProxyError

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
ADMIN_EMAIL = "admin@barbearia-teste.com"
ADMIN_PASSWORD = "senha123"
HEADERS_BASE = {
    "x-tenant-slug": TENANT_SLUG,
    "Content-Type": "application/json"
}
LOGIN_TIMEOUT = 60
GENERAL_TIMEOUT = 30
RETRY_ATTEMPTS = 3
RETRY_BACKOFF = 1  # seconds


def request_with_retry(url, method="get", **kwargs):
    last_exc = None
    for attempt in range(RETRY_ATTEMPTS):
        try:
            resp = requests.request(method, url, timeout=LOGIN_TIMEOUT if "timeout" not in kwargs else kwargs["timeout"], **{k: v for k,v in kwargs.items() if k != "timeout"})
            return resp
        except (ReadTimeout, ProxyError) as e:
            last_exc = e
            if "tun.testsprite.com" in url:
                time.sleep(RETRY_BACKOFF)
            else:
                raise
    if last_exc:
        raise last_exc


def test_auth_logout():
    login_url = f"{BASE_URL}/api/auth/login"
    logout_url = f"{BASE_URL}/api/auth/logout"
    refresh_url = f"{BASE_URL}/api/auth/refresh"

    login_payload = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    # Login to obtain tokens
    resp_login = None
    try:
        resp_login = request_with_retry(
            login_url,
            method="post",
            json=login_payload,
            headers=HEADERS_BASE,
            timeout=LOGIN_TIMEOUT
        )
    except Exception as e:
        assert False, f"Login request failed: {e}"

    assert resp_login.status_code == 200, f"Login failed with status code {resp_login.status_code}"
    login_data = resp_login.json()
    assert "accessToken" in login_data, "accessToken missing in login response"
    assert "refreshToken" in login_data, "refreshToken missing in login response"

    access_token = login_data["accessToken"]
    refresh_token = login_data["refreshToken"]

    # Logout with access token and refresh token in payload
    headers_logout = {
        **HEADERS_BASE,
        "Authorization": f"Bearer {access_token}"
    }
    resp_logout = requests.post(logout_url, headers=headers_logout, json={"refreshToken": refresh_token}, timeout=GENERAL_TIMEOUT)
    assert resp_logout.status_code == 200, f"Logout failed with status code {resp_logout.status_code}"

    # After logout, refresh token should be invalidated
    refresh_payload = {
        "refreshToken": refresh_token
    }
    resp_refresh = requests.post(refresh_url, json=refresh_payload, headers=HEADERS_BASE, timeout=GENERAL_TIMEOUT)
    assert resp_refresh.status_code == 401, "Refresh token was not invalidated after logout, expected 401 Unauthorized"

    # Do NOT assert access token invalidation per instructions

test_auth_logout()
