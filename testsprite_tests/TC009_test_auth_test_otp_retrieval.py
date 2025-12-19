import requests
import urllib.parse
import time
from requests.exceptions import ReadTimeout, ProxyError

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
ADMIN_EMAIL = "admin@barbearia-teste.com"
ADMIN_PASSWORD = "senha123"
HEADERS_BASE = {"x-tenant-slug": TENANT_SLUG}
LOGIN_TIMEOUT = 60
OTP_TIMEOUT = 60
RETRIES = 3
BACKOFF = 1


def retry_request(func):
    def wrapper(*args, **kwargs):
        last_exc = None
        for _ in range(RETRIES):
            try:
                return func(*args, **kwargs)
            except (ReadTimeout, ProxyError) as e:
                last_exc = e
                time.sleep(BACKOFF)
        if last_exc:
            raise last_exc

    return wrapper


@retry_request
def login(email, password):
    url = f"{BASE_URL}/api/auth/login"
    headers = {**HEADERS_BASE, "Content-Type": "application/json"}
    payload = {"email": email, "password": password}
    resp = requests.post(url, json=payload, headers=headers, timeout=LOGIN_TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    assert "accessToken" in data, "Missing accessToken in login response"
    assert "refreshToken" in data, "Missing refreshToken in login response"
    return data["accessToken"], data["refreshToken"]


@retry_request
def request_otp(email):
    url = f"{BASE_URL}/api/auth/request-otp"
    headers = {**HEADERS_BASE, "Content-Type": "application/json"}
    payload = {"email": email}
    resp = requests.post(url, json=payload, headers=headers, timeout=OTP_TIMEOUT)
    resp.raise_for_status()
    return resp


@retry_request
def get_test_otp(identifier, access_token):
    url = f"{BASE_URL}/api/auth/test/otp/{urllib.parse.quote(identifier)}"
    headers = {
        **HEADERS_BASE,
        "Authorization": f"Bearer {access_token}",
    }
    resp = requests.get(url, headers=headers, timeout=OTP_TIMEOUT)
    return resp


def test_auth_test_otp_retrieval():
    # Step 1: Login as admin to get tokens
    access_token, refresh_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    # Step 2: Request OTP for admin email so that OTP exists in test env
    resp_otp_req = request_otp(ADMIN_EMAIL)
    assert resp_otp_req.status_code == 200

    # Step 3: Retrieve OTP via test-only endpoint with correct identifier (admin email)
    resp_otp = get_test_otp(ADMIN_EMAIL, access_token)
    assert resp_otp.status_code == 200, "Expected OTP retrieval to succeed with status 200"
    otp_value = resp_otp.json()
    assert isinstance(otp_value, (dict,)), "Expected JSON response with OTP"
    # OTP can be a dict with some structure or just a string, so check at least some OTP presence
    assert any(isinstance(v, str) and v for v in otp_value.values()), "OTP value missing or empty"

    # Step 4: Attempt to retrieve OTP for non-existent identifier and expect 404
    fake_email = "nonexistent-" + str(int(time.time())) + "@example.com"
    resp_not_found = get_test_otp(fake_email, access_token)
    assert resp_not_found.status_code == 404, "Expected 404 for non-existent OTP identifier"


test_auth_test_otp_retrieval()