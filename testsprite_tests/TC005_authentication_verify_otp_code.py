import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30
TENANT_SLUG = "test-tenant"

def test_authentication_verify_otp_code():
    # Step 1: Define a test email to request OTP
    test_email = "testuser@example.com"

    headers = {
        "Content-Type": "application/json",
        "x-tenant-slug": TENANT_SLUG,
    }

    # Step 2: Request OTP for the test email
    request_otp_payload = {
        "email": test_email
    }

    try:
        resp_request_otp = requests.post(
            f"{BASE_URL}/api/auth/request-otp",
            json=request_otp_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert resp_request_otp.status_code == 200, f"Failed to request OTP: {resp_request_otp.text}"

        # NOTE: We do not have access to retrieve the actual OTP code from Redis or email.
        # For testing, assume there's a test backdoor or a fixed OTP for the test user.
        # We'll use '123456' as the correct OTP for this test.

        correct_otp_code = "123456"  # Assumed correct OTP for test purposes

        # Step 3: Verify OTP with correct code
        verify_otp_payload = {
            "email": test_email,
            "otp": correct_otp_code
        }

        resp_verify_otp = requests.post(
            f"{BASE_URL}/api/auth/verify-otp",
            json=verify_otp_payload,
            headers=headers,
            timeout=TIMEOUT
        )

        assert resp_verify_otp.status_code == 200, f"OTP verification failed: {resp_verify_otp.text}"
        data = resp_verify_otp.json()

        # Expected successful verification should confirm user verification for password recovery
        # Assuming success response could be an object or message confirming verification
        assert isinstance(data, dict), "Response is not a JSON object"
        # The exact response schema is not specified, check presence of a success indication
        # Example: { "message": "OTP verified" } or some token for password reset
        assert any(
            key in data for key in ["message", "success", "verified"]
        ), "Expected success field in response"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_authentication_verify_otp_code()