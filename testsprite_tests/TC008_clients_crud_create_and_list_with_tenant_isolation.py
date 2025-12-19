import requests
import uuid
import time
from requests.exceptions import ReadTimeout, ConnectionError

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
LOGIN_EMAIL = "admin@barbearia-teste.com"
LOGIN_PASSWORD = "senha123"
TIMEOUT = 60
HEADERS_TENANT = {"x-tenant-slug": TENANT_SLUG}

def retry_request(func, retries=3, sleep_sec=1):
    for attempt in range(retries):
        try:
            return func()
        except (ReadTimeout, ConnectionError):
            if attempt == retries - 1:
                raise
            time.sleep(sleep_sec)

def test_clients_crud_create_and_list_with_tenant_isolation():
    login_url = f"{BASE_URL}/api/auth/login"
    login_payload = {"email": LOGIN_EMAIL, "password": LOGIN_PASSWORD}
    def do_login():
        return requests.post(login_url, json=login_payload, headers=HEADERS_TENANT, timeout=TIMEOUT)
    resp = retry_request(do_login)
    assert resp.status_code == 200, f"Login failed with status {resp.status_code}"
    data = resp.json()
    assert "accessToken" in data and isinstance(data["accessToken"], str)
    token = data["accessToken"]

    auth_headers = {
        **HEADERS_TENANT,
        "Authorization": f"Bearer {token}"
    }

    unique_phone = f"+5511{uuid.uuid4().hex[:10]}"  # Unique Brazilian-like phone number with country code

    client_create_url = f"{BASE_URL}/api/clients"
    client_payload = {
        "name": "Test Client TC008",
        "phone": unique_phone
    }

    def do_create_client():
        return requests.post(client_create_url, json=client_payload, headers=auth_headers, timeout=TIMEOUT)
    create_resp = retry_request(do_create_client)
    assert create_resp.status_code == 201, f"Client creation failed, status {create_resp.status_code}"
    created_client = create_resp.json()
    assert "id" in created_client and isinstance(created_client["id"], str)
    client_id = created_client["id"]

    try:
        def do_list_clients():
            return requests.get(client_create_url, headers=auth_headers, timeout=TIMEOUT)
        list_resp = retry_request(do_list_clients)
        assert list_resp.status_code == 200, f"Client list failed, status {list_resp.status_code}"
        list_data = list_resp.json()
        assert "data" in list_data and isinstance(list_data["data"], list)
        assert "pagination" in list_data and isinstance(list_data["pagination"], dict)
        # Verify that the created client is in the list
        client_ids = [client.get("id") for client in list_data["data"]]
        assert client_id in client_ids, "Created client not found in client list"
    finally:
        # Delete the created client to clean up
        client_delete_url = f"{BASE_URL}/api/clients/{client_id}"
        def do_delete_client():
            return requests.delete(client_delete_url, headers=auth_headers, timeout=TIMEOUT)
        delete_resp = retry_request(do_delete_client)
        assert delete_resp.status_code in (200, 204), f"Client deletion failed, status {delete_resp.status_code}"

test_clients_crud_create_and_list_with_tenant_isolation()