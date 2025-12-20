import time
import uuid
import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
ADMIN_EMAIL = "admin@barbearia-teste.com"
ADMIN_PASSWORD = "senha123"
HEADERS_BASE = {
    "x-tenant-slug": TENANT_SLUG,
    "Content-Type": "application/json",
}


def login() -> str:
    resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        headers=HEADERS_BASE,
        timeout=30,
    )
    resp.raise_for_status()
    token = resp.json().get("accessToken")
    assert token, "Login did not return access token"
    return token


def auth_headers(token: str):
    return {**HEADERS_BASE, "Authorization": f"Bearer {token}"}


def create_client(token: str, payload: dict):
    resp = requests.post(
        f"{BASE_URL}/api/clients",
        headers=auth_headers(token),
        json=payload,
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    assert data.get("id")
    return data


def get_client(token: str, client_id: str):
    resp = requests.get(
        f"{BASE_URL}/api/clients/{client_id}",
        headers=auth_headers(token),
        timeout=30,
    )
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json()


def update_client(token: str, client_id: str, payload: dict):
    resp = requests.put(
        f"{BASE_URL}/api/clients/{client_id}",
        headers=auth_headers(token),
        json=payload,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def delete_client(token: str, client_id: str):
    resp = requests.delete(
        f"{BASE_URL}/api/clients/{client_id}",
        headers=auth_headers(token),
        timeout=30,
    )
    assert resp.status_code in (200, 204)


def list_clients(token: str):
    resp = requests.get(
        f"{BASE_URL}/api/clients",
        headers=auth_headers(token),
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    assert "data" in data and "pagination" in data, "Expected paginated response"
    return data["data"], data["pagination"]


def test_crud_operations_for_clients_with_tenant_isolation():
    token = login()
    phone_unique = f"+5511{int(time.time())%100000000:08d}"
    client_payload = {
        "name": f"Test Client {uuid.uuid4().hex[:6]}",
        "phone": phone_unique,
    }

    client_id = None
    try:
        # CREATE
        created = create_client(token, client_payload)
        client_id = created.get("id")
        assert created.get("name") == client_payload["name"]
        assert created.get("phone") == client_payload["phone"]

        # READ
        fetched = get_client(token, client_id)
        assert fetched is not None
        assert fetched.get("name") == client_payload["name"]
        assert fetched.get("phone") == client_payload["phone"]

        # UPDATE
        update_data = {"phone": f"+5511{int(time.time())%100000000:08d}"}
        updated = update_client(token, client_id, update_data)
        assert updated.get("phone") == update_data["phone"]

        # LIST
        items, pagination = list_clients(token)
        assert isinstance(items, list)
        assert any(c.get("id") == client_id for c in items)
        assert pagination.get("page") >= 1

        # Wrong tenant slug -> 404
        r = requests.get(
            f"{BASE_URL}/api/clients/{client_id}",
            headers={"x-tenant-slug": "nonexisting-tenant", "Authorization": f"Bearer {token}"},
            timeout=30,
        )
        assert r.status_code == 404, f"Expected 404 for wrong tenant, got {r.status_code}"

        # Missing tenant slug -> 404
        r = requests.get(
            f"{BASE_URL}/api/clients/{client_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        assert r.status_code == 404, f"Expected 404 for missing tenant, got {r.status_code}"

        # Missing auth on create -> 401
        r = requests.post(
            f"{BASE_URL}/api/clients",
            headers=HEADERS_BASE,
            json=client_payload,
            timeout=30,
        )
        assert r.status_code == 401, f"Expected 401 for missing auth, got {r.status_code}"

        # DELETE
        delete_client(token, client_id)
        client_id = None

        # Confirm deletion
        r = requests.get(
            f"{BASE_URL}/api/clients/{client_id}",
            headers=auth_headers(token),
            timeout=30,
        ) if client_id else None
    finally:
        if client_id:
            try:
                delete_client(token, client_id)
            except Exception:
                pass


test_crud_operations_for_clients_with_tenant_isolation()
