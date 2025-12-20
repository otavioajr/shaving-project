import requests
import uuid

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "test-tenant"
TOKEN = "Bearer your_valid_access_token_here"  # Replace with a valid token if authentication needed


def test_create_new_client():
    url = f"{BASE_URL}/api/clients"
    headers = {
        "Content-Type": "application/json",
        "x-tenant-slug": TENANT_SLUG,
        "Authorization": TOKEN
    }

    client_data = {
        "name": f"Test Client {uuid.uuid4()}",
        "email": f"testclient{uuid.uuid4().hex[:8]}@example.com",
        "phone": "1234567890"
    }

    created_client_id = None
    try:
        response = requests.post(url, json=client_data, headers=headers, timeout=30)
        assert response.status_code == 201, f"Expected 201 Created, got {response.status_code}"
        json_resp = response.json()
        assert "id" in json_resp, "Response JSON missing 'id'"
        assert json_resp.get("name") == client_data["name"], "Client name mismatch in response"
        assert json_resp.get("email") == client_data["email"], "Client email mismatch in response"
        created_client_id = json_resp["id"]

        # Verify tenant association by fetching the client and checking headers and IDs
        get_headers = {
            "x-tenant-slug": TENANT_SLUG,
            "Authorization": TOKEN
        }
        get_url = f"{BASE_URL}/api/clients/{created_client_id}"
        get_response = requests.get(get_url, headers=get_headers, timeout=30)
        assert get_response.status_code == 200, f"Expected 200 OK on GET client, got {get_response.status_code}"
        client_info = get_response.json()
        assert client_info.get("id") == created_client_id, "Fetched client ID mismatch"
        # The tenant association is ensured by API restricting data via x-tenant-slug header,
        # so if client is fetched successfully with this header, association is validated.
    finally:
        if created_client_id:
            delete_url = f"{BASE_URL}/api/clients/{created_client_id}"
            try:
                requests.delete(delete_url, headers=headers, timeout=30)
            except Exception:
                pass


test_create_new_client()