import requests
import datetime
import uuid

BASE_URL = "http://localhost:3000"
AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtaXZxZThvcjAwMDJycGh2dmY3OWJ1ZGIiLCJlbWFpbCI6ImFkbWluQGJhcmJlYXJpYS10ZXN0ZS5jb20iLCJiYXJiZXJzaG9wSWQiOiJjbWl2cWU4NW8wMDAwcnBodjllbWJleTcyIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzY2NDYzMTc5LCJleHAiOjE3NjY0NjQwNzl9.cq5AhFg2zCo1d9tIqI8Sdh__qQo95mJZ2V3vct0-_Aw"
TENANT_SLUG = "cmivqe85o000rphv9embey72"  # From JWT and context

HEADERS_AUTH = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "x-tenant-slug": TENANT_SLUG,
    "Content-Type": "application/json"
}

HEADERS_NO_AUTH = {
    "x-tenant-slug": TENANT_SLUG,
    "Content-Type": "application/json"
}


def test_appointments_api_create_endpoint():
    # Setup needed: create professional and client to reference for appointment creation
    # Create Professional
    professional_payload = {
        "name": f"Test Barber {uuid.uuid4().hex[:6]}",
        "email": f"testbarber{uuid.uuid4().hex[:6]}@example.com",
        "password": "strongpassword",
        "commissionRate": 10,
        "role": "BARBER"
    }
    pro_id = None
    client_id = None
    created_appointment_ids = []

    # Create Client
    client_payload = {
        "name": f"Test Client {uuid.uuid4().hex[:6]}",
        "email": f"testclient{uuid.uuid4().hex[:6]}@example.com",
        "phone": "1234567890"
    }

    try:
        # Create professional
        pro_resp = requests.post(
            f"{BASE_URL}/api/professionals",
            headers=HEADERS_AUTH,
            json=professional_payload,
            timeout=30
        )
        assert pro_resp.status_code == 201, f"Failed to create professional: {pro_resp.text}"
        pro_id = pro_resp.json().get("id")
        assert pro_id is not None, "Professional ID missing in response"

        # Create client
        client_resp = requests.post(
            f"{BASE_URL}/api/clients",
            headers=HEADERS_AUTH,
            json=client_payload,
            timeout=30
        )
        assert client_resp.status_code == 201, f"Failed to create client: {client_resp.text}"
        client_id = client_resp.json().get("id")
        assert client_id is not None, "Client ID missing in response"

        # Prepare a valid appointment datetime in future
        start_time = (datetime.datetime.utcnow() + datetime.timedelta(days=1, hours=1)).replace(minute=0, second=0, microsecond=0)
        end_time = start_time + datetime.timedelta(minutes=30)

        appointment_payload = {
            "professionalId": pro_id,
            "clientId": client_id,
            "start": start_time.isoformat() + "Z",
            "end": end_time.isoformat() + "Z",
            "services": [],  # Optional - assuming empty list allowed
            "notes": "Test appointment creation"
        }

        # 1) Successful creation with valid JWT and tenant slug
        resp = requests.post(
            f"{BASE_URL}/api/appointments",
            headers=HEADERS_AUTH,
            json=appointment_payload,
            timeout=30
        )
        assert resp.status_code == 201, f"Expected 201 Created, got {resp.status_code}, body: {resp.text}"
        appointment = resp.json()
        appointment_id = appointment.get("id")
        assert appointment_id is not None, "Created appointment ID missing"
        created_appointment_ids.append(appointment_id)

        # 2) Conflict in scheduling, try creating another appointment overlapping same time and professional
        conflict_payload = appointment_payload.copy()
        conflict_payload["notes"] = "Conflict appointment test"
        conflict_resp = requests.post(
            f"{BASE_URL}/api/appointments",
            headers=HEADERS_AUTH,
            json=conflict_payload,
            timeout=30
        )
        assert conflict_resp.status_code == 409, f"Expected 409 Conflict on scheduling, got {conflict_resp.status_code}"

        # 3) Unauthorized - no JWT token provided
        headers_no_auth = {
            "x-tenant-slug": TENANT_SLUG,
            "Content-Type": "application/json"
        }
        unauthorized_resp = requests.post(
            f"{BASE_URL}/api/appointments",
            headers=headers_no_auth,
            json=appointment_payload,
            timeout=30
        )
        assert unauthorized_resp.status_code == 401, f"Expected 401 Unauthorized when no auth token, got {unauthorized_resp.status_code}"

        # 4) Unauthorized - missing tenant slug returns 401 (per description)
        headers_missing_tenant = {
            "Authorization": f"Bearer {AUTH_TOKEN}",
            "Content-Type": "application/json"
        }
        missing_tenant_resp = requests.post(
            f"{BASE_URL}/api/appointments",
            headers=headers_missing_tenant,
            json=appointment_payload,
            timeout=30
        )
        assert missing_tenant_resp.status_code == 401, f"Expected 401 Unauthorized when missing tenant slug, got {missing_tenant_resp.status_code}"

    finally:
        # Cleanup created appointments
        for appt_id in created_appointment_ids:
            try:
                del_resp = requests.delete(
                    f"{BASE_URL}/api/appointments/{appt_id}",
                    headers=HEADERS_AUTH,
                    timeout=30
                )
                assert del_resp.status_code == 204, f"Failed to delete appointment {appt_id}: {del_resp.text}"
            except Exception:
                pass

        # Cleanup client
        if client_id:
            try:
                del_client_resp = requests.delete(
                    f"{BASE_URL}/api/clients/{client_id}",
                    headers=HEADERS_AUTH,
                    timeout=30
                )
                assert del_client_resp.status_code == 204, f"Failed to delete client {client_id}: {del_client_resp.text}"
            except Exception:
                pass

        # Cleanup professional
        if pro_id:
            try:
                del_pro_resp = requests.delete(
                    f"{BASE_URL}/api/professionals/{pro_id}",
                    headers=HEADERS_AUTH,
                    timeout=30
                )
                assert del_pro_resp.status_code == 204, f"Failed to delete professional {pro_id}: {del_pro_resp.text}"
            except Exception:
                pass


test_appointments_api_create_endpoint()