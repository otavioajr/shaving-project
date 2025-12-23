import requests

BASE_URL = "http://localhost:3000"
TENANT_HEADER = {"x-tenant-slug": "barbearia-teste"}
TIMEOUT = 30

def test_auth_api_login_flow_verification():
    login_url = f"{BASE_URL}/auth/login"
    otp_request_url = f"{BASE_URL}/auth/otp/request"
    otp_verify_url = f"{BASE_URL}/auth/otp/verify"

    credentials = {
        "email": "admin@barbearia-teste.com",
        "password": "senha123"
    }

    headers = TENANT_HEADER.copy()

    # Step 1: Login with email/password
    try:
        login_resp = requests.post(login_url, json=credentials, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Login request failed with exception: {e}"
    assert login_resp.status_code == 200, f"Expected 200 OK for login, got {login_resp.status_code}"
    login_data = login_resp.json()
    assert "otpRequired" in login_data, "Response must include 'otpRequired' field"
    otp_required = login_data["otpRequired"]
    assert isinstance(otp_required, bool), "'otpRequired' must be boolean"

    # If OTP is not required continue, else test OTP flow
    if otp_required:
        # OTP should have been generated and sent - simulate OTP request (assuming OTP is generated and retrievable for test)
        otp_request_payload = {
            "email": credentials["email"]
        }
        # Request OTP again (if flow requires explicit generate OTP)
        try:
            otp_req_resp = requests.post(otp_request_url, json=otp_request_payload, headers=headers, timeout=TIMEOUT)
        except requests.RequestException as e:
            assert False, f"OTP request failed with exception: {e}"
        assert otp_req_resp.status_code == 200, f"Expected 200 OK for OTP request, got {otp_req_resp.status_code}"

        # Since we cannot read real OTP in test environment, for test assume OTP is '123456' (for actual integration test this must be retrieved)
        test_otp = "123456"

        otp_verify_payload = {
            "email": credentials["email"],
            "otp": test_otp
        }
        try:
            otp_verify_resp = requests.post(otp_verify_url, json=otp_verify_payload, headers=headers, timeout=TIMEOUT)
        except requests.RequestException as e:
            assert False, f"OTP verify request failed with exception: {e}"
        assert otp_verify_resp.status_code == 200, f"Expected 200 OK for OTP verify, got {otp_verify_resp.status_code}"
        otp_verify_data = otp_verify_resp.json()
        assert "accessToken" in otp_verify_data, "OTP verify response must include 'accessToken'"
        assert "refreshToken" in otp_verify_data, "OTP verify response must include 'refreshToken'"
        assert isinstance(otp_verify_data["accessToken"], str) and len(otp_verify_data["accessToken"]) > 0, "Invalid accessToken"
        assert isinstance(otp_verify_data["refreshToken"], str) and len(otp_verify_data["refreshToken"]) > 0, "Invalid refreshToken"
    else:
        # OTP not required, tokens should be issued in login response directly
        assert "accessToken" in login_data, "Login response must include 'accessToken'"
        assert "refreshToken" in login_data, "Login response must include 'refreshToken'"
        assert isinstance(login_data["accessToken"], str) and len(login_data["accessToken"]) > 0, "Invalid accessToken"
        assert isinstance(login_data["refreshToken"], str) and len(login_data["refreshToken"]) > 0, "Invalid refreshToken"

test_auth_api_login_flow_verification()