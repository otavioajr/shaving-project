import requests

BASE_URL = "http://localhost:3000"
REQUEST_OTP_ENDPOINT = "/api/auth/request-otp"
TIMEOUT = 30


def test_authentication_request_otp_code():
    email = "testuser_otp@example.com"
    url = BASE_URL + REQUEST_OTP_ENDPOINT
    headers = {
        "Content-Type": "application/json",
        "x-tenant-slug": "test-tenant"
    }
    payload = {"email": email}

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
        response.raise_for_status()

        # The response status code should be 200 or 201 (depending on implementation)
        assert response.status_code in (200, 201), f"Unexpected status code: {response.status_code}"

        # The system should presumably respond with a success message or indication
        response_json = response.json()
        assert isinstance(response_json, dict), "Response is not a JSON object"

        # Since OTP is stored in Redis and not returned by the API, we cannot check it here.
        # But we can assert the API confirms sending the OTP via email.
        # Check at least that a success key/message exists
        # (Adapt based on actual response structure, here we allow any non-error response)
        assert "error" not in response_json, "Response contains error"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"


test_authentication_request_otp_code()
