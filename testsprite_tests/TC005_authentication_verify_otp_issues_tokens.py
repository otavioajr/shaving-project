import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
ADMIN_EMAIL = "admin@barbearia-teste.com"
HEADERS_BASE = {"x-tenant-slug": TENANT_SLUG}
TIMEOUT = 30


def test_auth_verify_otp_issues_tokens():
    try:
        # Request OTP for existing admin email (always returns 200)
        otp_request_resp = requests.post(
            f"{BASE_URL}/api/auth/request-otp",
            headers=HEADERS_BASE,
            json={"email": ADMIN_EMAIL},
            timeout=TIMEOUT,
        )
        assert otp_request_resp.status_code == 200, "Request OTP should return 200"

        # Retrieve the OTP from test-only endpoint
        otp_get_resp = requests.get(
            f"{BASE_URL}/api/auth/test/otp/{ADMIN_EMAIL}",
            headers=HEADERS_BASE,
            timeout=TIMEOUT,
        )
        assert otp_get_resp.status_code == 200, "Get OTP for existing email should return 200"
        otp_data = otp_get_resp.json()
        assert "otp" in otp_data and len(otp_data["otp"]) == 6, "OTP should be 6 digits"

        valid_otp = otp_data["otp"]

        # Verify OTP with valid code - expect 200 and tokens
        verify_resp = requests.post(
            f"{BASE_URL}/api/auth/verify-otp",
            headers=HEADERS_BASE,
            json={"email": ADMIN_EMAIL, "otp": valid_otp},
            timeout=TIMEOUT,
        )
        assert verify_resp.status_code == 200, "Valid OTP verification should succeed with 200"
        tokens = verify_resp.json()
        # Validate tokens presence and structure
        assert "accessToken" in tokens and isinstance(tokens["accessToken"], str) and tokens["accessToken"], "accessToken should be present"
        assert "refreshToken" in tokens and isinstance(tokens["refreshToken"], str) and tokens["refreshToken"], "refreshToken should be present"

        # Verify OTP with invalid code - expect 401 Unauthorized
        invalid_otp = "000000" if valid_otp != "000000" else "999999"
        verify_invalid_resp = requests.post(
            f"{BASE_URL}/api/auth/verify-otp",
            headers=HEADERS_BASE,
            json={"email": ADMIN_EMAIL, "otp": invalid_otp},
            timeout=TIMEOUT,
        )
        assert verify_invalid_resp.status_code == 401, "Invalid OTP verification should return 401"

    except requests.RequestException as e:
        assert False, f"RequestException occurred: {e}"


test_auth_verify_otp_issues_tokens()