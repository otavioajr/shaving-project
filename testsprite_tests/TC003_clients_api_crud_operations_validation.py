import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
AUTH_EMAIL = "admin@barbearia-teste.com"
AUTH_PASSWORD = "senha123"
TIMEOUT = 30

headers = {
    "x-tenant-slug": TENANT_SLUG,
    "Content-Type": "application/json"
}


def authenticate():
    url = f"{BASE_URL}/auth/login"
    payload = {"email": AUTH_EMAIL, "password": AUTH_PASSWORD}
    r = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    r.raise_for_status()
    data = r.json()
    assert "accessToken" in data and data["accessToken"], "Auth accessToken missing in login response"
    return data["accessToken"]


def test_clients_api_crud_operations_validation():
    token = authenticate()
    auth_headers = headers.copy()
    auth_headers["Authorization"] = f"Bearer {token}"

    client_data = {
        "name": "Test Client",
        "email": "testclient@example.com",
        "phone": "123456789",
        "birthDate": "1980-01-01",
        "notes": "Test client notes"
    }

    created_client_id = None
    try:
        # CREATE client
        create_resp = requests.post(f"{BASE_URL}/clients", json=client_data, headers=auth_headers, timeout=TIMEOUT)
        assert create_resp.status_code == 201, f"Expected 201 Created, got {create_resp.status_code}"
        created_client = create_resp.json()
        created_client_id = created_client.get("id")
        assert created_client_id, "Created client ID is missing"
        for key in client_data:
            if key in created_client:
                assert created_client[key] == client_data[key], f"Client {key} mismatch"

        # READ client (GET by ID)
        get_resp = requests.get(f"{BASE_URL}/clients/{created_client_id}", headers=auth_headers, timeout=TIMEOUT)
        assert get_resp.status_code == 200, f"Expected 200 OK on get, got {get_resp.status_code}"
        got_client = get_resp.json()
        assert got_client.get("id") == created_client_id, "Client ID mismatch on GET"
        for key in client_data:
            if key in got_client:
                assert got_client[key] == client_data[key], f"Client {key} mismatch on GET"

        # UPDATE client
        update_data = {"notes": "Updated notes", "phone": "987654321"}
        update_resp = requests.put(f"{BASE_URL}/clients/{created_client_id}", json=update_data, headers=auth_headers, timeout=TIMEOUT)
        assert update_resp.status_code == 200, f"Expected 200 OK on update, got {update_resp.status_code}"
        updated_client = update_resp.json()
        assert updated_client.get("notes") == update_data["notes"], "Client notes not updated"
        assert updated_client.get("phone") == update_data["phone"], "Client phone not updated"

        # SOFT DELETE client (set isActive = false)
        soft_delete_data = {"isActive": False}
        soft_delete_resp = requests.put(f"{BASE_URL}/clients/{created_client_id}", json=soft_delete_data, headers=auth_headers, timeout=TIMEOUT)
        assert soft_delete_resp.status_code == 200, f"Expected 200 OK on soft delete, got {soft_delete_resp.status_code}"
        soft_deleted_client = soft_delete_resp.json()
        assert soft_deleted_client.get("isActive") is False, "Client isActive not set to False on soft delete"

        # VERIFY client is filtered out from list (should NOT appear)
        list_resp = requests.get(f"{BASE_URL}/clients", headers=auth_headers, timeout=TIMEOUT)
        assert list_resp.status_code == 200, f"Expected 200 OK on list, got {list_resp.status_code}"
        clients_list = list_resp.json()
        assert isinstance(clients_list, list), "Clients list response is not an array"
        ids_in_list = [c.get("id") for c in clients_list]
        assert created_client_id not in ids_in_list, "Soft deleted client should not be in clients listing"

        # Test RBAC (role based access control)
        # Trying to perform non-admin operation (simulate a non-admin user)
        # Since we only have admin user here, emulate RBAC by using a token with a different role if available
        # For this test case, just verify that access with admin token works and potentially check forbidden on invalid actions
        # Example: Attempt to DELETE client (if forbidden)
        delete_resp = requests.delete(f"{BASE_URL}/clients/{created_client_id}", headers=auth_headers, timeout=TIMEOUT)
        # The PRD does not mention hard delete allowed or forbidden.
        # Assuming hard delete as disallowed or restricted, accept 403 or 204/200 if allowed

        # Accept either 403 forbidden or 204/200 for delete depending on RBAC policy, verify response accordingly
        if delete_resp.status_code == 403:
            pass  # Forbidden as expected for RBAC
        else:
            assert delete_resp.status_code in (200, 204), f"Unexpected status code on delete: {delete_resp.status_code}"

    finally:
        # CLEANUP: If client was created and not hard deleted above, try hard delete to clean data
        if created_client_id:
            try:
                requests.delete(f"{BASE_URL}/clients/{created_client_id}", headers=auth_headers, timeout=TIMEOUT)
            except Exception:
                pass

test_clients_api_crud_operations_validation()
