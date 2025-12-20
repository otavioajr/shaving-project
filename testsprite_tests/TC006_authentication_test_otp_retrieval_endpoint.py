import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
ADMIN_EMAIL = "admin@barbearia-teste.com"
ADMIN_PASSWORD = "senha123"
TIMEOUT = 30
BEARER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtaXZxZThvcjAwMDJycGh2dmY3OWJ1ZGIiLCJlbWFpbCI6ImFkbWluQGJhcmJlYXJpYS10ZXN0ZS5jb20iLCJiYXJiZXJzaG9wSWQiOiJjbWl2cWU4NW8wMDAwcnBodjllbWJleTcyIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzY1ODg3MzgzLCJleHAiOjE3NjU4ODgyODN9.7hgWQ7v5Bu30Q0Tous8WxUR7H_VznGZKHck24-ATF24"
HEADERS_AUTH = {
    "x-tenant-slug": TENANT_SLUG,
    "Authorization": f"Bearer {BEARER_TOKEN}",
}
HEADERS_TENANT_ONLY = {
    "x-tenant-slug": TENANT_SLUG,
}


def test_authentication_test_otp_retrieval_endpoint():
    session = requests.Session()
    try:
        # Step 1: Request OTP for existing admin email
        request_otp_response = session.post(
            f"{BASE_URL}/api/auth/request-otp",
            headers=HEADERS_TENANT_ONLY,
            json={"email": ADMIN_EMAIL},
            timeout=TIMEOUT,
        )
        assert request_otp_response.status_code == 200, f"request-otp status not 200 but {request_otp_response.status_code}"

        # Step 2: Attempt to retrieve the OTP using the test-only endpoint
        get_otp_response = session.get(
            f"{BASE_URL}/api/auth/test/otp/{ADMIN_EMAIL}",
            headers=HEADERS_TENANT_ONLY,
            timeout=TIMEOUT,
        )

        # If OTP was stored, expect 200 and otp and expiresIn in response
        if get_otp_response.status_code == 200:
            data = get_otp_response.json()
            assert "otp" in data, "OTP missing in response"
            assert isinstance(data["otp"], str) and len(data["otp"]) > 0, "OTP invalid"
            assert "expiresIn" in data, "expiresIn missing in response"
            assert isinstance(data["expiresIn"], (int, float)) and data["expiresIn"] > 0, "expiresIn invalid"
        else:
            # If no OTP present or expired, expect 404
            assert get_otp_response.status_code == 404, f"Unexpected status code {get_otp_response.status_code} for OTP retrieval"

        # Step 3: Try OTP retrieval for non-existing email, expect 404
        non_existing_email = "nonexisting@example.com"
        otp_non_existing_response = session.get(
            f"{BASE_URL}/api/auth/test/otp/{non_existing_email}",
            headers=HEADERS_TENANT_ONLY,
            timeout=TIMEOUT,
        )
        assert otp_non_existing_response.status_code == 404, "Expected 404 for non-existing OTP retrieval"

        # Step 4: Verify unauthorized access for missing tenant slug header 404 Tenant Not Found or relevant error
        response_missing_tenant = session.get(
            f"{BASE_URL}/api/auth/test/otp/{ADMIN_EMAIL}",
            headers={},
            timeout=TIMEOUT,
        )
        assert response_missing_tenant.status_code == 404 or response_missing_tenant.status_code == 401, (
            f"Expected 404 or 401 for missing tenant slug header, got {response_missing_tenant.status_code}"
        )

    finally:
        session.close()


test_authentication_test_otp_retrieval_endpoint()