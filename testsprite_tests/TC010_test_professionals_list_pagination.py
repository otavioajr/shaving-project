import requests
import time
from urllib.parse import quote
from requests.exceptions import ReadTimeout, ProxyError

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
ADMIN_EMAIL = "admin@barbearia-teste.com"
ADMIN_PASSWORD = "senha123"
HEADERS_TENANT = {"x-tenant-slug": TENANT_SLUG}
LOGIN_TIMEOUT = 60
REQUEST_TIMEOUT = 30
RETRY_ATTEMPTS = 3
RETRY_BACKOFF = 1


def request_with_retries(method, url, **kwargs):
    for attempt in range(RETRY_ATTEMPTS):
        try:
            resp = requests.request(method, url, **kwargs)
            return resp
        except (ReadTimeout, ProxyError) as e:
            if "tun.testsprite.com" in url:
                if attempt < RETRY_ATTEMPTS - 1:
                    time.sleep(RETRY_BACKOFF)
                else:
                    raise
            else:
                raise


def login(email, password):
    url = f"{BASE_URL}/api/auth/login"
    json_data = {"email": email, "password": password}
    headers = {**HEADERS_TENANT}
    resp = request_with_retries(
        "POST", url, json=json_data, headers=headers, timeout=LOGIN_TIMEOUT
    )
    resp.raise_for_status()
    data = resp.json()
    assert "accessToken" in data and "refreshToken" in data
    return data["accessToken"], data["refreshToken"]


def create_professional(access_token, name, email, password, commissionRate, role):
    url = f"{BASE_URL}/api/professionals"
    headers = {
        **HEADERS_TENANT,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    json_data = {
        "name": name,
        "email": email,
        "password": password,
        "commissionRate": commissionRate,
        "role": role,
    }
    resp = requests.post(url, json=json_data, headers=headers, timeout=REQUEST_TIMEOUT)
    if resp.status_code == 409:
        # Conflict, professional might already exist
        return None
    resp.raise_for_status()
    data = resp.json()
    assert data.get("id") is not None
    return data


def delete_professional(access_token, professional_id):
    url = f"{BASE_URL}/api/professionals/{professional_id}"
    headers = {
        **HEADERS_TENANT,
        "Authorization": f"Bearer {access_token}",
    }
    resp = requests.delete(url, headers=headers, timeout=REQUEST_TIMEOUT)
    # 204 No Content on success, 404 if already deleted
    if resp.status_code not in (204, 404):
        resp.raise_for_status()


def test_professionals_list_pagination():
    # Step 1: Login as admin
    access_token, _ = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    # Step 2: Create a new professional to ensure at least one record exists
    import uuid

    unique_email = f"testpro_{uuid.uuid4().hex[:8]}@barbearia-teste.com"
    unique_name = f"Test Pro {uuid.uuid4().hex[:6]}"
    professional = None
    try:
        professional = create_professional(
            access_token=access_token,
            name=unique_name,
            email=unique_email,
            password="secret123",
            commissionRate=10,
            role="BARBER",
        )

        # Step 3: Call GET /api/professionals with pagination (default page=1, limit=10)
        url = f"{BASE_URL}/api/professionals"
        headers = {
            **HEADERS_TENANT,
            "Authorization": f"Bearer {access_token}",
        }
        params = {"page": 1, "limit": 10}
        resp = requests.get(url, headers=headers, params=params, timeout=REQUEST_TIMEOUT)
        assert resp.status_code == 200
        body = resp.json()
        assert "data" in body and isinstance(body["data"], list)
        assert "pagination" in body and isinstance(body["pagination"], dict)

        pagination = body["pagination"]
        # Validate pagination keys
        for key in ("page", "limit", "total", "totalPages"):
            assert key in pagination
            assert isinstance(pagination[key], int)

        # Check tenant isolation: all professionals returned must belong to tenant 'barbearia-teste'
        # We assume the response professionals do NOT include tenant slug explicitly. Instead,
        # we rely on headers and login context for tenant.
        # Since the system is multi-tenant, listing professionals with this tenant slug header
        # should only show professionals belonging to this tenant.
        # We'll check that at least our created professional is in returned list.
        professional_ids = [p["id"] for p in body["data"] if "id" in p]
        if professional:
            assert professional["id"] in professional_ids

        # Check role-based access control: since logged in as admin, all professionals should be visible
        # Cannot assert more without roles data or other tenant's data, but this suffices.

    finally:
        # Cleanup created professional
        if professional and "id" in professional:
            delete_professional(access_token, professional["id"])


test_professionals_list_pagination()