import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
TIMEOUT = 30
ADMIN_BEARER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtaXZxZThvcjAwMDJycGh2dmY3OWJ1ZGIiLCJlbWFpbCI6ImFkbWluQGJhcmJlYXJpYS10ZXN0ZS5jb20iLCJiYXJiZXJzaG9wSWQiOiJjbWl2cWU4NW8wMDAwcnBodjllbWJleTcyIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzY2NDY4OTUzLCJleHAiOjE3NjY0Njk4NTN9.rvzswH_JkIwzFZFO7iMAuFweVcrFJRYnZ4mt2s8AKsk"
HEADERS = {
    "Authorization": f"Bearer {ADMIN_BEARER_TOKEN}",
    "x-tenant-slug": TENANT_SLUG,
    "Content-Type": "application/json",
}


def test_barbershop_get_and_update_with_tenant_validation():
    # Step 1: GET current barbershop data with valid tenant slug
    get_response = requests.get(f"{BASE_URL}/api/barbershop", headers=HEADERS, timeout=TIMEOUT)
    assert get_response.status_code == 200, f"Expected 200 OK, got {get_response.status_code}"
    barbershop_data = get_response.json()
    assert "id" in barbershop_data, "Response JSON missing 'id'"
    assert barbershop_data.get("slug") == TENANT_SLUG, f"Expected slug '{TENANT_SLUG}', got '{barbershop_data.get('slug')}'"

    # Prepare updated data - toggle 'isActive' if available, else set to True
    current_is_active = barbershop_data.get("isActive", True)
    updated_name = barbershop_data.get("name", "Updated Barbershop Name") + " Updated"
    updated_is_active = not current_is_active

    update_payload = {
        "name": updated_name,
        "isActive": updated_is_active
    }

    # Step 2: PUT update barbershop data with valid tenant slug
    put_response = requests.put(f"{BASE_URL}/api/barbershop", headers=HEADERS, json=update_payload, timeout=TIMEOUT)
    assert put_response.status_code == 200, f"Expected 200 OK on update, got {put_response.status_code}"
    updated_data = put_response.json()
    assert updated_data.get("name") == updated_name, "Barbershop name was not updated correctly"
    assert updated_data.get("isActive") == updated_is_active, "Barbershop isActive was not updated correctly"

    # Step 3: GET barbershop data with missing tenant slug - expect 404
    headers_missing_tenant = HEADERS.copy()
    headers_missing_tenant.pop("x-tenant-slug")
    missing_tenant_response = requests.get(f"{BASE_URL}/api/barbershop", headers=headers_missing_tenant, timeout=TIMEOUT)
    assert missing_tenant_response.status_code == 404, f"Expected 404 with missing tenant slug, got {missing_tenant_response.status_code}"

    # Step 4: GET barbershop data with invalid tenant slug - expect 404
    headers_invalid_tenant = HEADERS.copy()
    headers_invalid_tenant["x-tenant-slug"] = "invalid-tenant-slug"
    invalid_tenant_response = requests.get(f"{BASE_URL}/api/barbershop", headers=headers_invalid_tenant, timeout=TIMEOUT)
    assert invalid_tenant_response.status_code == 404, f"Expected 404 with invalid tenant slug, got {invalid_tenant_response.status_code}"

    # Step 5: PUT update barbershop data with missing tenant slug - expect 404
    put_missing_tenant_response = requests.put(f"{BASE_URL}/api/barbershop", headers=headers_missing_tenant, json=update_payload, timeout=TIMEOUT)
    assert put_missing_tenant_response.status_code == 404, f"Expected 404 on update with missing tenant slug, got {put_missing_tenant_response.status_code}"

    # Step 6: PUT update barbershop data with invalid tenant slug - expect 404
    put_invalid_tenant_response = requests.put(f"{BASE_URL}/api/barbershop", headers=headers_invalid_tenant, json=update_payload, timeout=TIMEOUT)
    assert put_invalid_tenant_response.status_code == 404, f"Expected 404 on update with invalid tenant slug, got {put_invalid_tenant_response.status_code}"


test_barbershop_get_and_update_with_tenant_validation()