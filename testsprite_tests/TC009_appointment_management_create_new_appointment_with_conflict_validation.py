import requests
import uuid
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "test-tenant"
EMAIL = "testuser@example.com"
PASSWORD = "TestPass123!"
HEADERS = {"x-tenant-slug": TENANT_SLUG, "Content-Type": "application/json"}
TIMEOUT = 30

def authenticate_and_get_token():
    # Login with existing test professional
    login_data = {
        "email": EMAIL,
        "password": PASSWORD
    }
    r_login = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=login_data,
        headers=HEADERS,
        timeout=TIMEOUT,
    )
    r_login.raise_for_status()
    tokens = r_login.json()
    access_token = tokens.get("accessToken")
    refresh_token = tokens.get("refreshToken")
    professional = tokens.get("professional")
    assert access_token is not None
    assert refresh_token is not None
    assert professional is not None
    professional_id = professional.get("id")
    assert professional_id is not None
    return access_token, professional_id

def create_client(access_token):
    client_email = f"client_{uuid.uuid4().hex[:8]}@example.com"
    client_data = {
        "name": "Test Client",
        "email": client_email,
        "phone": "+1234567890"
    }
    headers = {
        **HEADERS,
        "Authorization": f"Bearer {access_token}"
    }
    r = requests.post(
        f"{BASE_URL}/api/clients",
        json=client_data,
        headers=headers,
        timeout=TIMEOUT
    )
    r.raise_for_status()
    client = r.json()
    client_id = client.get("id")
    assert client_id is not None
    return client_id

def create_service(access_token):
    service_data = {
        "name": "Test Haircut",
        "price": 25.0,
        "duration": 30
    }
    headers = {
        **HEADERS,
        "Authorization": f"Bearer {access_token}"
    }
    r = requests.post(
        f"{BASE_URL}/api/services",
        json=service_data,
        headers=headers,
        timeout=TIMEOUT
    )
    r.raise_for_status()
    service = r.json()
    service_id = service.get("id")
    assert service_id is not None
    return service_id

def test_appointment_creation_with_conflict_validation():
    access_token, professional_id = authenticate_and_get_token()
    headers = {
        **HEADERS,
        "Authorization": f"Bearer {access_token}"
    }
    try:
        client_id = create_client(access_token)
        service_id = create_service(access_token)

        appointment_date = datetime.utcnow() + timedelta(days=1)
        start_time = appointment_date.replace(hour=10, minute=0, second=0, microsecond=0)
        end_time = start_time + timedelta(minutes=30)

        appt_payload = {
            "professionalId": professional_id,
            "clientId": client_id,
            "serviceId": service_id,
            "startTime": start_time.isoformat() + "Z",
            "endTime": end_time.isoformat() + "Z",
            "status": "SCHEDULED",
            "notes": "Initial appointment"
        }

        r1 = requests.post(f"{BASE_URL}/api/appointments",
                           json=appt_payload,
                           headers=headers,
                           timeout=TIMEOUT)
        r1.raise_for_status()
        appointment1 = r1.json()
        appointment1_id = appointment1.get("id")
        assert appointment1_id is not None

        r2 = requests.post(f"{BASE_URL}/api/appointments",
                           json=appt_payload,
                           headers=headers,
                           timeout=TIMEOUT)

        assert r2.status_code >= 400
        resp_json = r2.json()
        error_message = resp_json.get("message", "").lower()
        conflict_indicators = ["conflict", "already booked", "unavailable", "scheduling conflict"]
        assert any(indicator in error_message for indicator in conflict_indicators)

    finally:
        if 'appointment1_id' in locals():
            requests.delete(
                f"{BASE_URL}/api/appointments/{appointment1_id}",
                headers=headers,
                timeout=TIMEOUT
            )
        if 'client_id' in locals():
            requests.delete(
                f"{BASE_URL}/api/clients/{client_id}",
                headers=headers,
                timeout=TIMEOUT
            )
        if 'service_id' in locals():
            requests.delete(
                f"{BASE_URL}/api/services/{service_id}",
                headers=headers,
                timeout=TIMEOUT
            )

test_appointment_creation_with_conflict_validation()
