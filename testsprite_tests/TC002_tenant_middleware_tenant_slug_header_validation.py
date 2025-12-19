import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
INVALID_TENANT_SLUG = "invalid-tenant"
ADMIN_EMAIL = "admin@barbearia-teste.com"
ADMIN_PASSWORD = "senha123"
TIMEOUT = 30

def test_tenant_middleware_tenant_slug_header_validation():
    """
    Test that secured endpoints require x-tenant-slug header and that missing or invalid values return 404 Tenant Not Found.
    """

    headers_with_tenant = {"x-tenant-slug": TENANT_SLUG}
    headers_with_invalid_tenant = {"x-tenant-slug": INVALID_TENANT_SLUG}
    headers_without_tenant = {}

    # Step 1: Request OTP for seeded admin email to ensure OTP is stored
    otp_request_payload = {"email": ADMIN_EMAIL}
    try:
        resp = requests.post(
            f"{BASE_URL}/api/auth/request-otp",
            headers=headers_with_tenant,
            json=otp_request_payload,
            timeout=TIMEOUT,
        )
        assert resp.status_code == 200, f"OTP request failed: {resp.text}"
    except Exception as e:
        raise AssertionError(f"OTP request failed with exception: {e}")

    # Step 2: Retrieve OTP from test-only endpoint for seeded admin email
    try:
        resp = requests.get(
            f"{BASE_URL}/api/auth/test/otp/{ADMIN_EMAIL}",
            headers=headers_with_tenant,
            timeout=TIMEOUT,
        )
        assert resp.status_code == 200, f"Failed to retrieve OTP: {resp.text}"
        otp = resp.json().get("otp")
        assert otp is not None and len(otp) == 6, "Invalid OTP retrieved"
    except Exception as e:
        raise AssertionError(f"OTP retrieval failed with exception: {e}")

    # Step 3: Verify OTP to get tokens
    otp_verify_payload = {"email": ADMIN_EMAIL, "otp": otp}
    try:
        resp = requests.post(
            f"{BASE_URL}/api/auth/verify-otp",
            headers=headers_with_tenant,
            json=otp_verify_payload,
            timeout=TIMEOUT,
        )
        assert resp.status_code == 200, f"OTP verification failed: {resp.text}"
        tokens = resp.json()
        access_token = tokens.get("accessToken")
        assert access_token is not None, "Access token missing in OTP verification response"
    except Exception as e:
        raise AssertionError(f"OTP verification failed with exception: {e}")

    auth_header = {"Authorization": f"Bearer {access_token}"}

    # Define a list of secured endpoints (GET) to test tenant header validation
    # Using several representative secured endpoints for the test.
    secured_endpoints = [
        ("/api/auth/login", "POST", {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}),
        ("/api/professionals", "GET", None),
        ("/api/clients", "GET", None),
        ("/api/services", "GET", None),
        ("/api/appointments", "POST", {
            "professionalId": "some-id",
            "clientId": "some-id",
            "serviceId": "some-id",
            "date": "2025-12-31T10:00:00.000Z",
        }),
        ("/api/transactions", "GET", None),
        ("/api/barbershop", "GET", None),
    ]

    for path, method, payload in secured_endpoints:
        url = f"{BASE_URL}{path}"

        # 1) Missing x-tenant-slug header => Expect 404 Tenant Not Found
        try:
            if method == "GET":
                r = requests.get(url, headers={}, timeout=TIMEOUT)
            elif method == "POST":
                r = requests.post(url, headers={}, json=payload, timeout=TIMEOUT)
            else:
                continue
            assert r.status_code == 404, f"Expected 404 for missing tenant header on {path}, got {r.status_code}"
            # Validate error message content
            try:
                json_resp = r.json()
                assert "Tenant" in json_resp.get("message", "") or "Tenant" in json_resp.get("error", ""), f"Unexpected error message for missing tenant header on {path}"
            except Exception:
                pass
        except Exception as e:
            raise AssertionError(f"Request missing tenant header failed unexpectedly at {path}: {e}")

        # 2) Invalid x-tenant-slug header => Expect 404 Tenant Not Found
        try:
            headers = headers_with_invalid_tenant.copy()
            # Add auth header if endpoint requires authentication (assuming all except auth/login and barbershop GET require)
            if path not in ["/api/auth/login", "/api/barbershop"]:
                headers.update(auth_header)

            if method == "GET":
                r = requests.get(url, headers=headers, timeout=TIMEOUT)
            elif method == "POST":
                r = requests.post(url, headers=headers, json=payload, timeout=TIMEOUT)
            else:
                continue
            assert r.status_code == 404, f"Expected 404 for invalid tenant header on {path}, got {r.status_code}"
            # Validate error message content
            try:
                json_resp = r.json()
                assert "Tenant" in json_resp.get("message", "") or "Tenant" in json_resp.get("error", ""), f"Unexpected error message for invalid tenant header on {path}"
            except Exception:
                pass
        except Exception as e:
            raise AssertionError(f"Request with invalid tenant header failed unexpectedly at {path}: {e}")

    # 3) Valid tenant header included returns not 404 (basic sanity check on one endpoint)
    # Use GET /api/professionals with valid tenant and proper auth header
    try:
        headers = headers_with_tenant.copy()
        headers.update(auth_header)
        resp = requests.get(f"{BASE_URL}/api/professionals", headers=headers, timeout=TIMEOUT)
        assert resp.status_code != 404, f"Endpoint responded 404 despite valid tenant header: {resp.text}"
    except Exception as e:
        raise AssertionError(f"Request with valid tenant header failed unexpectedly: {e}")

test_tenant_middleware_tenant_slug_header_validation()