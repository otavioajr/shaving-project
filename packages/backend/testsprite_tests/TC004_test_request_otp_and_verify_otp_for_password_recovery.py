import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
EMAIL = "admin@barbearia.com"  # Using admin email as in instructions
HEADERS = {"x-tenant-slug": TENANT_SLUG}
TIMEOUT = 30


def test_request_otp_and_verify_otp_for_password_recovery():
    session = requests.Session()
    session.headers.update(HEADERS)

    # Step 1: Request OTP for valid email
    request_otp_payload = {"email": EMAIL}
    res_request_otp = session.post(
        f"{BASE_URL}/api/auth/request-otp",
        json=request_otp_payload,
        timeout=TIMEOUT,
    )
    assert res_request_otp.status_code == 200, f"Expected 200, got {res_request_otp.status_code}"
    json_request_otp = res_request_otp.json()
    assert "message" in json_request_otp and isinstance(json_request_otp["message"], str)

    # Step 2: Retrieve the OTP from test endpoint (enabled per instructions)
    res_get_otp = session.get(
        f"{BASE_URL}/api/auth/test/otp/{EMAIL}",
        timeout=TIMEOUT,
    )
    assert res_get_otp.status_code == 200, f"Expected 200 for OTP retrieval, got {res_get_otp.status_code}"
    otp_data = res_get_otp.json()
    assert "otp" in otp_data and isinstance(otp_data["otp"], str) and len(otp_data["otp"]) == 6

    otp_code = otp_data["otp"]

    # Step 3: Verify OTP with valid code
    verify_otp_payload = {"email": EMAIL, "otp": otp_code}
    res_verify_otp = session.post(
        f"{BASE_URL}/api/auth/verify-otp",
        json=verify_otp_payload,
        timeout=TIMEOUT,
    )
    assert res_verify_otp.status_code == 200, f"Expected 200 on valid OTP verification, got {res_verify_otp.status_code}"
    json_verify_otp = res_verify_otp.json()
    assert "accessToken" in json_verify_otp and isinstance(json_verify_otp["accessToken"], str)
    assert "refreshToken" in json_verify_otp and isinstance(json_verify_otp["refreshToken"], str)
    assert "professional" in json_verify_otp and isinstance(json_verify_otp["professional"], dict)

    # Step 4: Verify OTP with invalid/expired code returns 401
    invalid_otp_payload = {"email": EMAIL, "otp": "000000"}
    res_invalid_otp = session.post(
        f"{BASE_URL}/api/auth/verify-otp",
        json=invalid_otp_payload,
        timeout=TIMEOUT,
    )
    assert res_invalid_otp.status_code == 401, f"Expected 401 on invalid OTP, got {res_invalid_otp.status_code}"

    # Step 5: Request OTP with missing tenant slug returns 404
    headers_missing_tenant = {}
    res_missing_tenant = requests.post(
        f"{BASE_URL}/api/auth/request-otp",
        json=request_otp_payload,
        headers=headers_missing_tenant,
        timeout=TIMEOUT,
    )
    assert res_missing_tenant.status_code == 404, f"Expected 404 missing tenant slug on request-otp, got {res_missing_tenant.status_code}"

    # Step 6: Verify OTP with missing tenant slug returns 404
    res_missing_tenant_verify = requests.post(
        f"{BASE_URL}/api/auth/verify-otp",
        json=verify_otp_payload,
        headers=headers_missing_tenant,
        timeout=TIMEOUT,
    )
    assert res_missing_tenant_verify.status_code == 404, f"Expected 404 missing tenant slug on verify-otp, got {res_missing_tenant_verify.status_code}"

    # Step 7: Request OTP with invalid tenant slug returns 404
    headers_invalid_tenant = {"x-tenant-slug": "invalid-tenant"}
    res_invalid_tenant = requests.post(
        f"{BASE_URL}/api/auth/request-otp",
        json=request_otp_payload,
        headers=headers_invalid_tenant,
        timeout=TIMEOUT,
    )
    assert res_invalid_tenant.status_code == 404, f"Expected 404 invalid tenant slug on request-otp, got {res_invalid_tenant.status_code}"

    # Step 8: Verify OTP with invalid tenant slug returns 404
    res_invalid_tenant_verify = requests.post(
        f"{BASE_URL}/api/auth/verify-otp",
        json=verify_otp_payload,
        headers=headers_invalid_tenant,
        timeout=TIMEOUT,
    )
    assert res_invalid_tenant_verify.status_code == 404, f"Expected 404 invalid tenant slug on verify-otp, got {res_invalid_tenant_verify.status_code}"


test_request_otp_and_verify_otp_for_password_recovery()
