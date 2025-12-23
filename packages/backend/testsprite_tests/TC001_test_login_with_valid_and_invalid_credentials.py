import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
HEADERS = {"x-tenant-slug": TENANT_SLUG, "Content-Type": "application/json"}

def test_login_with_valid_and_invalid_credentials():
    # Valid credentials for ADMIN role
    valid_admin_payload = {
        "email": "admin@barbearia.com",
        "password": "senha123"
    }
    response = requests.post(LOGIN_URL, json=valid_admin_payload, headers=HEADERS, timeout=30)
    assert response.status_code == 200, f"Expected 200 but got {response.status_code}"
    data = response.json()
    assert "accessToken" in data, "accessToken missing in response"
    assert "refreshToken" in data, "refreshToken missing in response"
    assert "professional" in data, "professional data missing in response"
    professional = data["professional"]
    assert professional.get("email") == valid_admin_payload["email"]
    assert professional.get("role") == "ADMIN"

    # Valid credentials for BARBER role
    valid_barber_payload = {
        "email": "barber@barbearia.com",
        "password": "senha123"
    }
    response = requests.post(LOGIN_URL, json=valid_barber_payload, headers=HEADERS, timeout=30)
    assert response.status_code == 200, f"Expected 200 but got {response.status_code}"
    data = response.json()
    assert "accessToken" in data, "accessToken missing in response (barber)"
    assert "refreshToken" in data, "refreshToken missing in response (barber)"
    assert "professional" in data, "professional data missing in response (barber)"
    professional = data["professional"]
    assert professional.get("email") == valid_barber_payload["email"]
    assert professional.get("role") == "BARBER"

    # Invalid credentials (wrong password)
    invalid_payload = {
        "email": "admin@barbearia.com",
        "password": "wrongpassword"
    }
    response = requests.post(LOGIN_URL, json=invalid_payload, headers=HEADERS, timeout=30)
    assert response.status_code == 401, f"Expected 401 for invalid credentials but got {response.status_code}"

    # Invalid credentials (non-existent email)
    invalid_payload = {
        "email": "nonexistent@barbearia.com",
        "password": "senha123"
    }
    response = requests.post(LOGIN_URL, json=invalid_payload, headers=HEADERS, timeout=30)
    assert response.status_code == 401, f"Expected 401 for invalid credentials but got {response.status_code}"

    # Missing tenant slug header
    headers_missing_tenant = {"Content-Type": "application/json"}
    response = requests.post(LOGIN_URL, json=valid_admin_payload, headers=headers_missing_tenant, timeout=30)
    assert response.status_code == 404, f"Expected 404 for missing tenant slug but got {response.status_code}"

    # Invalid tenant slug header
    headers_invalid_tenant = {"x-tenant-slug": "invalid-tenant", "Content-Type": "application/json"}
    response = requests.post(LOGIN_URL, json=valid_admin_payload, headers=headers_invalid_tenant, timeout=30)
    assert response.status_code == 404, f"Expected 404 for invalid tenant slug but got {response.status_code}"

test_login_with_valid_and_invalid_credentials()