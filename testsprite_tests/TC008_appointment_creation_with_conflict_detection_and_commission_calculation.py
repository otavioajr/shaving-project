import datetime
import uuid
import requests

BASE_URL = "http://localhost:3000"
TENANT_HEADER = {"x-tenant-slug": "barbearia-teste", "Content-Type": "application/json"}
ADMIN_EMAIL = "admin@barbearia-teste.com"
ADMIN_PASSWORD = "senha123"


def login() -> str:
    resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        headers=TENANT_HEADER,
        timeout=30,
    )
    resp.raise_for_status()
    token = resp.json().get("accessToken")
    assert token, "Login did not return access token"
    return token


def auth_headers(token: str):
    return {**TENANT_HEADER, "Authorization": f"Bearer {token}"}


def create_professional(token: str, commission_rate: int):
    payload = {
        "name": f"Prof {uuid.uuid4().hex[:6]}",
        "email": f"prof-{uuid.uuid4().hex[:6]}@barbearia-teste.com",
        "password": "Test@123456",
        "commissionRate": commission_rate,
        "role": "BARBER",
    }
    resp = requests.post(f"{BASE_URL}/api/professionals", headers=auth_headers(token), json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return data.get("id")


def create_client(token: str):
    payload = {
        "name": f"Client {uuid.uuid4().hex[:6]}",
        "phone": f"+5511{uuid.uuid4().int % 10**8:08d}",
    }
    resp = requests.post(f"{BASE_URL}/api/clients", headers=auth_headers(token), json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json().get("id")


def create_service(token: str, price: float, duration: int):
    payload = {
        "name": f"Service {uuid.uuid4().hex[:6]}",
        "price": price,
        "duration": duration,
    }
    resp = requests.post(f"{BASE_URL}/api/services", headers=auth_headers(token), json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json().get("id"), payload


def create_appointment(token: str, professional_id: str, client_id: str, service_id: str, date_iso: str):
    payload = {
        "professionalId": professional_id,
        "clientId": client_id,
        "serviceId": service_id,
        "date": date_iso,
    }
    resp = requests.post(f"{BASE_URL}/api/appointments", headers=auth_headers(token), json=payload, timeout=30)
    return resp


def update_status(token: str, appointment_id: str, status: str):
    resp = requests.patch(
        f"{BASE_URL}/api/appointments/{appointment_id}/status",
        headers=auth_headers(token),
        json={"status": status},
        timeout=30,
    )
    return resp


def delete_resource(token: str, resource: str, resource_id: str):
    requests.delete(f"{BASE_URL}/api/{resource}/{resource_id}", headers=auth_headers(token), timeout=30)


def appointment_creation_with_conflict_detection_and_commission_calculation():
    token = login()

    professional_id = client_id = service_id = appointment_id = None
    service_price = 120.0
    commission_rate = 40  # percent

    try:
        professional_id = create_professional(token, commission_rate)
        client_id = create_client(token)
        service_id, service_payload = create_service(token, service_price, 45)

        # Create first appointment
        start_time = (datetime.datetime.utcnow() + datetime.timedelta(minutes=10)).replace(microsecond=0)
        date_iso = start_time.isoformat() + "Z"
        resp = create_appointment(token, professional_id, client_id, service_id, date_iso)
        resp.raise_for_status()
        assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
        appointment = resp.json()
        appointment_id = appointment.get("id")
        assert appointment_id

        # Conflict: same slot/professional
        resp_conflict = create_appointment(token, professional_id, client_id, service_id, date_iso)
        assert resp_conflict.status_code == 409, f"Expected conflict 409, got {resp_conflict.status_code}"

        # Complete appointment and validate commission
        resp_status = update_status(token, appointment_id, "COMPLETED")
        resp_status.raise_for_status()
        completed = resp_status.json()
        commission_value = completed.get("commissionValue")
        expected_commission = service_price * (commission_rate / 100)
        assert commission_value is not None, "commissionValue missing"
        assert abs(float(commission_value) - expected_commission) < 0.01, "Incorrect commission calculation"

    finally:
        if appointment_id:
            delete_resource(token, "appointments", appointment_id)
        if service_id:
            delete_resource(token, "services", service_id)
        if client_id:
            delete_resource(token, "clients", client_id)
        if professional_id:
            delete_resource(token, "professionals", professional_id)


appointment_creation_with_conflict_detection_and_commission_calculation()
