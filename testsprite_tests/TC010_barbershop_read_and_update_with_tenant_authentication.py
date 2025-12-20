import uuid
import requests

BASE_URL = "http://localhost:3000"
HEADERS = {"x-tenant-slug": "barbearia-teste", "Content-Type": "application/json"}
ADMIN_EMAIL = "admin@barbearia-teste.com"
ADMIN_PASSWORD = "senha123"


def login() -> str:
    resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        headers=HEADERS,
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    resp.raise_for_status()
    token = resp.json().get("accessToken")
    assert token, "Login did not return access token"
    return token


def auth_headers(token: str):
    return {**HEADERS, "Authorization": f"Bearer {token}"}


def test_barbershop_read_and_update_with_tenant_authentication():
    token = login()
    headers = auth_headers(token)

    # GET current barbershop
    r = requests.get(f"{BASE_URL}/api/barbershop", headers=headers, timeout=30)
    r.raise_for_status()
    assert r.status_code == 200
    barbershop = r.json()
    original_name = barbershop.get("name")
    assert barbershop.get("id"), "Missing barbershop id"

    # Update name
    new_name = f"Barbearia Teste {uuid.uuid4().hex[:4]}"
    r_upd = requests.put(
        f"{BASE_URL}/api/barbershop",
        headers=headers,
        json={"name": new_name},
        timeout=30,
    )
    r_upd.raise_for_status()
    updated = r_upd.json()
    assert updated.get("name") == new_name

    # Restore original name
    if original_name:
        requests.put(
            f"{BASE_URL}/api/barbershop",
            headers=headers,
            json={"name": original_name},
            timeout=30,
        )

    # Tenant isolation: wrong slug -> 404
    r_wrong = requests.get(
        f"{BASE_URL}/api/barbershop",
        headers={"x-tenant-slug": "wrong-tenant", "Authorization": f"Bearer {token}"},
        timeout=30,
    )
    assert r_wrong.status_code == 404

    # Missing tenant slug -> 404
    r_missing = requests.get(
        f"{BASE_URL}/api/barbershop",
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    assert r_missing.status_code == 404

    # Missing auth -> 200 (barbershop endpoints require tenant, not auth)
    r_no_auth = requests.get(f"{BASE_URL}/api/barbershop", headers=HEADERS, timeout=30)
    assert r_no_auth.status_code == 200
    assert r_no_auth.json().get("id"), "Missing barbershop id on unauthenticated read"


test_barbershop_read_and_update_with_tenant_authentication()
