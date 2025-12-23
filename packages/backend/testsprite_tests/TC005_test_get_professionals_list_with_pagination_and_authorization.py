import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
PROFESSIONALS_URL = f"{BASE_URL}/api/professionals"

ADMIN_EMAIL = "admin@barbearia.com"
ADMIN_PASSWORD = "senha123"
BARBER_EMAIL = "barber@barbearia.com"
BARBER_PASSWORD = "senha123"

HEADERS_COMMON = {
    "x-tenant-slug": TENANT_SLUG,
    "Content-Type": "application/json"
}
TIMEOUT = 30


def get_access_token(email: str, password: str):
    try:
        response = requests.post(
            LOGIN_URL,
            headers=HEADERS_COMMON,
            json={"email": email, "password": password},
            timeout=TIMEOUT,
        )
        if response.status_code == 200:
            return response.json().get("accessToken")
        else:
            return None
    except Exception:
        return None


def test_get_professionals_list_with_pagination_and_authorization():
    # Obtain admin token (should have access)
    admin_token = get_access_token(ADMIN_EMAIL, ADMIN_PASSWORD)
    assert admin_token is not None, "Failed to login as ADMIN"

    # Obtain barber token (BARBER role, test forbidden 403)
    barber_token = get_access_token(BARBER_EMAIL, BARBER_PASSWORD)
    assert barber_token is not None, "Failed to login as BARBER"

    # 1) Test authorized ADMIN user gets paginated list
    params = {"page": 1, "limit": 5}
    headers_admin = {
        **HEADERS_COMMON,
        "Authorization": f"Bearer {admin_token}"
    }
    resp = requests.get(PROFESSIONALS_URL, headers=headers_admin, params=params, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Expected 200 for authorized ADMIN, got {resp.status_code}"
    json_data = resp.json()
    assert "data" in json_data and isinstance(json_data["data"], list), "Response missing 'data' list"
    assert "pagination" in json_data, "Response missing 'pagination' info"
    pag = json_data["pagination"]
    assert pag.get("page") == 1, "Pagination page mismatch"
    assert pag.get("limit") == 5, "Pagination limit mismatch"
    assert isinstance(pag.get("total"), int), "Pagination total is not int"
    assert isinstance(pag.get("totalPages"), int), "Pagination totalPages is not int"

    # 2) Test unauthorized access (no token) gets 401
    headers_no_auth = {
        **HEADERS_COMMON,
    }
    resp_unauth = requests.get(PROFESSIONALS_URL, headers=headers_no_auth, params=params, timeout=TIMEOUT)
    assert resp_unauth.status_code == 401, f"Expected 401 for unauthorized access, got {resp_unauth.status_code}"

    # 3) Test forbidden access: BARBER role should get 403 (only ADMIN allowed)
    headers_barber = {
        **HEADERS_COMMON,
        "Authorization": f"Bearer {barber_token}"
    }
    resp_forbidden = requests.get(PROFESSIONALS_URL, headers=headers_barber, params=params, timeout=TIMEOUT)
    # The PRD indicates "403 Forbidden" for forbidden access
    assert resp_forbidden.status_code == 403, f"Expected 403 for BARBER role accessing professionals list, got {resp_forbidden.status_code}"

    # 4) Test missing tenant slug header returns 404
    headers_missing_tenant = {
        "Authorization": f"Bearer {admin_token}"
    }
    resp_missing_tenant = requests.get(PROFESSIONALS_URL, headers=headers_missing_tenant, params=params, timeout=TIMEOUT)
    assert resp_missing_tenant.status_code == 404, f"Expected 404 for missing tenant slug header, got {resp_missing_tenant.status_code}"

    # 5) Test invalid tenant slug header returns 404
    headers_invalid_tenant = {
        "Authorization": f"Bearer {admin_token}",
        "x-tenant-slug": "invalid-tenant-slug"
    }
    resp_invalid_tenant = requests.get(PROFESSIONALS_URL, headers=headers_invalid_tenant, params=params, timeout=TIMEOUT)
    assert resp_invalid_tenant.status_code == 404, f"Expected 404 for invalid tenant slug header, got {resp_invalid_tenant.status_code}"


test_get_professionals_list_with_pagination_and_authorization()