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
        headers=TENANT_HEADER,
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    resp.raise_for_status()
    token = resp.json().get("accessToken")
    assert token, "Login failed"
    return token


def auth_headers(token: str):
    return {**TENANT_HEADER, "Authorization": f"Bearer {token}"}


def create_transaction(token: str, payload: dict):
    resp = requests.post(
        f"{BASE_URL}/api/transactions",
        headers=auth_headers(token),
        json=payload,
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("id")


def delete_transaction(token: str, transaction_id: str):
    requests.delete(
        f"{BASE_URL}/api/transactions/{transaction_id}",
        headers=auth_headers(token),
        timeout=30,
    )


def get_transactions(token: str, params: dict):
    resp = requests.get(
        f"{BASE_URL}/api/transactions",
        headers=auth_headers(token),
        params=params,
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    assert "data" in data and "pagination" in data, "Expected paginated response"
    return data


def test_transaction_listing_with_filtering_and_pagination():
    token = login()

    # Create transactions in a known window
    now = datetime.datetime.utcnow()
    start_date = (now - datetime.timedelta(days=1)).isoformat() + "Z"
    end_date = (now + datetime.timedelta(days=1)).isoformat() + "Z"

    tx_ids = []
    try:
        income_id = create_transaction(
            token,
            {
                "amount": 150.0,
                "type": "INCOME",
                "category": "HAIRCUT",
                "description": f"Income {uuid.uuid4().hex[:6]}",
                "date": now.isoformat() + "Z",
                "paymentMethod": "CASH",
            },
        )
        tx_ids.append(income_id)

        expense_id = create_transaction(
            token,
            {
                "amount": 50.0,
                "type": "EXPENSE",
                "category": "SUPPLIES",
                "description": f"Expense {uuid.uuid4().hex[:6]}",
                "date": now.isoformat() + "Z",
                "paymentMethod": "DEBIT_CARD",
            },
        )
        tx_ids.append(expense_id)

        params = {
            "page": 1,
            "limit": 10,
            "startDate": start_date,
            "endDate": end_date,
            "type": "INCOME",
        }
        listing = get_transactions(token, params)
        items = listing["data"]
        assert any(tx.get("id") == income_id for tx in items), "Income transaction not found in filtered list"
        assert all(tx.get("type") == "INCOME" for tx in items), "Filter by type failed"

        # Check pagination structure
        pagination = listing["pagination"]
        assert pagination.get("page") == 1
        assert pagination.get("limit") == 10

    finally:
        for tx_id in tx_ids:
            if tx_id:
                delete_transaction(token, tx_id)


test_transaction_listing_with_filtering_and_pagination()
