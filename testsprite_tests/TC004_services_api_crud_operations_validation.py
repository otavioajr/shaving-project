import requests
import uuid

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
AUTH_EMAIL = "admin@barbearia-teste.com"
AUTH_PASSWORD = "senha123"
TIMEOUT = 30

def test_services_api_crud_operations_validation():
    headers = {
        "x-tenant-slug": TENANT_SLUG,
        "Content-Type": "application/json"
    }

    # Authenticate and get bearer token
    auth_resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": AUTH_EMAIL, "password": AUTH_PASSWORD},
        headers={"x-tenant-slug": TENANT_SLUG, "Content-Type": "application/json"},
        timeout=TIMEOUT
    )
    assert auth_resp.status_code == 200, f"Auth failed with status {auth_resp.status_code}"
    auth_data = auth_resp.json()
    assert "accessToken" in auth_data, "Missing accessToken in auth response"
    token = auth_data["accessToken"]

    auth_headers = {
        "x-tenant-slug": TENANT_SLUG,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    service_id = None

    # Create a new service
    create_payload = {
        "name": f"Service Test {uuid.uuid4().hex[:8]}",
        "description": "Test service description",
        "price": 50.0,
        "duration": 30  # Minutes, assuming API requires duration
    }
    create_resp = requests.post(f"{BASE_URL}/services", json=create_payload, headers=auth_headers, timeout=TIMEOUT)
    assert create_resp.status_code == 201, f"Service creation failed with status {create_resp.status_code}"
    created_service = create_resp.json()
    assert "id" in created_service, "Created service missing id"
    service_id = created_service["id"]
    for key in ["name", "description", "price", "duration"]:
        assert created_service[key] == create_payload[key], f"Mismatch in created service field {key}"

    try:
        # Retrieve the created service
        get_resp = requests.get(f"{BASE_URL}/services/{service_id}", headers=auth_headers, timeout=TIMEOUT)
        assert get_resp.status_code == 200, f"Get service failed with status {get_resp.status_code}"
        get_service = get_resp.json()
        assert get_service["id"] == service_id
        assert get_service["name"] == create_payload["name"]

        # Update the service
        update_payload = {
            "name": create_payload["name"] + " Updated",
            "price": 75.0,
            "description": "Updated description",
            "duration": 45
        }
        update_resp = requests.put(f"{BASE_URL}/services/{service_id}", json=update_payload, headers=auth_headers, timeout=TIMEOUT)
        assert update_resp.status_code == 200, f"Update service failed with status {update_resp.status_code}"
        updated_service = update_resp.json()
        assert updated_service["name"] == update_payload["name"]
        assert updated_service["price"] == update_payload["price"]
        assert updated_service["description"] == update_payload["description"]
        assert updated_service["duration"] == update_payload["duration"]

        # List services and verify updated service is present
        list_resp = requests.get(f"{BASE_URL}/services", headers=auth_headers, timeout=TIMEOUT)
        assert list_resp.status_code == 200, f"List services failed with status {list_resp.status_code}"
        services_list = list_resp.json()
        assert isinstance(services_list, list), "Services list response is not a list"
        found = any(s["id"] == service_id for s in services_list)
        assert found, "Updated service not found in services list"

        # Soft delete the service by setting isActive = False
        soft_delete_payload = { "isActive": False }
        soft_del_resp = requests.patch(f"{BASE_URL}/services/{service_id}", json=soft_delete_payload, headers=auth_headers, timeout=TIMEOUT)
        assert soft_del_resp.status_code == 200, f"Soft delete service failed with status {soft_del_resp.status_code}"
        soft_deleted_service = soft_del_resp.json()
        assert soft_deleted_service.get("isActive") is False, "Service isActive flag not set to False"

        # Confirm the soft deleted service is filtered out from list
        list_after_del_resp = requests.get(f"{BASE_URL}/services", headers=auth_headers, timeout=TIMEOUT)
        assert list_after_del_resp.status_code == 200, f"List services after soft delete failed with status {list_after_del_resp.status_code}"
        services_after_delete = list_after_del_resp.json()
        assert all(s.get("isActive", True) is not False for s in services_after_delete), "Soft deleted service found in services list"

        found_after_delete = any(s["id"] == service_id for s in services_after_delete)
        assert not found_after_delete, "Soft deleted service still present in services list"

    finally:
        # Cleanup: Hard delete the service
        if service_id is not None:
            del_resp = requests.delete(f"{BASE_URL}/services/{service_id}", headers=auth_headers, timeout=TIMEOUT)
            # Deleting might return 204 or 200 depending on API implementation
            assert del_resp.status_code in (200, 204), f"Hard delete service failed with status {del_resp.status_code}"

test_services_api_crud_operations_validation()