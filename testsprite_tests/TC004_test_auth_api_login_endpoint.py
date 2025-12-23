import requests

BASE_URL = "http://localhost:3000"
LOGIN_ENDPOINT = "/api/auth/login"
TIMEOUT = 30

def test_auth_api_login_endpoint():
    tenant_slug_valid = "barbearia-teste"
    tenant_slug_invalid = "invalid-tenant-slug"
    valid_email = "admin@barbearia-teste.com"  # Replace with valid email in test DB
    valid_password = "correctpassword"         # Replace with valid password in test DB
    invalid_email = "wrong@barbearia-teste.com"
    invalid_password = "wrongpassword"
    
    headers = {"Content-Type": "application/json"}

    # 1. Test valid login returns accessToken, refreshToken and professional details (200)
    try:
        response = requests.post(
            f"{BASE_URL}{LOGIN_ENDPOINT}",
            headers={**headers, "x-tenant-slug": tenant_slug_valid},
            json={"email": valid_email, "password": valid_password},
            timeout=TIMEOUT,
        )
        assert response.status_code == 200, f"Expected 200 but got {response.status_code}"
        data = response.json()
        assert "accessToken" in data and isinstance(data["accessToken"], str) and data["accessToken"]
        assert "refreshToken" in data and isinstance(data["refreshToken"], str) and data["refreshToken"]
        assert "professional" in data and isinstance(data["professional"], dict)
        prof = data["professional"]
        assert "id" in prof and isinstance(prof["id"], str) and prof["id"]
        assert "name" in prof and isinstance(prof["name"], str) and prof["name"]
        assert "email" in prof and prof["email"] == valid_email
        assert "role" in prof and prof["role"] in ("ADMIN", "BARBER")
    except Exception as e:
        raise AssertionError(f"Valid login test failed: {e}")

    # 2. Test invalid credentials return 401
    try:
        response = requests.post(
            f"{BASE_URL}{LOGIN_ENDPOINT}",
            headers={**headers, "x-tenant-slug": tenant_slug_valid},
            json={"email": invalid_email, "password": invalid_password},
            timeout=TIMEOUT,
        )
        assert response.status_code == 401, f"Expected 401 but got {response.status_code}"
    except Exception as e:
        raise AssertionError(f"Invalid credentials test failed: {e}")

    # 3. Test missing tenant slug returns 404
    try:
        response = requests.post(
            f"{BASE_URL}{LOGIN_ENDPOINT}",
            headers=headers,
            json={"email": valid_email, "password": valid_password},
            timeout=TIMEOUT,
        )
        assert response.status_code == 404, f"Expected 404 but got {response.status_code}"
    except Exception as e:
        raise AssertionError(f"Missing tenant slug test failed: {e}")

    # 4. Test invalid tenant slug returns 404
    try:
        response = requests.post(
            f"{BASE_URL}{LOGIN_ENDPOINT}",
            headers={**headers, "x-tenant-slug": tenant_slug_invalid},
            json={"email": valid_email, "password": valid_password},
            timeout=TIMEOUT,
        )
        assert response.status_code == 404, f"Expected 404 but got {response.status_code}"
    except Exception as e:
        raise AssertionError(f"Invalid tenant slug test failed: {e}")

test_auth_api_login_endpoint()
