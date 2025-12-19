import time
import uuid
import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
ADMIN_EMAIL = "admin@barbearia-teste.com"
ADMIN_PASSWORD = "senha123"
HEADERS = {
    "x-tenant-slug": TENANT_SLUG,
    "Content-Type": "application/json",
}


def login() -> str:
    resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        headers=HEADERS,
        timeout=30,
    )
    resp.raise_for_status()
    token = resp.json().get("accessToken")
    assert token, "Login did not return access token"
    return token


def auth_headers(access_token: str):
    return {**HEADERS, "Authorization": f"Bearer {access_token}"}


def create_professional(access_token: str, payload: dict):
    resp = requests.post(
        f"{BASE_URL}/api/professionals",
        json=payload,
        headers=auth_headers(access_token),
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    assert data.get("id"), "Professional creation did not return an id"
    return data


def get_professional(access_token: str, professional_id: str):
    resp = requests.get(
        f"{BASE_URL}/api/professionals/{professional_id}",
        headers=auth_headers(access_token),
        timeout=30,
    )
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json()


def update_professional(access_token: str, professional_id: str, payload: dict):
    resp = requests.put(
        f"{BASE_URL}/api/professionals/{professional_id}",
        json=payload,
        headers=auth_headers(access_token),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def delete_professional(access_token: str, professional_id: str):
    resp = requests.delete(
        f"{BASE_URL}/api/professionals/{professional_id}",
        headers=auth_headers(access_token),
        timeout=30,
    )
    assert resp.status_code in (200, 204)


def list_professionals(access_token: str):
    resp = requests.get(
        f"{BASE_URL}/api/professionals",
        headers=auth_headers(access_token),
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    assert "data" in data and "pagination" in data, "Expected paginated response"
    return data["data"], data["pagination"]


def crud_operations_for_professionals_with_tenant_isolation():
    access_token = login()

    unique_email = f"test-prof-{int(time.time())}-{uuid.uuid4().hex[:6]}@barbearia-teste.com"
    professional_payload = {
        "name": "John Doe",
        "email": unique_email,
        "password": "Test@123456",
        "commissionRate": 30,
        "role": "BARBER",
    }

    professional_id = None
    try:
        # CREATE
        created = create_professional(access_token, professional_payload)
        professional_id = created.get("id")
        assert created.get("name") == professional_payload["name"]
        assert created.get("email") == professional_payload["email"]
        assert created.get("role") == professional_payload["role"]

        # READ
        fetched = get_professional(access_token, professional_id)
        assert fetched is not None
        assert fetched.get("email") == professional_payload["email"]

        # UPDATE
        update_data = {"commissionRate": 25}
        updated = update_professional(access_token, professional_id, update_data)
        assert updated.get("commissionRate") == 25

        # LIST (paginated)
        items, pagination = list_professionals(access_token)
        assert isinstance(items, list)
        assert any(p.get("id") == professional_id for p in items)
        assert pagination.get("page") >= 1

        # Tenant slug missing -> 404
        r = requests.get(
            f"{BASE_URL}/api/professionals",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30,
        )
        assert r.status_code == 404, f"Expected 404 for missing tenant, got {r.status_code}"

        # Wrong tenant slug -> 404
        r = requests.get(
            f"{BASE_URL}/api/professionals",
            headers={"x-tenant-slug": "wrong-tenant", "Authorization": f"Bearer {access_token}"},
            timeout=30,
        )
        assert r.status_code == 404, f"Expected 404 for wrong tenant, got {r.status_code}"

        # Missing auth on create -> 401
        r = requests.post(
            f"{BASE_URL}/api/professionals",
            headers=HEADERS,
            json=professional_payload,
            timeout=30,
        )
        assert r.status_code == 401, f"Expected 401 for missing auth, got {r.status_code}"

        # Invalid token on update -> 401/403
        r = requests.put(
            f"{BASE_URL}/api/professionals/{professional_id}",
            headers={**HEADERS, "Authorization": "Bearer invalid"},
            json=update_data,
            timeout=30,
        )
        assert r.status_code in (401, 403)

        # DELETE
        delete_professional(access_token, professional_id)
        professional_id = None

        # Confirm deletion
        r = requests.get(
            f"{BASE_URL}/api/professionals/{professional_id}",
            headers=auth_headers(access_token),
            timeout=30,
        ) if professional_id else None
    finally:
        if professional_id:
            try:
                delete_professional(access_token, professional_id)
            except Exception:
                pass


crud_operations_for_professionals_with_tenant_isolation()
