import requests
import uuid

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
TIMEOUT = 30

ADMIN_EMAIL = "admin@barbearia.com"
ADMIN_PASSWORD = "senha123"
BARBER_EMAIL = "barber@barbearia.com"
BARBER_PASSWORD = "senha123"

HEADERS_JSON = {
    "Content-Type": "application/json",
    "x-tenant-slug": TENANT_SLUG,
}

def login(email, password):
    url = f"{BASE_URL}/api/auth/login"
    payload = {"email": email, "password": password}
    response = requests.post(url, json=payload, headers={"x-tenant-slug": TENANT_SLUG, "Content-Type": "application/json"}, timeout=TIMEOUT)
    return response

def create_professional(token, professional_data):
    url = f"{BASE_URL}/api/professionals"
    headers = HEADERS_JSON.copy()
    headers["Authorization"] = f"Bearer {token}"
    response = requests.post(url, json=professional_data, headers=headers, timeout=TIMEOUT)
    return response

def delete_professional(token, professional_id):
    url = f"{BASE_URL}/api/professionals/{professional_id}"
    headers = HEADERS_JSON.copy()
    headers["Authorization"] = f"Bearer {token}"
    response = requests.delete(url, headers=headers, timeout=TIMEOUT)
    return response

def test_create_professional_with_admin_role_and_duplicate_email_handling():
    # Login as ADMIN (should succeed)
    admin_login_resp = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    assert admin_login_resp.status_code == 200, f"Admin login failed: {admin_login_resp.text}"
    admin_access_token = admin_login_resp.json().get("accessToken")
    assert admin_access_token, "Admin access token missing"

    # Login as BARBER (should succeed)
    barber_login_resp = login(BARBER_EMAIL, BARBER_PASSWORD)
    assert barber_login_resp.status_code == 200, f"Barber login failed: {barber_login_resp.text}"
    barber_access_token = barber_login_resp.json().get("accessToken")
    assert barber_access_token, "Barber access token missing"

    # Attempt to create professional WITHOUT auth header (unauthorized) => 401
    professional_payload = {
        "name": "Test Professional ADMIN",
        "email": f"testadmin_{uuid.uuid4()}@example.com",
        "password": "password123",
        "commissionRate": 10,
        "role": "ADMIN"
    }
    url = f"{BASE_URL}/api/professionals"
    headers = HEADERS_JSON.copy()
    no_auth_resp = requests.post(url, json=professional_payload, headers=headers, timeout=TIMEOUT)
    assert no_auth_resp.status_code == 401, f"Expected 401 Unauthorized without auth, got {no_auth_resp.status_code}"

    # Attempt to create professional with BARBER role token (forbidden) => 403
    barber_create_resp = create_professional(barber_access_token, professional_payload)
    assert barber_create_resp.status_code == 403, f"Expected 403 Forbidden for BARBER role, got {barber_create_resp.status_code}"

    # Create professional with ADMIN role token (should succeed 201)
    # Generate unique email for creation
    unique_email = f"testadmin_{uuid.uuid4()}@example.com"
    professional_payload["email"] = unique_email
    admin_create_resp = create_professional(admin_access_token, professional_payload)
    assert admin_create_resp.status_code == 201, f"Expected 201 Created for ADMIN role, got {admin_create_resp.status_code}"
    created_professional_location = admin_create_resp.headers.get("Location") or admin_create_resp.json().get("id")
    # We may not get location header, so attempt to get id from json
    # If neither, fail
    if created_professional_location is None:
        # fallback try response body 'id' property
        json_resp = admin_create_resp.json()
        created_professional_id = json_resp.get("id")
        assert created_professional_id, "Failed to get created professional ID"
    else:
        created_professional_id = created_professional_location

    try:
        # Try to create professional again with SAME email (duplicate) => 409
        duplicate_payload = professional_payload.copy()
        duplicate_resp = create_professional(admin_access_token, duplicate_payload)
        assert duplicate_resp.status_code == 409, f"Expected 409 Conflict for duplicate email, got {duplicate_resp.status_code}"
    finally:
        # Cleanup: delete created professional if possible
        del_resp = delete_professional(admin_access_token, created_professional_id)
        # Deleting may return 204 No Content or 404 if already gone
        assert del_resp.status_code in (204, 404), f"Failed to delete professional, got status {del_resp.status_code}"

test_create_professional_with_admin_role_and_duplicate_email_handling()