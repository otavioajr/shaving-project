import uuid
import requests

BASE_URL = "http://localhost:3000"
TENANT_HEADER = {"x-tenant-slug": "barbearia-teste"}
ADMIN_EMAIL = "admin@barbearia-teste.com"
ADMIN_PASSWORD = "senha123"


def login_with_email_password(session):
    resp = session.post(
        f"{BASE_URL}/api/auth/login",
        headers=TENANT_HEADER,
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    resp.raise_for_status()
    tokens = resp.json()
    access_token = tokens.get("accessToken")
    assert access_token, "Missing access token"
    return access_token


def auth_headers(access_token: str):
    return {**TENANT_HEADER, "Authorization": f"Bearer {access_token}"}


def test_crud_operations_for_services_with_authentication():
    session = requests.Session()

    # Unauthenticated access checks
    r = session.get(f"{BASE_URL}/api/services", headers=TENANT_HEADER, timeout=30)
    assert r.status_code in {200, 401, 403}

    r = session.post(
        f"{BASE_URL}/api/services",
        headers=TENANT_HEADER,
        json={"name": "Test Service", "price": 50, "duration": 30},
        timeout=30,
    )
    assert r.status_code in {401, 403}

    access_token = login_with_email_password(session)
    headers = auth_headers(access_token)

    new_service_id = None
    extra_service_id = None
    try:
        # CREATE
        service_data = {
            "name": f"Test Service {uuid.uuid4().hex[:6]}",
            "price": 120,
            "duration": 45,
        }
        r = session.post(f"{BASE_URL}/api/services", headers=headers, json=service_data, timeout=30)
        r.raise_for_status()
        assert r.status_code == 201
        body = r.json()
        new_service_id = body.get("id")
        assert new_service_id
        assert body.get("name") == service_data["name"]

        # GET by id
        r = session.get(f"{BASE_URL}/api/services/{new_service_id}", headers=headers, timeout=30)
        r.raise_for_status()
        fetched = r.json()
        assert fetched.get("id") == new_service_id

        # UPDATE
        update_data = {"name": "Updated Service", "price": 150, "duration": 60}
        r = session.put(
            f"{BASE_URL}/api/services/{new_service_id}",
            headers=headers,
            json=update_data,
            timeout=30,
        )
        r.raise_for_status()
        updated = r.json()
        assert updated.get("name") == update_data["name"]
        assert updated.get("price") == update_data["price"]

        # LIST
        r = session.get(f"{BASE_URL}/api/services", headers=headers, timeout=30)
        r.raise_for_status()
        listing = r.json()
        services_list = listing.get("data") if isinstance(listing, dict) else listing
        assert isinstance(services_list, list)
        assert any(s.get("id") == new_service_id for s in services_list)

        # DELETE
        r = session.delete(f"{BASE_URL}/api/services/{new_service_id}", headers=headers, timeout=30)
        assert r.status_code in {200, 204}

        # Confirm deletion
        r = session.get(f"{BASE_URL}/api/services/{new_service_id}", headers=headers, timeout=30)
        assert r.status_code == 404

        # Tenant isolation: wrong slug should 404
        r_wrong_tenant = session.get(
            f"{BASE_URL}/api/services/{new_service_id}",
            headers={"x-tenant-slug": "other-tenant", "Authorization": f"Bearer {access_token}"},
            timeout=30,
        )
        assert r_wrong_tenant.status_code == 404

        # Unauthorized tenant create should fail with 401/403/404
        r_wrong_create = session.post(
            f"{BASE_URL}/api/services",
            headers={"x-tenant-slug": "other-tenant", "Authorization": f"Bearer {access_token}"},
            json={"name": "Fail Service", "price": 50, "duration": 20},
            timeout=30,
        )
        assert r_wrong_create.status_code in {401, 403, 404}

        # Create another service to ensure cleanup works
        r_extra = session.post(
            f"{BASE_URL}/api/services",
            headers=headers,
            json={"name": f"Cleanup Service {uuid.uuid4().hex[:6]}", "price": 80, "duration": 30},
            timeout=30,
        )
        if r_extra.status_code == 201:
            extra_service_id = r_extra.json().get("id")

    finally:
        for sid in [new_service_id, extra_service_id]:
            if sid:
                try:
                    session.delete(f"{BASE_URL}/api/services/{sid}", headers=headers, timeout=30)
                except Exception:
                    pass


test_crud_operations_for_services_with_authentication()
