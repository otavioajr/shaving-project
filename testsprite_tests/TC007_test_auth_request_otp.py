import requests
import time
import urllib.parse

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
ADMIN_EMAIL = "admin@barbearia-teste.com"
ADMIN_PASSWORD = "senha123"

HEADERS = {
    "Content-Type": "application/json",
    "x-tenant-slug": TENANT_SLUG
}

def request_with_retries(method, url, **kwargs):
    retries = 3
    backoff = 1
    for attempt in range(retries):
        try:
            response = requests.request(method, url, timeout=60, **kwargs)
            return response
        except (requests.exceptions.ReadTimeout, requests.exceptions.ProxyError) as e:
            if "tun.testsprite.com" in url:
                if attempt < retries - 1:
                    time.sleep(backoff)
                    continue
            raise
    raise RuntimeError("Failed after retries")

def login():
    url = f"{BASE_URL}/api/auth/login"
    payload = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    headers = HEADERS.copy()
    response = request_with_retries("POST", url, json=payload, headers=headers)
    assert response.status_code == 200, f"Login failed with status {response.status_code}"
    json_resp = response.json()
    assert "accessToken" in json_resp and "refreshToken" in json_resp, "Tokens missing in login response"
    return json_resp["accessToken"], json_resp["refreshToken"]

def test_auth_request_otp():
    # Use seeded admin email for OTP request
    url_request_otp = f"{BASE_URL}/api/auth/request-otp"
    payload_request_otp = {"email": ADMIN_EMAIL}
    headers = HEADERS.copy()
    response = request_with_retries("POST", url_request_otp, json=payload_request_otp, headers=headers)
    assert response.status_code == 200, f"Request OTP failed with status {response.status_code}"

    # Retrieve the OTP from test-only endpoint
    encoded_email = urllib.parse.quote(ADMIN_EMAIL, safe='')
    url_test_otp = f"{BASE_URL}/api/auth/test/otp/{encoded_email}"
    response_otp = request_with_retries("GET", url_test_otp, headers=headers)
    assert response_otp.status_code == 200, f"Test OTP retrieval failed with status {response_otp.status_code}"
    otp_value = response_otp.text
    assert otp_value.strip() != "", "OTP value is empty"

test_auth_request_otp()