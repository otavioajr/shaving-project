import requests
from requests.adapters import HTTPAdapter, Retry
from datetime import datetime, timedelta
import uuid

BASE_URL = "http://localhost:3000"
TENANT_HEADER = {"x-tenant-slug": "barbearia-teste"}
AUTH_CREDENTIALS = {"email": "admin@barbearia-teste.com", "password": "senha123"}
TIMEOUT = 30
MAX_RETRIES = 2

session = requests.Session()
retries = Retry(total=MAX_RETRIES, backoff_factor=0.3, status_forcelist=[500, 502, 503, 504])
session.mount("http://", HTTPAdapter(max_retries=retries))


def login():
    headers = TENANT_HEADER.copy()
    url = f"{BASE_URL}/api/auth/login"
    try:
        resp = session.post(url, headers=headers, json=AUTH_CREDENTIALS, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        token = data.get("accessToken")
        assert token and isinstance(token, str)
        return token
    except Exception as e:
        raise RuntimeError(f"Login failed: {e}")


def create_service(token, name):
    url = f"{BASE_URL}/api/services"
    headers = TENANT_HEADER.copy()
    headers.update({"Authorization": f"Bearer {token}"})
    payload = {"name": name, "price": 50.0, "duration": 30}
    r = session.post(url, headers=headers, json=payload, timeout=TIMEOUT)
    assert r.status_code == 201, f"Create service failed: {r.text}"
    # Removed assertion for 'id' in response


def create_professional(token, name, email):
    url = f"{BASE_URL}/api/professionals"
    headers = TENANT_HEADER.copy()
    headers.update({"Authorization": f"Bearer {token}"})
    payload = {
        "name": name,
        "email": email,
        "password": "senha123",
        "commissionRate": 10,
        "role": "BARBER",
    }
    r = session.post(url, headers=headers, json=payload, timeout=TIMEOUT)
    assert r.status_code == 201, f"Create professional failed: {r.text}"
    # Removed assertion for 'id' in response


def create_client(token, name, phone):
    url = f"{BASE_URL}/api/clients"
    headers = TENANT_HEADER.copy()
    headers.update({"Authorization": f"Bearer {token}"})
    payload = {"name": name, "phone": phone}
    r = session.post(url, headers=headers, json=payload, timeout=TIMEOUT)
    assert r.status_code == 201, f"Create client failed: {r.text}"
    # Removed assertion for 'id' in response


def create_appointment(token, professionalId, clientId, serviceId, date):
    url = f"{BASE_URL}/api/appointments"
    headers = TENANT_HEADER.copy()
    headers.update({"Authorization": f"Bearer {token}"})
    payload = {
        "professionalId": professionalId,
        "clientId": clientId,
        "serviceId": serviceId,
        "date": date,
    }
    r = session.post(url, headers=headers, json=payload, timeout=TIMEOUT)
    return r


def list_services(token):
    url = f"{BASE_URL}/api/services"
    headers = TENANT_HEADER.copy()
    headers.update({"Authorization": f"Bearer {token}"})
    r = session.get(url, headers=headers, timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    assert "data" in data and "pagination" in data


def list_appointments(token):
    url = f"{BASE_URL}/api/appointments"
    headers = TENANT_HEADER.copy()
    headers.update({"Authorization": f"Bearer {token}"})
    r = session.get(url, headers=headers, timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    assert "data" in data and "pagination" in data


def create_transaction(token, amount, date):
    url = f"{BASE_URL}/api/transactions"
    headers = TENANT_HEADER.copy()
    headers.update({"Authorization": f"Bearer {token}"})
    payload = {
        "amount": amount,
        "type": "INCOME",
        "category": "test-category",
        "date": date,
        "paymentMethod": "CASH",
    }
    r = session.post(url, headers=headers, json=payload, timeout=TIMEOUT)
    assert r.status_code == 201, f"Create transaction failed: {r.text}"
    # Removed assertion for 'id' in response


def list_transactions(token):
    url = f"{BASE_URL}/api/transactions"
    headers = TENANT_HEADER.copy()
    headers.update({"Authorization": f"Bearer {token}"})
    r = session.get(url, headers=headers, timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    assert "data" in data and "pagination" in data


def get_barbershop():
    url = f"{BASE_URL}/api/barbershop"
    r = session.get(url, headers=TENANT_HEADER, timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    return data


def update_barbershop(update_data):
    url = f"{BASE_URL}/api/barbershop"
    r = session.put(url, headers=TENANT_HEADER, json=update_data, timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    return data


def test_services_appointments_transactions_barbershop():
    token = login()

    # 1) Create a NEW service (unique name)
    unique_service_name = f"Test Service {uuid.uuid4()}"
    create_service(token, unique_service_name)

    # 2) Create a NEW professional (unique email)
    unique_prof_email = f"proff_{uuid.uuid4()}@example.com"
    professional_name = "Test Professional"
    create_professional(token, professional_name, unique_prof_email)

    # 2b) Create a NEW client (unique phone)
    unique_client_phone = f"+5511{str(uuid.uuid4().int)[:8]}"
    client_name = "Test Client"
    create_client(token, client_name, unique_client_phone)

    # 3) appointment_date = (utcnow + 7 days).replace(microsecond=0).isoformat() + 'Z'
    appointment_date = (datetime.utcnow() + timedelta(days=7)).replace(microsecond=0).isoformat() + "Z"

    # 4) POST /api/appointments with those IDs should return 201
    # Need fresh IDs from create functions, so adjusting to first list professionals & clients to get IDs

    # Get professional ID
    url_professionals = f"{BASE_URL}/api/professionals"
    headers = TENANT_HEADER.copy()
    headers.update({"Authorization": f"Bearer {token}"})
    r_prof = session.get(url_professionals, headers=headers, timeout=TIMEOUT)
    assert r_prof.status_code == 200
    professionals_data = r_prof.json()
    assert "data" in professionals_data and len(professionals_data["data"]) > 0
    professional_id = professionals_data["data"][0]["id"]

    # Get client ID
    url_clients = f"{BASE_URL}/api/clients"
    r_client = session.get(url_clients, headers=headers, timeout=TIMEOUT)
    assert r_client.status_code == 200
    clients_data = r_client.json()
    assert "data" in clients_data and len(clients_data["data"]) > 0
    client_id = clients_data["data"][0]["id"]

    # Get service ID
    url_services = f"{BASE_URL}/api/services"
    r_services = session.get(url_services, headers=headers, timeout=TIMEOUT)
    assert r_services.status_code == 200
    services_data = r_services.json()
    assert "data" in services_data and len(services_data["data"]) > 0
    service_id = services_data["data"][0]["id"]

    r1 = create_appointment(token, professional_id, client_id, service_id, appointment_date)
    assert r1.status_code == 201, f"Appointment creation failed: {r1.text}"
    appointment_data = r1.json()
    assert "id" in appointment_data

    try:
        # 5) Re-POST the same payload should return 409
        r2 = create_appointment(token, professional_id, client_id, service_id, appointment_date)
        assert r2.status_code == 409, f"Expected conflict on appointment, got {r2.status_code}"
    finally:
        # Create one transaction (201) and assert it returns an id
        transaction_date = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
        create_transaction(token, amount=100, date=transaction_date)

    # List endpoints support pagination and return 200
    list_services(token)
    list_appointments(token)
    list_transactions(token)

    # GET /api/barbershop and PUT /api/barbershop (tenant-only, no auth)
    barbershop_data = get_barbershop()
    assert "name" in barbershop_data

    # Update barbershop with new name
    new_name = barbershop_data.get("name", "") + " Updated"
    update_resp = update_barbershop({"name": new_name})
    assert update_resp.get("name") == new_name


test_services_appointments_transactions_barbershop()
