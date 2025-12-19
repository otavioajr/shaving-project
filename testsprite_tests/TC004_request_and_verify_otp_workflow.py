import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
ADMIN_EMAIL = "admin@barbearia-teste.com"

HEADERS = {
    "x-tenant-slug": TENANT_SLUG,
    "Content-Type": "application/json",
}


def request_otp(email):
    url = f"{BASE_URL}/api/auth/request-otp"
    payload = {"email": email}
    resp = requests.post(url, json=payload, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp


def get_otp_via_test_endpoint(email):
    """
    Retrieve OTP via the test-only endpoint (requires ENABLE_TEST_OTP_ENDPOINT=true and NODE_ENV!=production).
    """
    url = f"{BASE_URL}/api/auth/test/otp/{email}"
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    otp = data.get("otp")
    assert otp, "OTP not returned by test endpoint"
    return otp


def verify_otp(email, otp):
    url = f"{BASE_URL}/api/auth/verify-otp"
    payload = {"email": email, "otp": otp}
    resp = requests.post(url, json=payload, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    access = data.get("accessToken")
    refresh = data.get("refreshToken")
    assert access and refresh, "Tokens missing in verify-otp response"
    return data


def test_request_and_verify_otp_workflow():
    request_otp(ADMIN_EMAIL)
    otp = get_otp_via_test_endpoint(ADMIN_EMAIL)
    tokens = verify_otp(ADMIN_EMAIL, otp)
    assert tokens.get("accessToken") and tokens.get("refreshToken"), "Missing tokens"


test_request_and_verify_otp_workflow()
