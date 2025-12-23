import requests
import datetime
import time

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
ADMIN_EMAIL = "admin@barbearia.com"
ADMIN_PASSWORD = "senha123"
TIMEOUT = 30

headers = {
    "x-tenant-slug": TENANT_SLUG,
    "Content-Type": "application/json"
}


def login(email, password):
    url = f"{BASE_URL}/api/auth/login"
    payload = {"email": email, "password": password}
    resp = requests.post(url, json=payload, headers={"x-tenant-slug": TENANT_SLUG, "Content-Type": "application/json"}, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()["accessToken"]


def get_first_professional(access_token):
    url = f"{BASE_URL}/api/professionals?page=1&limit=1"
    hdr = headers.copy()
    hdr["Authorization"] = f"Bearer {access_token}"
    resp = requests.get(url, headers=hdr, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    if data.get("data") and len(data["data"]) > 0:
        return data["data"][0]["id"]
    return None


def create_client(access_token, name, phone):
    url = f"{BASE_URL}/api/clients"
    hdr = headers.copy()
    hdr["Authorization"] = f"Bearer {access_token}"
    payload = {
        "name": name,
        "phone": phone
    }
    resp = requests.post(url, headers=hdr, json=payload, timeout=TIMEOUT)
    resp.raise_for_status()
    # Retrieve clientId from Location header or GET clients filtered by phone
    location = resp.headers.get("Location")
    if location:
        client_id = location.rstrip("/").split("/")[-1]
        return client_id
    # fallback - list clients and find by phone
    url_clients = f"{BASE_URL}/api/clients?page=1&limit=10"
    r = requests.get(url_clients, headers=hdr, timeout=TIMEOUT)
    r.raise_for_status()
    clients = r.json().get("data", [])
    for client in clients:
        if client.get("phone") == phone:
            return client.get("id")
    return None


def get_first_service(access_token):
    url = f"{BASE_URL}/api/services?page=1&limit=1"
    hdr = headers.copy()
    hdr["Authorization"] = f"Bearer {access_token}"
    resp = requests.get(url, headers=hdr, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    if data.get("data") and len(data["data"]) > 0:
        return data["data"][0]["id"], data["data"][0].get("duration", 30)
    return None, None


def create_appointment(access_token, professional_id, client_id, service_id, date, notes=None):
    url = f"{BASE_URL}/api/appointments"
    hdr = headers.copy()
    hdr["Authorization"] = f"Bearer {access_token}"
    payload = {
        "professionalId": professional_id,
        "clientId": client_id,
        "serviceId": service_id,
        "date": date.isoformat(),
    }
    if notes:
        payload["notes"] = notes
    resp = requests.post(url, headers=hdr, json=payload, timeout=TIMEOUT)
    return resp


def delete_appointment(access_token, appointment_id):
    url = f"{BASE_URL}/api/appointments/{appointment_id}"
    hdr = headers.copy()
    hdr["Authorization"] = f"Bearer {access_token}"
    resp = requests.delete(url, headers=hdr, timeout=TIMEOUT)
    return resp


def test_appointment_creation_with_conflict_detection():
    # Login as ADMIN to have full permissions
    access_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    # Setup: get professional, service, create client
    professional_id = get_first_professional(access_token)
    assert professional_id is not None, "No professional found to create appointment"

    service_id, duration_mins = get_first_service(access_token)
    assert service_id is not None, "No service found to create appointment"
    if duration_mins is None or duration_mins <= 0:
        duration_mins = 30  # fallback duration

    # Create a client to book appointment for
    now = datetime.datetime.utcnow()
    unique_phone = f"999999{int(time.time()) % 10000:04}"
    client_name = "Test Client"
    client_id = create_client(access_token, client_name, unique_phone)
    assert client_id is not None, "Failed to create client"

    # Choose a base appointment date/time (round minutes to 15m increments)
    base_dt = now.replace(second=0, microsecond=0, minute=(now.minute // 15) * 15) + datetime.timedelta(minutes=30)

    created_appointment_id = None

    try:
        # 1) Create an appointment successfully
        response1 = create_appointment(access_token, professional_id, client_id, service_id, base_dt, notes="Test appointment creation")
        assert response1.status_code == 201, f"Expected 201 Created, got {response1.status_code}"
        appointment1 = response1.json()
        created_appointment_id = appointment1.get("id")
        assert created_appointment_id is not None, "Appointment created but no ID returned"

        # 2) Attempt to create conflicting appointment with overlapping time (should fail with 409)
        # Overlap by starting appointment 15 minutes into the previously booked appointment
        overlap_dt = base_dt + datetime.timedelta(minutes=15)
        response2 = create_appointment(access_token, professional_id, client_id, service_id, overlap_dt, notes="Test conflicting appointment")
        assert response2.status_code == 409, f"Expected 409 Conflict for overlapping appointment, got {response2.status_code}"

        # 3) Create a cancelled appointment to confirm conflicts exclude cancelled
        # We'll create another appointment, then cancel it, then try to create one at that time
        cancel_dt = base_dt + datetime.timedelta(hours=2)
        response3 = create_appointment(access_token, professional_id, client_id, service_id, cancel_dt, notes="Appointment to be cancelled")
        assert response3.status_code == 201, f"Expected 201 for appointment to cancel, got {response3.status_code}"
        appointment_to_cancel = response3.json()
        appointment_to_cancel_id = appointment_to_cancel.get("id")
        assert appointment_to_cancel_id is not None, "Appointment to cancel has no ID"

        # Cancel that appointment
        url_status = f"{BASE_URL}/api/appointments/{appointment_to_cancel_id}/status"
        hdr = headers.copy()
        hdr["Authorization"] = f"Bearer {access_token}"
        cancel_payload = {"status": "CANCELLED"}
        resp_cancel = requests.patch(url_status, json=cancel_payload, headers=hdr, timeout=TIMEOUT)
        assert resp_cancel.status_code == 200, f"Expected 200 OK for cancelling appointment, got {resp_cancel.status_code}"

        # Now create appointment at the cancelled appointment's time - should succeed (no conflict)
        response4 = create_appointment(access_token, professional_id, client_id, service_id, cancel_dt, notes="New at cancelled slot")
        assert response4.status_code == 201, f"Expected 201 Created for new appointment after cancelling conflict, got {response4.status_code}"
        appointment4 = response4.json()
        assert appointment4.get("id") is not None

        # Cleanup appointments created in this test
        delete_appointment(access_token, appointment4.get("id"))

        # delete cancelled appointment as well
        delete_appointment(access_token, appointment_to_cancel_id)

    finally:
        if created_appointment_id:
            delete_appointment(access_token, created_appointment_id)


test_appointment_creation_with_conflict_detection()