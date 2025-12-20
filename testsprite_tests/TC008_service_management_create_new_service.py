import requests
import uuid

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

# Credentials and tenant info for authentication and scoping
TEST_TENANT_SLUG = "example-tenant"
TEST_EMAIL = "testuser@example.com"
TEST_PASSWORD = "TestPass123!"

def authenticate(email: str, password: str, tenant_slug: str):
    url = f"{BASE_URL}/api/auth/login"
    headers = {
        "x-tenant-slug": tenant_slug,
        "Content-Type": "application/json"
    }
    payload = {
        "email": email,
        "password": password
    }
    resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    # Must return accessToken for authorization and tenant scope validation
    return data.get("accessToken")

def delete_service(service_id: str, tenant_slug: str, token: str):
    url = f"{BASE_URL}/api/services/{service_id}"
    headers = {
        "x-tenant-slug": tenant_slug,
        "Authorization": f"Bearer {token}"
    }
    resp = requests.delete(url, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.status_code == 204

def test_TC008_service_management_create_new_service():
    # First authenticate to get valid access token
    token = authenticate(TEST_EMAIL, TEST_PASSWORD, TEST_TENANT_SLUG)
    assert token, "Failed to obtain access token for authentication"

    headers = {
        "x-tenant-slug": TEST_TENANT_SLUG,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Prepare new service data
    unique_service_name = f"Test Service {uuid.uuid4()}"
    new_service_payload = {
        "name": unique_service_name,
        "price": 2500,          # Assuming price in cents or smallest currency unit
        "duration": 45          # Duration in minutes
    }

    service_id = None
    try:
        # POST /api/services to create a new service
        url = f"{BASE_URL}/api/services"
        response = requests.post(url, json=new_service_payload, headers=headers, timeout=TIMEOUT)
        # Expect 201 Created on success
        assert response.status_code == 201, f"Unexpected status code: {response.status_code}, body: {response.text}"

        response_data = response.json()
        # Validate required fields in the response (id, name, price, duration)
        assert "id" in response_data, "Response missing 'id'"
        assert response_data.get("name") == unique_service_name, "Service name mismatch"
        assert response_data.get("price") == new_service_payload["price"], "Service price mismatch"
        assert response_data.get("duration") == new_service_payload["duration"], "Service duration mismatch"

        service_id = response_data["id"]

        # Optionally, validate tenant scoped data - try listing services and ensure the new one appears
        list_url = f"{BASE_URL}/api/services"
        list_response = requests.get(list_url, headers=headers, timeout=TIMEOUT)
        list_response.raise_for_status()
        services_list = list_response.json()
        assert any(s["id"] == service_id for s in services_list), "Created service not found in service list"

    finally:
        # Clean up by deleting the created service if it was created
        if service_id:
            try:
                delete_service(service_id, TEST_TENANT_SLUG, token)
            except Exception as e:
                print(f"Cleanup failed to delete service {service_id}: {e}")

test_TC008_service_management_create_new_service()
