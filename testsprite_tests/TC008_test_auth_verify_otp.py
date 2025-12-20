import requests
import time
import urllib.parse
from requests.exceptions import ReadTimeout, ProxyError

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
LOGIN_EMAIL = "admin@barbearia-teste.com"
LOGIN_PASSWORD = "senha123"
HEADERS_BASE = {
    "x-tenant-slug": TENANT_SLUG,
    "Content-Type": "application/json"
}
TIMEOUT = 60
RETRIES = 3
BACKOFF = 1

def request_with_retries(method, url, **kwargs):
    for attempt in range(RETRIES):
        try:
            response = requests.request(method, url, timeout=TIMEOUT, **kwargs)
            return response
        except (ReadTimeout, ProxyError):
            if attempt < RETRIES - 1:
                time.sleep(BACKOFF)
            else:
                raise

def test_auth_verify_otp():
    # Step 1: Login to get tokens and professional data for admin
    login_payload = {
        "email": LOGIN_EMAIL,
        "password": LOGIN_PASSWORD
    }
    login_headers = HEADERS_BASE.copy()
    login_resp = request_with_retries(
        "POST",
        f"{BASE_URL}/api/auth/login",
        json=login_payload,
        headers=login_headers
    )
    assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
    login_data = login_resp.json()
    assert "accessToken" in login_data and "refreshToken" in login_data, "Missing tokens in login response"

    email_encoded = urllib.parse.quote(LOGIN_EMAIL)

    # Step 2: Request OTP for the admin email
    otp_request_payload = {"email": LOGIN_EMAIL}
    otp_request_resp = request_with_retries(
        "POST",
        f"{BASE_URL}/api/auth/request-otp",
        json=otp_request_payload,
        headers=HEADERS_BASE
    )
    assert otp_request_resp.status_code == 200, f"OTP request failed with status {otp_request_resp.status_code}"

    # Step 3: Retrieve OTP using test-only endpoint
    otp_retrieval_resp = request_with_retries(
        "GET",
        f"{BASE_URL}/api/auth/test/otp/{email_encoded}",
        headers=HEADERS_BASE
    )
    assert otp_retrieval_resp.status_code == 200, f"OTP retrieval failed with status {otp_retrieval_resp.status_code}"
    otp_data = otp_retrieval_resp.json()
    assert isinstance(otp_data, dict) and "otp" in otp_data, "OTP value missing in response"
    otp_value = otp_data["otp"]
    assert isinstance(otp_value, str) and otp_value.strip(), "Invalid OTP value retrieved"

    # Step 4: Verify OTP successfully
    verify_payload = {
        "email": LOGIN_EMAIL,
        "otp": otp_value
    }
    verify_resp = request_with_retries(
        "POST",
        f"{BASE_URL}/api/auth/verify-otp",
        json=verify_payload,
        headers=HEADERS_BASE
    )
    assert verify_resp.status_code == 200, f"OTP verify success failed with status {verify_resp.status_code}"
    verify_data = verify_resp.json()
    # Should contain tokens and professional data at top level
    assert "accessToken" in verify_data and "refreshToken" in verify_data, "Tokens missing in verify-otp success response"
    assert "professional" in verify_data and isinstance(verify_data["professional"], dict), "Professional data missing in verify-otp success response"

    # Step 5: Verify OTP failure with invalid OTP
    invalid_verify_payload = {
        "email": LOGIN_EMAIL,
        "otp": "000000"  # Assuming this OTP is invalid
    }
    invalid_verify_resp = request_with_retries(
        "POST",
        f"{BASE_URL}/api/auth/verify-otp",
        json=invalid_verify_payload,
        headers=HEADERS_BASE
    )
    assert invalid_verify_resp.status_code == 401, f"Invalid OTP verify expected 401 but got {invalid_verify_resp.status_code}"

test_auth_verify_otp()
