# Plan 10: TestSprite Test Fixes (Option A)

## Prerequisites

Before executing this plan, read:
1. **[principal-plan.md](principal-plan.md)** - Project overview
2. **[DEVELOPMENT.md](../DEVELOPMENT.md)** - Current milestone status
3. **[CHANGELOG.md](../CHANGELOG.md)** - Recent changes

---

## Objective

Fix TestSprite-generated tests to match actual API schemas and authentication patterns.

**Status:** Completed (2025-12-18)

**Current State (2025-12-18):** 10/10 tests passing (100%) — see `testsprite_tests/testsprite-mcp-test-report.md`
**Target State:** 10/10 tests passing (100%)

---

## Problem Analysis

TestSprite generated tests based on assumptions that don't match our actual API implementation:

| Category | Tests Affected | Root Cause |
|----------|----------------|------------|
| Schema Mismatch | TC005, TC006 | Wrong request payload fields |
| Error Code Mismatch | TC007 | Expects 401/403, API returns 404 |
| OTP Dependency | TC004, TC008, TC009, TC010 | Tests try to retrieve OTP from Redis |
| False Positive | TC008 | Skips critical tests when OTP unavailable |

---

## Test-by-Test Fixes

### TC005: Professionals CRUD

**File:** `testsprite_tests/TC005_crud_operations_for_professionals_with_tenant_isolation.py`

**Problem (lines 134-140):**
```python
# Current (WRONG)
professional_data = {
    "name": "John Doe",
    "email": "john.doe.test@barbearia-teste.com",
    "phone": "1234567890",        # Field doesn't exist
    "role": "PROFESSIONAL",       # Wrong enum value
    "specialty": "Barber",        # Field doesn't exist
}
```

**Fix:**
```python
# Corrected
professional_data = {
    "name": "John Doe",
    "email": "john.doe.test@barbearia-teste.com",
    "password": "Test@123456",           # Required
    "commissionRate": 30,                # Required (0-100)
    "role": "BARBER",                    # Must be ADMIN or BARBER
}
```

**Additional Fix (line 165):**
```python
# Current (WRONG)
assert isinstance(professionals_list, list)

# Corrected - API returns paginated response
professionals_response = list_professionals(access_token)
assert "data" in professionals_response
assert "pagination" in professionals_response
professionals_list = professionals_response["data"]
```

---

### TC006: Clients CRUD

**File:** `testsprite_tests/TC006_crud_operations_for_clients_with_tenant_isolation.py`

**Problem (lines 111-116):**
```python
# Current (WRONG)
client_payload = {
    "name": "Test Client TC006",
    "email": f"tc006_client_{timestamp}@example.com",  # Field doesn't exist
    "phone": phone_unique,
    "notes": "Created by TC006 test",                   # Field doesn't exist
}
```

**Fix:**
```python
# Corrected
client_payload = {
    "name": "Test Client TC006",
    "phone": phone_unique,  # Only name and phone are valid fields
}
```

**Additional Fix (line 133):**
```python
# Remove this assertion - email doesn't exist on clients
# assert client_get_data["email"] == client_payload["email"]
assert client_get_data["name"] == client_payload["name"]
assert client_get_data["phone"] == client_payload["phone"]
```

---

### TC007: Services CRUD

**File:** `testsprite_tests/TC007_crud_operations_for_services_with_authentication.py`

**Problem (line 125):**
```python
# Current (WRONG)
assert r_wrong_create.status_code in {401, 403}

# Our tenant middleware returns 404 for invalid tenants
```

**Fix:**
```python
# Corrected - include 404 for tenant not found
assert r_wrong_create.status_code in {401, 403, 404}
```

---

### TC008: Appointments (False Positive)

**File:** `testsprite_tests/TC008_appointment_creation_with_conflict_detection_and_commission_calculation.py`

**Problem:** Test contains early exit when OTP retrieval fails, causing false pass.

**Fix:**
1. Remove OTP dependency
2. Use password-based authentication
3. Actually test appointment creation and conflict detection

```python
# Use password login instead of OTP
def get_auth_token():
    login_url = f"{BASE_URL}/api/auth/login"
    payload = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    resp = requests.post(login_url, headers=TENANT_HEADER, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()["accessToken"]
```

---

### TC009: Transactions

**File:** `testsprite_tests/TC009_transaction_listing_with_filtering_and_pagination.py`

**Problems:**
1. OTP dependency for auth
2. Wrong query parameters (`dateFrom/dateTo` vs `startDate/endDate`)
3. Wrong response structure (`meta` vs `pagination`)

**Fixes:**
```python
# 1. Use password auth
access_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

# 2. Correct query parameters
params = {
    "page": 1,
    "limit": 10,
    "startDate": "2025-01-01",  # Not dateFrom
    "endDate": "2025-12-31",    # Not dateTo
}

# 3. Correct response structure
response = get_transactions(access_token, params)
assert "data" in response
assert "pagination" in response  # Not "meta"
```

---

### TC010: Barbershop

**File:** `testsprite_tests/TC010_barbershop_read_and_update_with_tenant_authentication.py`

**Problem:** Assumes local Redis REST at `http://localhost:6379`

**Fix:**
```python
# Remove Redis dependency entirely
# Use password-based authentication
def ensure_auth():
    login_url = f"{BASE_URL}/api/auth/login"
    payload = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    resp = requests.post(login_url, headers=HEADERS, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()["accessToken"]
```

---

## API Schema Reference

### Professional Entity
```typescript
// POST /api/professionals - Required fields
{
  name: string,           // minLength: 1
  email: string,          // format: email
  password: string,       // minLength: 6
  commissionRate: number, // 0-100
  role: 'ADMIN' | 'BARBER'
}

// GET /api/professionals - Response format
{
  data: Professional[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

### Client Entity
```typescript
// POST /api/clients - Required fields
{
  name: string,              // minLength: 1
  phone: string,             // minLength: 10
  pushSubscription?: object  // Optional
}
// Note: NO email field, NO notes field
```

### Tenant Middleware Behavior
```
Invalid/missing x-tenant-slug header → 404 (NOT 401/403)
Invalid token → 401
Insufficient permissions → 403
```

---

## Verification Checklist

After applying fixes:

- [ ] TC005: Professionals CRUD passes
- [ ] TC006: Clients CRUD passes
- [ ] TC007: Services CRUD passes (with 404 assertion)
- [ ] TC008: Appointments actually tests functionality (no skip)
- [ ] TC009: Transactions uses password auth + correct params
- [ ] TC010: Barbershop uses password auth (no Redis)

**Run tests:**
```bash
cd testsprite_tests
python TC005_crud_operations_for_professionals_with_tenant_isolation.py
# Repeat for each test
```

---

## Expected Outcome

| Test | Before | After |
|------|--------|-------|
| TC001 | ✅ Pass | ✅ Pass |
| TC002 | ✅ Pass | ✅ Pass |
| TC003 | ✅ Pass | ✅ Pass |
| TC004 | ❌ Fail | ⚠️ Skip (OTP-specific) |
| TC005 | ❌ Fail | ✅ Pass |
| TC006 | ❌ Fail | ✅ Pass |
| TC007 | ❌ Fail | ✅ Pass |
| TC008 | ⚠️ False Pass | ✅ Real Pass |
| TC009 | ❌ Fail | ✅ Pass |
| TC010 | ❌ Fail | ✅ Pass |

**Result:** 9/10 passing (TC004 skipped as it specifically tests OTP E2E)

---

## Notes

- TC004 specifically tests OTP workflow - requires Plan B (Option B) to fully pass
- All other tests can pass using password-based authentication
- Schema fixes are straightforward corrections to match actual API
