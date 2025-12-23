import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
ADMIN_EMAIL = "admin@barbearia-teste.com"
ADMIN_PASSWORD = "senha123"
TIMEOUT = 30

def test_professionals_api_crud_operations_validation():
    headers = {
        "x-tenant-slug": TENANT_SLUG,
        "Content-Type": "application/json"
    }
    session = requests.Session()
    session.headers.update(headers)

    # Authenticate as admin to get Bearer token
    auth_payload = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    response = session.post(f"{BASE_URL}/auth/login", json=auth_payload, timeout=TIMEOUT)
    assert response.status_code == 200, f"Login failed: {response.text}"
    json_resp = response.json()
    assert "accessToken" in json_resp and json_resp["accessToken"], "No accessToken in login response"
    token = json_resp["accessToken"]

    session.headers.update({"Authorization": f"Bearer {token}"})

    # Prepare Professional data for creation
    professional_data = {
        "name": "Test Professional CRUD",
        "email": "test.pro.crud@barbearia-teste.com",
        "phone": "1234567890",
        "role": "PROFESSIONAL"  # Assuming role field for professional exists
    }

    created_professional_id = None
    try:
        # CREATE professional
        create_resp = session.post(f"{BASE_URL}/professionals", json=professional_data, timeout=TIMEOUT)
        assert create_resp.status_code == 201, f"Professional creation failed: {create_resp.text}"
        created_professional = create_resp.json()
        created_professional_id = created_professional.get("id")
        assert created_professional_id, "Created professional ID missing"
        # Verify created details
        assert created_professional["name"] == professional_data["name"]
        assert created_professional["email"] == professional_data["email"]
        assert created_professional["phone"] == professional_data["phone"]
        # Assume new records areActive by default True
        assert created_professional.get("isActive", True) is True

        # READ professional by ID
        get_resp = session.get(f"{BASE_URL}/professionals/{created_professional_id}", timeout=TIMEOUT)
        assert get_resp.status_code == 200, f"Get professional failed: {get_resp.text}"
        got_professional = get_resp.json()
        assert got_professional["id"] == created_professional_id
        assert got_professional["name"] == professional_data["name"]

        # UPDATE professional - modify phone and name
        updated_data = {
            "name": "Updated Professional CRUD",
            "phone": "0987654321"
        }
        update_resp = session.put(f"{BASE_URL}/professionals/{created_professional_id}", json=updated_data, timeout=TIMEOUT)
        assert update_resp.status_code == 200, f"Update professional failed: {update_resp.text}"
        updated_professional = update_resp.json()
        assert updated_professional["name"] == updated_data["name"]
        assert updated_professional["phone"] == updated_data["phone"]

        # LIST professionals and verify created professional included (active only)
        list_resp = session.get(f"{BASE_URL}/professionals", timeout=TIMEOUT)
        assert list_resp.status_code == 200, f"List professionals failed: {list_resp.text}"
        professionals_list = list_resp.json()
        assert isinstance(professionals_list, list)
        found = any(p.get("id") == created_professional_id for p in professionals_list)
        assert found, "Created professional not found in active professionals list"

        # SOFT DELETE professional: set isActive to False
        soft_delete_data = {
            "isActive": False
        }
        soft_delete_resp = session.put(f"{BASE_URL}/professionals/{created_professional_id}", json=soft_delete_data, timeout=TIMEOUT)
        assert soft_delete_resp.status_code == 200, f"Soft delete failed: {soft_delete_resp.text}"
        soft_deleted_professional = soft_delete_resp.json()
        assert soft_deleted_professional.get("isActive") is False

        # Verify professional is filtered out in list after soft delete
        post_delete_list_resp = session.get(f"{BASE_URL}/professionals", timeout=TIMEOUT)
        assert post_delete_list_resp.status_code == 200, f"List after soft delete failed: {post_delete_list_resp.text}"
        post_delete_list = post_delete_list_resp.json()
        assert all(p.get("id") != created_professional_id for p in post_delete_list), "Soft deleted professional still found in list"

        # READ soft deleted professional by ID still accessible
        get_deleted_resp = session.get(f"{BASE_URL}/professionals/{created_professional_id}", timeout=TIMEOUT)
        assert get_deleted_resp.status_code == 200, f"Get soft deleted professional failed: {get_deleted_resp.text}"
        deleted_professional = get_deleted_resp.json()
        assert deleted_professional.get("isActive") is False

        # DELETE permanent: Assuming hard delete endpoint exists
        delete_resp = session.delete(f"{BASE_URL}/professionals/{created_professional_id}", timeout=TIMEOUT)
        assert delete_resp.status_code == 204, f"Permanent deletion failed: {delete_resp.text}"

        # Verify professional is not found after permanent delete
        get_after_delete_resp = session.get(f"{BASE_URL}/professionals/{created_professional_id}", timeout=TIMEOUT)
        assert get_after_delete_resp.status_code == 404, "Deleted professional still accessible after permanent deletion"

        created_professional_id = None  # Successfully deleted, no need to cleanup in finally

    finally:
        # Cleanup if professional still exists
        if created_professional_id:
            try:
                session.delete(f"{BASE_URL}/professionals/{created_professional_id}", timeout=TIMEOUT)
            except Exception:
                pass

test_professionals_api_crud_operations_validation()