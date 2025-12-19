import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
HEADERS = {"x-tenant-slug": TENANT_SLUG}
TIMEOUT = 30


def test_authentication_verify_otp_and_issue_tokens():
    email = "admin@barbearia-teste.com"

    # Step 1: Request OTP for the email
    request_otp_resp = requests.post(
        f"{BASE_URL}/api/auth/request-otp",
        headers=HEADERS,
        json={"email": email},
        timeout=TIMEOUT,
    )
    assert request_otp_resp.status_code == 200, f"Expected status 200 but got {request_otp_resp.status_code}"
    assert "message" in request_otp_resp.json(), "Response missing 'message'"

    # Step 2: Get OTP from /api/auth/test/otp/{email}
    otp_resp = requests.get(
        f"{BASE_URL}/api/auth/test/otp/{email}",
        headers=HEADERS,
        timeout=TIMEOUT,
    )
    assert otp_resp.status_code == 200, f"Expected status 200 from OTP test endpoint but got {otp_resp.status_code}"
    otp_data = otp_resp.json()
    assert "otp" in otp_data and isinstance(otp_data["otp"], str) and len(otp_data["otp"]) == 6, "OTP missing or invalid length"
    valid_otp = otp_data["otp"]

    # Step 3: Verify OTP with valid code
    verify_resp = requests.post(
        f"{BASE_URL}/api/auth/verify-otp",
        headers=HEADERS,
        json={"email": email, "otp": valid_otp},
        timeout=TIMEOUT,
    )
    assert verify_resp.status_code == 200, f"Expected 200 on valid verify-otp but got {verify_resp.status_code}"
    tokens = verify_resp.json()
    assert "accessToken" in tokens and isinstance(tokens["accessToken"], str) and tokens["accessToken"].strip() != "", "Missing or empty accessToken"
    assert "refreshToken" in tokens and isinstance(tokens["refreshToken"], str) and tokens["refreshToken"].strip() != "", "Missing or empty refreshToken"

    # Step 4: Verify OTP with invalid code (e.g. "000000")
    invalid_otp = "000000"
    if invalid_otp == valid_otp:
        invalid_otp = "111111"  # ensure different from valid OTP

    verify_invalid_resp = requests.post(
        f"{BASE_URL}/api/auth/verify-otp",
        headers=HEADERS,
        json={"email": email, "otp": invalid_otp},
        timeout=TIMEOUT,
    )
    assert verify_invalid_resp.status_code == 401, f"Expected 401 on invalid OTP but got {verify_invalid_resp.status_code}"


test_authentication_verify_otp_and_issue_tokens()
