import requests
import uuid

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "test-barbershop"
LOGIN_EMAIL = "admin@example.com"
LOGIN_PASSWORD = "adminPass123"
HEADERS = {
    "x-tenant-slug": TENANT_SLUG,
    "Content-Type": "application/json"
}
TIMEOUT = 30


def login_get_token():
    url = f"{BASE_URL}/api/auth/login"
    payload = {"email": LOGIN_EMAIL, "password": LOGIN_PASSWORD}
    try:
        resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        return data["accessToken"]
    except Exception as e:
        raise RuntimeError(f"Login failed: {str(e)}")


def test_create_new_professional():
    access_token = login_get_token()
    auth_headers = {
        **HEADERS,
        "Authorization": f"Bearer {access_token}"
    }

    # Prepare professional data with a unique email to avoid conflicts
    unique_email = f"pro_{uuid.uuid4().hex[:8]}@example.com"
    professional_data = {
        "name": "Test Professional",
        "email": unique_email,
        "password": "StrongPass9!",
        "commissionRate": 12.5,
        "role": "BARBER"
    }

    created_professional_id = None
    try:
        create_url = f"{BASE_URL}/api/professionals"
        response = requests.post(create_url, json=professional_data, headers=auth_headers, timeout=TIMEOUT)
        response.raise_for_status()
        resp_data = response.json()

        # Validate response content - must contain created professional info including at least an id
        assert isinstance(resp_data, dict), "Response is not a JSON object"
        # The actual API response schema is not fully defined but commonly contains id and other data
        # We assume it returns the created professional object including an 'id' field
        assert "id" in resp_data or "professional" in resp_data, "Response missing professional id"

        if "id" in resp_data:
            created_professional_id = resp_data["id"]
        elif "professional" in resp_data and "id" in resp_data["professional"]:
            created_professional_id = resp_data["professional"]["id"]
        else:
            raise AssertionError("Created professional ID not found in response")

        # Check the returned values match (partially) the sent data
        # Only checking name, email, commissionRate, and role fields if present
        if "name" in resp_data:
            assert resp_data["name"] == professional_data["name"]
        elif "professional" in resp_data and "name" in resp_data["professional"]:
            assert resp_data["professional"]["name"] == professional_data["name"]
        if "email" in resp_data:
            assert resp_data["email"] == professional_data["email"]
        elif "professional" in resp_data and "email" in resp_data["professional"]:
            assert resp_data["professional"]["email"] == professional_data["email"]
        if "commissionRate" in resp_data:
            assert abs(resp_data["commissionRate"] - professional_data["commissionRate"]) < 0.0001
        elif "professional" in resp_data and "commissionRate" in resp_data["professional"]:
            assert abs(resp_data["professional"]["commissionRate"] - professional_data["commissionRate"]) < 0.0001
        if "role" in resp_data:
            assert resp_data["role"] == professional_data["role"]
        elif "professional" in resp_data and "role" in resp_data["professional"]:
            assert resp_data["professional"]["role"] == professional_data["role"]

    except requests.HTTPError as http_err:
        # If unauthorized, check for 401 or 403. Otherwise fail.
        if response is not None and response.status_code in (401, 403):
            raise AssertionError(f"Unauthorized to create professional: {response.status_code} {response.text}")
        raise
    except Exception as e:
        raise e
    finally:
        # Cleanup created professional if successful
        if created_professional_id:
            try:
                delete_url = f"{BASE_URL}/api/professionals/{created_professional_id}"
                del_resp = requests.delete(delete_url, headers=auth_headers, timeout=TIMEOUT)
                # Accept 200 or 204 as successful deletion
                if del_resp.status_code not in (200, 204):
                    raise RuntimeError(f"Failed to delete professional with id {created_professional_id}, status: {del_resp.status_code}")
            except Exception as cleanup_exc:
                # Log cleanup failures but do not raise to avoid masking original test results
                print(f"Cleanup failed: {cleanup_exc}")


test_create_new_professional()