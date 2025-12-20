import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
ADMIN_EMAIL = "admin@barbearia-teste.com"
ADMIN_PASSWORD = "senha123"
TIMEOUT = 30

def test_authentication_login_with_email_and_password():
    headers = {
        "x-tenant-slug": TENANT_SLUG,
        "Content-Type": "application/json"
    }
    payload = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=payload,
            headers=headers,
            timeout=TIMEOUT,
        )
    except requests.RequestException as e:
        assert False, f"Request to /api/auth/login failed: {e}"

    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"

    json_data = response.json()
    # Validate presence of tokens and professional object with required fields
    assert "accessToken" in json_data and isinstance(json_data["accessToken"], str) and json_data["accessToken"], "Missing or invalid accessToken"
    assert "refreshToken" in json_data and isinstance(json_data["refreshToken"], str) and json_data["refreshToken"], "Missing or invalid refreshToken"
    assert "professional" in json_data and isinstance(json_data["professional"], dict), "Missing professional info"

    professional = json_data["professional"]
    assert "id" in professional and isinstance(professional["id"], str) and professional["id"], "Professional id missing or invalid"
    assert "name" in professional and isinstance(professional["name"], str) and professional["name"], "Professional name missing or invalid"
    assert "email" in professional and professional["email"] == ADMIN_EMAIL, "Professional email mismatched"
    assert "role" in professional and professional["role"] in ("ADMIN", "BARBER"), "Professional role invalid"

test_authentication_login_with_email_and_password()