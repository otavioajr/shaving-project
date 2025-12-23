import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "cmivqe85o000rphv9embey72"
JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtaXZxZThvcjAwMDJycGh2dmY3OWJ1ZGIiLCJlbWFpbCI6ImFkbWluQGJhcmJlYXJpYS10ZXN0ZS5jb20iLCJiYXJiZXJzaG9wSWQiOiJjbWl2cWU4NW8wMDAwcnBodjllbWJleTcyIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzY2NDYzMTc5LCJleHAiOjE3NjY0NjQwNzl9.cq5AhFg2zCo1d9tIqI8Sdh__qQo95mJZ2V3vct0-_Aw"
HEADERS_AUTH = {
    "Authorization": f"Bearer {JWT_TOKEN}",
    "x-tenant-slug": TENANT_SLUG,
    "Accept": "application/json"
}
HEADERS_NO_AUTH = {
    "x-tenant-slug": TENANT_SLUG,
    "Accept": "application/json"
}

def test_professionals_api_list_endpoint():
    # 1. Test valid JWT + tenant slug returns paginated list
    params = {"page": 1, "limit": 10}
    try:
        response = requests.get(
            f"{BASE_URL}/api/professionals",
            headers=HEADERS_AUTH,
            params=params,
            timeout=30
        )
    except requests.RequestException as e:
        assert False, f"Request exception occurred: {e}"

    # Expect 200 OK with paginated list (JSON)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    try:
        json_data = response.json()
    except Exception as e:
        assert False, f"Response is not valid JSON: {e}"
    # Basic validations: Must contain items (list) or at least keys indicating pagination
    assert isinstance(json_data, dict), "Response JSON is not an object"
    # Pagination response may include keys like: items, page, total, limit
    # We check at least presence of typical pagination metadata or list
    assert (
        "items" in json_data or "data" in json_data or "professionals" in json_data or isinstance(json_data.get("items", None), list) or isinstance(json_data, list)
    ), "Response does not contain a list of professionals"
    # If items present, check it's a list
    if "items" in json_data:
        assert isinstance(json_data["items"], list), "'items' is not a list"
    if "page" in json_data:
        assert isinstance(json_data["page"], int), "'page' in response is not int"
    if "limit" in json_data:
        assert isinstance(json_data["limit"], int), "'limit' in response is not int"

    # 2. Test no Authorization header -> 401 Unauthorized
    try:
        response_unauth = requests.get(
            f"{BASE_URL}/api/professionals",
            headers=HEADERS_NO_AUTH,
            params=params,
            timeout=30
        )
    except requests.RequestException as e:
        assert False, f"Request exception occurred: {e}"
    assert response_unauth.status_code == 401, f"Expected 401 for no auth, got {response_unauth.status_code}"

    # 3. Test with Authorization header but no tenant slug -> should be 404 (tenant slug required)
    headers_auth_no_tenant = {
        "Authorization": f"Bearer {JWT_TOKEN}",
        "Accept": "application/json"
    }
    try:
        response_no_tenant = requests.get(
            f"{BASE_URL}/api/professionals",
            headers=headers_auth_no_tenant,
            params=params,
            timeout=30
        )
    except requests.RequestException as e:
        assert False, f"Request exception occurred: {e}"
    assert response_no_tenant.status_code == 404, f"Expected 404 for missing tenant slug, got {response_no_tenant.status_code}"

    # 4. Test with invalid or insufficient role token (simulate forbidden 403)
    # Using invalid token or altered to simulate 403 - but we only have one token authorized as ADMIN
    # Instead, test with altered token (simulate forbidden)
    headers_auth_forbidden = {
        "Authorization": "Bearer invalid_or_forbidden_token",
        "x-tenant-slug": TENANT_SLUG,
        "Accept": "application/json"
    }
    try:
        response_forbidden = requests.get(
            f"{BASE_URL}/api/professionals",
            headers=headers_auth_forbidden,
            params=params,
            timeout=30
        )
    except requests.RequestException as e:
        assert False, f"Request exception occurred: {e}"
    # Accept 401 or 403 as per description
    assert response_forbidden.status_code in (401, 403), f"Expected 401 or 403 for invalid token, got {response_forbidden.status_code}"


test_professionals_api_list_endpoint()