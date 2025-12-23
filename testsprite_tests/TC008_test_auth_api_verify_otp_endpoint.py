import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-test"  # Use a valid tenant slug for testing
TEST_EMAIL = "admin@barbearia-teste.com"  # Use a valid email for OTP request in test env
HEADERS_BASE = {"x-tenant-slug": TENANT_SLUG}
TIMEOUT = 30

def test_auth_api_verify_otp_endpoint():
    # Step 1: Request an OTP for the test email
    otp_request_payload = {"email": TEST_EMAIL}
    res_request_otp = requests.post(f"{BASE_URL}/api/auth/request-otp",
                                    headers=HEADERS_BASE,
                                    json=otp_request_payload,
                                    timeout=TIMEOUT)
    assert res_request_otp.status_code == 200 or res_request_otp.status_code == 404, \
        f"Unexpected status code on request-otp: {res_request_otp.status_code}"

    if res_request_otp.status_code == 404:
        # Tenant slug invalid or email not found, verify 404 error on invalid tenant slug scenario below
        pass
    else:
        # Step 2: Retrieve OTP via test endpoint (test only, requires env)
        # Identifier is email in URL encoded form (safe ASCII assumed here for test)
        identifier = TEST_EMAIL
        res_get_otp = requests.get(f"{BASE_URL}/api/auth/test/otp/{identifier}",
                                   headers=HEADERS_BASE,
                                   timeout=TIMEOUT)
        assert res_get_otp.status_code == 200, f"Failed to get OTP from test endpoint, status: {res_get_otp.status_code}"
        data_otp = res_get_otp.json()
        otp_code = data_otp.get("otp")
        assert otp_code and len(otp_code) == 6, "OTP code is missing or invalid length"

        # Step 3: Verify correct OTP - expect 200 and tokens
        verify_otp_payload = {
            "email": TEST_EMAIL,
            "otp": otp_code
        }
        res_verify_otp = requests.post(f"{BASE_URL}/api/auth/verify-otp",
                                       headers=HEADERS_BASE,
                                       json=verify_otp_payload,
                                       timeout=TIMEOUT)
        assert res_verify_otp.status_code == 200, f"Valid OTP should return 200, got {res_verify_otp.status_code}"
        verify_data = res_verify_otp.json()
        assert "accessToken" in verify_data and isinstance(verify_data["accessToken"], str) and verify_data["accessToken"], "accessToken missing or invalid"
        assert "refreshToken" in verify_data and isinstance(verify_data["refreshToken"], str) and verify_data["refreshToken"], "refreshToken missing or invalid"
        assert "professional" in verify_data and isinstance(verify_data["professional"], dict), "Professional info missing or invalid"

        # Step 4: Verify invalid OTP returns 401
        invalid_otp_payload = {
            "email": TEST_EMAIL,
            "otp": "000000"
        }
        res_invalid_otp = requests.post(f"{BASE_URL}/api/auth/verify-otp",
                                        headers=HEADERS_BASE,
                                        json=invalid_otp_payload,
                                        timeout=TIMEOUT)
        assert res_invalid_otp.status_code == 401, f"Invalid OTP should return 401, got {res_invalid_otp.status_code}"

    # Step 5: Verify missing tenant slug returns 404
    res_missing_tenant = requests.post(f"{BASE_URL}/api/auth/verify-otp",
                                       headers={},  # no tenant slug header
                                       json={"email": TEST_EMAIL, "otp": "123456"},
                                       timeout=TIMEOUT)
    assert res_missing_tenant.status_code == 404, f"Missing tenant slug should return 404, got {res_missing_tenant.status_code}"

    # Step 6: Verify invalid tenant slug returns 404
    headers_invalid_tenant = {"x-tenant-slug": "invalid-tenant-slug"}
    res_invalid_tenant = requests.post(f"{BASE_URL}/api/auth/verify-otp",
                                       headers=headers_invalid_tenant,
                                       json={"email": TEST_EMAIL, "otp": "123456"},
                                       timeout=TIMEOUT)
    assert res_invalid_tenant.status_code == 404, f"Invalid tenant slug should return 404, got {res_invalid_tenant.status_code}"

test_auth_api_verify_otp_endpoint()