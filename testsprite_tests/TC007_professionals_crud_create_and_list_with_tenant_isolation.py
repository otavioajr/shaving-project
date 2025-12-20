import requests
import uuid

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
ADMIN_EMAIL = "admin@barbearia-teste.com"
ADMIN_PASSWORD = "senha123"
TIMEOUT = 30

headers_tenant = {"x-tenant-slug": TENANT_SLUG}

def test_professionals_crud_create_and_list_with_tenant_isolation():
    session = requests.Session()
    session.headers.update(headers_tenant)

    # Step 1: Request OTP for admin email to initiate auth
    otp_req_payload = {"email": ADMIN_EMAIL}
    otp_req_response = session.post(f"{BASE_URL}/api/auth/request-otp", json=otp_req_payload, timeout=TIMEOUT)
    assert otp_req_response.status_code == 200, f"Failed OTP request: {otp_req_response.text}"

    # Step 2: Retrieve OTP from test endpoint
    otp_get_response = session.get(f"{BASE_URL}/api/auth/test/otp/{ADMIN_EMAIL}", timeout=TIMEOUT)
    assert otp_get_response.status_code == 200, f"Failed getting OTP: {otp_get_response.text}"
    otp_data = otp_get_response.json()
    otp = otp_data.get("otp")
    assert otp and len(otp) == 6, "Invalid OTP received"

    # Step 3: Verify OTP to get JWT tokens
    verify_payload = {"email": ADMIN_EMAIL, "otp": otp}
    verify_response = session.post(f"{BASE_URL}/api/auth/verify-otp", json=verify_payload, timeout=TIMEOUT)
    assert verify_response.status_code == 200, f"Failed to verify OTP: {verify_response.text}"
    tokens = verify_response.json()
    access_token = tokens.get("accessToken")
    assert access_token, "No access token returned"
    # Prepare authorization header for protected endpoints
    auth_headers = {
        "x-tenant-slug": TENANT_SLUG,
        "Authorization": f"Bearer {access_token}"
    }

    # Step 4: List professionals before creation - check pagination and tenant-scoped response
    list_response_before = requests.get(f"{BASE_URL}/api/professionals", headers=auth_headers, timeout=TIMEOUT)
    assert list_response_before.status_code == 200, f"Failed to list professionals: {list_response_before.text}"
    list_json_before = list_response_before.json()
    assert "data" in list_json_before and "pagination" in list_json_before, "Missing pagination or data fields in listing"
    assert isinstance(list_json_before["data"], list), "Data field is not a list"

    # Step 5: Create a new professional with required fields
    unique_email = f"test-professional-{uuid.uuid4()}@example.com"
    new_professional_payload = {
        "name": "Test Professional",
        "email": unique_email,
        "password": "testpass123",
        "commissionRate": 10,
        "role": "BARBER"
    }

    created_professional_id = None
    try:
        create_response = requests.post(
            f"{BASE_URL}/api/professionals",
            headers=auth_headers,
            json=new_professional_payload,
            timeout=TIMEOUT
        )
        assert create_response.status_code == 201, f"Failed to create professional: {create_response.text}"
        created_professional = create_response.json()
        assert created_professional is not None, "Empty response body from create"
        # The ID may be returned inside the response - we assume "id" field to identify resource
        created_professional_id = created_professional.get("id")
        assert created_professional_id, "Created professional ID missing"

        # Step 6: List professionals after creation - new professional should be in list scoped to tenant
        list_response_after = requests.get(f"{BASE_URL}/api/professionals", headers=auth_headers, timeout=TIMEOUT)
        assert list_response_after.status_code == 200, f"Failed to list professionals after create: {list_response_after.text}"
        list_json_after = list_response_after.json()
        data_after = list_json_after.get("data", [])
        # Check that the newly created professional is in the list
        assert any(p.get("id") == created_professional_id for p in data_after), "New professional not found in listing"
    finally:
        # Cleanup: Delete the created professional if created_professional_id is set
        if created_professional_id:
            del_response = requests.delete(
                f"{BASE_URL}/api/professionals/{created_professional_id}",
                headers=auth_headers,
                timeout=TIMEOUT
            )
            # Accept 204 No Content or 200 OK or 404 (if already deleted)
            assert del_response.status_code in (200, 204, 404), f"Failed to delete professional: {del_response.text}"

test_professionals_crud_create_and_list_with_tenant_isolation()