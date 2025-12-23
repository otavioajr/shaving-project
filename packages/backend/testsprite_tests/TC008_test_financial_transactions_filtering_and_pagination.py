import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
TRANSACTIONS_URL = f"{BASE_URL}/api/transactions"

ADMIN_EMAIL = "admin@barbearia.com"
ADMIN_PASSWORD = "senha123"
HEADERS_COMMON = {"x-tenant-slug": TENANT_SLUG}
TIMEOUT = 30


def login(email: str, password: str, tenant_slug: str):
    url = LOGIN_URL
    headers = {"x-tenant-slug": tenant_slug}
    payload = {"email": email, "password": password}
    resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    return data["accessToken"]


def test_financial_transactions_filtering_and_pagination():
    # 1. Login as admin to get access token
    access_token = login(ADMIN_EMAIL, ADMIN_PASSWORD, TENANT_SLUG)

    headers_auth = {
        "Authorization": f"Bearer {access_token}",
        "x-tenant-slug": TENANT_SLUG,
    }

    # 2. Create a couple of transactions for testing filtering and pagination
    created_txns = []
    try:
        # Create INCOME transaction category Salary dated 2025-12-10
        txn_income = {
            "amount": 5000,
            "type": "INCOME",
            "category": "Salary",
            "description": "Monthly salary",
            "date": "2025-12-10T09:00:00Z",
            "paymentMethod": "PIX",
        }
        resp_income = requests.post(
            TRANSACTIONS_URL, json=txn_income, headers=headers_auth, timeout=TIMEOUT
        )
        assert resp_income.status_code == 201, f"Unexpected status: {resp_income.status_code}"
        created_txns.append(resp_income.json().get("id") or resp_income.json().get("transaction", {}).get("id"))

        # Create EXPENSE transaction category Supplies dated 2025-12-15
        txn_expense = {
            "amount": 150,
            "type": "EXPENSE",
            "category": "Supplies",
            "description": "Hair products",
            "date": "2025-12-15T10:00:00Z",
            "paymentMethod": "CASH",
        }
        resp_expense = requests.post(
            TRANSACTIONS_URL, json=txn_expense, headers=headers_auth, timeout=TIMEOUT
        )
        assert resp_expense.status_code == 201, f"Unexpected status: {resp_expense.status_code}"
        created_txns.append(resp_expense.json().get("id") or resp_expense.json().get("transaction", {}).get("id"))

        # 3. Test retrieving transactions filtered by type=INCOME with pagination parameters
        params = {"type": "INCOME", "page": 1, "limit": 10}
        resp_filter_type = requests.get(
            TRANSACTIONS_URL, headers=headers_auth, params=params, timeout=TIMEOUT
        )
        assert resp_filter_type.status_code == 200
        data_type = resp_filter_type.json()
        assert "data" in data_type and isinstance(data_type["data"], list)
        # All returned must have type INCOME
        assert all(txn.get("type") == "INCOME" for txn in data_type["data"])

        # 4. Test retrieving transactions filtered by category=Supplies
        params_cat = {"category": "Supplies"}
        resp_filter_cat = requests.get(
            TRANSACTIONS_URL, headers=headers_auth, params=params_cat, timeout=TIMEOUT
        )
        assert resp_filter_cat.status_code == 200
        data_cat = resp_filter_cat.json()
        assert "data" in data_cat and isinstance(data_cat["data"], list)
        assert all(txn.get("category") == "Supplies" for txn in data_cat["data"])

        # 5. Test retrieving transactions within date range 2025-12-01 to 2025-12-31
        params_date = {"startDate": "2025-12-01T00:00:00Z", "endDate": "2025-12-31T23:59:59Z"}
        resp_filter_date = requests.get(
            TRANSACTIONS_URL, headers=headers_auth, params=params_date, timeout=TIMEOUT
        )
        assert resp_filter_date.status_code == 200
        data_date = resp_filter_date.json()
        assert "data" in data_date and isinstance(data_date["data"], list)
        for txn in data_date["data"]:
            txn_date = txn.get("date")
            assert txn_date >= "2025-12-01T00:00:00Z"
            assert txn_date <= "2025-12-31T23:59:59Z"

        # 6. Test pagination: limit=1 and page=2 returns correct data
        params_pagination = {"limit": 1, "page": 2}
        resp_pagination = requests.get(
            TRANSACTIONS_URL, headers=headers_auth, params=params_pagination, timeout=TIMEOUT
        )
        assert resp_pagination.status_code == 200
        json_pag = resp_pagination.json()
        assert "data" in json_pag and isinstance(json_pag["data"], list)
        assert len(json_pag["data"]) <= 1
        assert "pagination" in json_pag
        assert json_pag["pagination"]["page"] == 2
        assert json_pag["pagination"]["limit"] == 1

    finally:
        # Clean up created transactions (if backend supports DELETE)
        for txn_id in created_txns:
            if txn_id:
                try:
                    del_resp = requests.delete(
                        f"{TRANSACTIONS_URL}/{txn_id}",
                        headers=headers_auth,
                        timeout=TIMEOUT,
                    )
                    # 204 no content expected on success, or ignore if deletion not allowed
                    assert del_resp.status_code in (204, 404), f"Unexpected delete status {del_resp.status_code}"
                except Exception:
                    pass

    # 7. Test unauthorized access returns 401
    unauthorized_headers = {
        "x-tenant-slug": TENANT_SLUG,
    }
    resp_unauth = requests.get(TRANSACTIONS_URL, headers=unauthorized_headers, timeout=TIMEOUT)
    assert resp_unauth.status_code == 401

    # 8. Test missing tenant slug returns 404
    headers_missing_tenant = {
        "Authorization": f"Bearer {access_token}",
    }
    resp_missing_tenant = requests.get(TRANSACTIONS_URL, headers=headers_missing_tenant, timeout=TIMEOUT)
    assert resp_missing_tenant.status_code == 404

    # 9. Test invalid tenant slug returns 404
    headers_invalid_tenant = {
        "Authorization": f"Bearer {access_token}",
        "x-tenant-slug": "invalid-tenant",
    }
    resp_invalid_tenant = requests.get(TRANSACTIONS_URL, headers=headers_invalid_tenant, timeout=TIMEOUT)
    assert resp_invalid_tenant.status_code == 404


test_financial_transactions_filtering_and_pagination()