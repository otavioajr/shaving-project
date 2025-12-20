import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3000"
TIMEOUT = 30
TENANT_SLUG = "test-tenant"
AUTH_EMAIL = "testuser@example.com"
AUTH_PASSWORD = "password123"

def authenticate():
    url = f"{BASE_URL}/api/auth/login"
    payload = {
        "email": AUTH_EMAIL,
        "password": AUTH_PASSWORD
    }
    headers = {
        "Content-Type": "application/json",
        "x-tenant-slug": TENANT_SLUG
    }
    resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Auth failed: {resp.text}"
    data = resp.json()
    assert "accessToken" in data and "refreshToken" in data and "professional" in data
    return data["accessToken"]

def create_transaction(access_token, tenant_slug, transaction_data):
    url = f"{BASE_URL}/api/transactions"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "x-tenant-slug": tenant_slug,
        "Content-Type": "application/json"
    }
    resp = requests.post(url, json=transaction_data, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 201, f"Failed creating transaction: {resp.text}"
    return resp.json()

def delete_transaction(access_token, tenant_slug, transaction_id):
    url = f"{BASE_URL}/api/transactions/{transaction_id}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "x-tenant-slug": tenant_slug
    }
    resp = requests.delete(url, headers=headers, timeout=TIMEOUT)
    assert resp.status_code in (200, 204), f"Failed deleting transaction {transaction_id}: {resp.text}"

def test_transaction_management_list_transactions_with_filters():
    access_token = authenticate()

    headers = {
        "Authorization": f"Bearer {access_token}",
        "x-tenant-slug": TENANT_SLUG
    }

    # Prepare test data - create multiple transactions with different types, categories, and dates
    today = datetime.utcnow().date()
    five_days_ago = today - timedelta(days=5)
    two_days_ago = today - timedelta(days=2)
    tomorrow = today + timedelta(days=1)

    transactions_to_create = [
        {
            "type": "INCOME",
            "category": "Haircut",
            "amount": 50.0,
            "date": five_days_ago.isoformat()
        },
        {
            "type": "INCOME",
            "category": "Shave",
            "amount": 30.0,
            "date": two_days_ago.isoformat()
        },
        {
            "type": "EXPENSE",
            "category": "Supplies",
            "amount": 20.0,
            "date": today.isoformat()
        },
        {
            "type": "EXPENSE",
            "category": "Maintenance",
            "amount": 15.0,
            "date": tomorrow.isoformat()
        }
    ]

    created_transactions = []

    # Create transactions since transaction creation is required for filtering test
    for t_data in transactions_to_create:
        # API schema for create transaction not detailed in PRD excerpt,
        # assume properties type, category, amount, and date are accepted.
        # Add tenant scoped field if needed, but per spec, tenant is in header.
        payload = {
            "type": t_data["type"],
            "category": t_data["category"],
            "amount": t_data["amount"],
            "date": t_data["date"]
        }
        created = create_transaction(access_token, TENANT_SLUG, payload)
        created_transactions.append(created)

    try:
        # Test filters with query params
        # 1) Filter by type = INCOME
        params = {"type": "INCOME"}
        resp = requests.get(f"{BASE_URL}/api/transactions", headers=headers, params=params, timeout=TIMEOUT)
        assert resp.status_code == 200, f"GET transactions failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        for transaction in data:
            assert transaction.get("type") == "INCOME"

        # 2) Filter by category = "Supplies"
        params = {"category": "Supplies"}
        resp = requests.get(f"{BASE_URL}/api/transactions", headers=headers, params=params, timeout=TIMEOUT)
        assert resp.status_code == 200, f"GET transactions failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        for transaction in data:
            assert "Supplies" == transaction.get("category")

        # 3) Filter by date range startDate and endDate
        params = {
            "startDate": five_days_ago.isoformat(),
            "endDate": two_days_ago.isoformat()
        }
        resp = requests.get(f"{BASE_URL}/api/transactions", headers=headers, params=params, timeout=TIMEOUT)
        assert resp.status_code == 200, f"GET transactions failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        for transaction in data:
            tran_date = transaction.get("date")
            assert tran_date is not None
            # transaction date must be within startDate and endDate inclusive
            assert five_days_ago.isoformat() <= tran_date <= two_days_ago.isoformat()

        # 4) Filter with combined filters type=EXPENSE and date range
        params = {
            "type": "EXPENSE",
            "startDate": today.isoformat(),
            "endDate": tomorrow.isoformat()
        }
        resp = requests.get(f"{BASE_URL}/api/transactions", headers=headers, params=params, timeout=TIMEOUT)
        assert resp.status_code == 200, f"GET transactions failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        for transaction in data:
            assert transaction.get("type") == "EXPENSE"
            tran_date = transaction.get("date")
            assert tran_date is not None
            assert today.isoformat() <= tran_date <= tomorrow.isoformat()

        # 5) Test pagination: request page=1 & limit=2, expect no more than 2 items
        params = {"page": 1, "limit": 2}
        resp = requests.get(f"{BASE_URL}/api/transactions", headers=headers, params=params, timeout=TIMEOUT)
        assert resp.status_code == 200, f"GET transactions with pagination failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) <= 2

    finally:
        for t in created_transactions:
            tid = t.get("id")
            if tid:
                try:
                    delete_transaction(access_token, TENANT_SLUG, tid)
                except Exception:
                    pass  # Ignore deletion failure on cleanup

test_transaction_management_list_transactions_with_filters()