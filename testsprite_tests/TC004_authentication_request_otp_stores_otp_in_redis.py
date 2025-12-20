import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
ADMIN_EMAIL = "admin@barbearia-teste.com"

HEADERS = {
    "x-tenant-slug": TENANT_SLUG,
    "Content-Type": "application/json",
}

def test_authentication_request_otp_stores_otp_in_redis():
    try:
        # Request OTP for existing admin email
        otp_request_payload = {"email": ADMIN_EMAIL}
        otp_request_resp = requests.post(
            f"{BASE_URL}/api/auth/request-otp",
            headers=HEADERS,
            json=otp_request_payload,
            timeout=30,
        )
        assert otp_request_resp.status_code == 200, f"Expected 200 but got {otp_request_resp.status_code}"
        resp_json = otp_request_resp.json()
        assert "message" in resp_json and isinstance(resp_json["message"], str)

        # Retrieve stored OTP using test-only endpoint
        otp_get_resp = requests.get(
            f"{BASE_URL}/api/auth/test/otp/{ADMIN_EMAIL}",
            headers=HEADERS,
            timeout=30,
        )
        assert otp_get_resp.status_code == 200, f"Expected 200 but got {otp_get_resp.status_code}"
        otp_data = otp_get_resp.json()
        assert "otp" in otp_data and isinstance(otp_data["otp"], str) and len(otp_data["otp"]) > 0
        assert "expiresIn" in otp_data and isinstance(otp_data["expiresIn"], (int, float))
        assert otp_data["expiresIn"] > 0, "OTP TTL must be greater than 0"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_authentication_request_otp_stores_otp_in_redis()