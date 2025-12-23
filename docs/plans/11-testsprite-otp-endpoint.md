# Plan 11: Test-Only OTP Endpoint (Option B)

## Prerequisites

Before executing this plan, read:

1. **[principal-plan.md](principal-plan.md)** - Project overview
2. **[DEVELOPMENT.md](../DEVELOPMENT.md)** - Current milestone status
3. **[CHANGELOG.md](../CHANGELOG.md)** - Recent changes
4. **[10-testsprite-fix-tests.md](10-testsprite-fix-tests.md)** - Plan A (recommended to complete first)

---

## Objective

Add a test-only endpoint to retrieve OTP codes from Redis, enabling true E2E testing of the OTP authentication flow.

**Use Case:** TestSprite (or other E2E test frameworks) can complete the full OTP workflow without needing direct Redis access.

**Status:** Implemented

**Implemented at:** `packages/backend/src/routes/auth.ts` (behind `ENABLE_TEST_OTP_ENDPOINT=true` and `NODE_ENV!=production`)

---

## Security Considerations

### Why This Needs Careful Implementation

Exposing OTP retrieval is inherently risky. This endpoint:

- Could allow account takeover if exposed in production
- Must be completely disabled in production environments
- Requires explicit opt-in via environment variable

### Security Guards (All Required)

```typescript
// All three conditions must be met:
1. process.env.ENABLE_TEST_OTP_ENDPOINT === 'true'  // Explicit opt-in
2. process.env.NODE_ENV !== 'production'            // Never in production
3. Request must include valid x-tenant-slug header  // Tenant scoped
```

---

## Implementation

> Note: Auth routes are registered under the `/api` prefix, so the full path is `GET /api/auth/test/otp/:identifier`.

### File: `packages/backend/src/routes/auth.ts`

Add at the end of the auth routes, inside the route registration function:

```typescript
// Test-only OTP retrieval endpoint
// SECURITY: Only available in non-production with explicit opt-in
if (process.env.ENABLE_TEST_OTP_ENDPOINT === 'true' && process.env.NODE_ENV !== 'production') {
  app.get(
    '/auth/test/otp/:identifier',
    {
      schema: {
        tags: ['Auth - Test Only'],
        summary: '[TEST ONLY] Retrieve OTP for testing',
        description:
          'WARNING: This endpoint is only available in test/development environments. It allows retrieving OTP codes for E2E testing purposes.',
        params: {
          type: 'object',
          required: ['identifier'],
          properties: {
            identifier: {
              type: 'string',
              description: 'Email or phone number used to request OTP',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              otp: { type: 'string', description: '6-digit OTP code' },
              expiresIn: { type: 'number', description: 'Seconds until expiration' },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { identifier } = request.params as { identifier: string }
      const tenantId = request.tenantId

      if (!tenantId) {
        return reply.code(400).send({ error: 'Tenant context required' })
      }

      // Retrieve OTP from Redis using the same key pattern as auth service (src/lib/redis.ts)
      const otpKey = `barbershop:otp:${tenantId}:${identifier}`
      const otp = await redis.get<string>(otpKey)

      if (!otp) {
        return reply.code(404).send({
          error: 'OTP not found or expired',
          hint: 'Request a new OTP via POST /auth/request-otp first',
        })
      }

      // Get TTL for informational purposes
      const ttl = await redis.ttl(otpKey)

      return {
        otp,
        expiresIn: ttl > 0 ? ttl : 0,
      }
    }
  )

  // Log warning at startup
  console.warn('⚠️  TEST OTP ENDPOINT ENABLED - /auth/test/otp/:identifier')
  console.warn('⚠️  This should NEVER be enabled in production!')
}
```

### File: `packages/backend/.env.example`

Add new environment variable:

```bash
# Test-Only Features (NEVER enable in production)
# Set to 'true' to enable /api/auth/test/otp/:identifier endpoint
# This allows E2E tests to retrieve OTP codes for testing
ENABLE_TEST_OTP_ENDPOINT="false"
```

### File: `packages/backend/.env` (local development)

```bash
# Enable for local testing
ENABLE_TEST_OTP_ENDPOINT=true
```

---

## Usage in TestSprite Tests

### Updated TC004 Test Pattern

```python
import requests

BASE_URL = "http://localhost:3000"
TENANT_SLUG = "barbearia-teste"
TEST_EMAIL = "admin@barbearia-teste.com"

HEADERS = {
    "x-tenant-slug": TENANT_SLUG,
    "Content-Type": "application/json",
}

def test_otp_workflow():
    # Step 1: Request OTP
    request_otp_url = f"{BASE_URL}/api/auth/request-otp"
    payload = {"email": TEST_EMAIL}
    resp = requests.post(request_otp_url, headers=HEADERS, json=payload)
    assert resp.status_code == 200

    # Step 2: Retrieve OTP via test endpoint
    get_otp_url = f"{BASE_URL}/api/auth/test/otp/{TEST_EMAIL}"
    resp = requests.get(get_otp_url, headers=HEADERS)
    assert resp.status_code == 200
    otp_data = resp.json()
    otp = otp_data["otp"]
    assert len(otp) == 6
    assert otp_data["expiresIn"] > 0

    # Step 3: Verify OTP
    verify_otp_url = f"{BASE_URL}/api/auth/verify-otp"
    payload = {"email": TEST_EMAIL, "otp": otp}
    resp = requests.post(verify_otp_url, headers=HEADERS, json=payload)
    assert resp.status_code == 200
    tokens = resp.json()
    assert "accessToken" in tokens
    assert "refreshToken" in tokens

    print("✅ OTP workflow test passed!")
```

---

## Verification Checklist

### Development Environment

1. [ ] Set `ENABLE_TEST_OTP_ENDPOINT=true` in `.env`
2. [ ] Set `NODE_ENV=development` (or `test`)
3. [ ] Start server: `pnpm dev`
4. [ ] Request OTP: `POST /api/auth/request-otp`
5. [ ] Retrieve OTP: `GET /api/auth/test/otp/{email}`
6. [ ] Verify OTP: `POST /api/auth/verify-otp`

### Production Safety

1. [ ] Verify endpoint returns 404 when `ENABLE_TEST_OTP_ENDPOINT=false`
2. [ ] Verify endpoint returns 404 when `NODE_ENV=production`
3. [ ] Verify Vercel deployment does NOT have `ENABLE_TEST_OTP_ENDPOINT` set

---

## API Documentation

### Request

```http
GET /api/auth/test/otp/:identifier
x-tenant-slug: barbearia-teste
```

### Success Response (200)

```json
{
  "otp": "123456",
  "expiresIn": 287
}
```

### Error Responses

**404 - OTP Not Found:**

```json
{
  "error": "OTP not found or expired",
  "hint": "Request a new OTP via POST /auth/request-otp first"
}
```

**404 - Endpoint Disabled (Production):**

```json
{
  "error": "Not Found"
}
```

---

## When to Use This Plan

| Scenario                        | Use Plan A | Use Plan B |
| ------------------------------- | ---------- | ---------- |
| Fix schema mismatches           | ✅         | ❌         |
| Test OTP request/verify flow    | ❌         | ✅         |
| CI/CD E2E testing with full OTP | ❌         | ✅         |
| Most failing tests              | ✅         | ❌         |
| TC004 specifically              | ❌         | ✅         |

**Recommendation:**

- Execute **Plan A first** (fixes 5 of 6 failing tests)
- Execute **Plan B only if** you need true OTP E2E testing (TC004)

---

## Risk Assessment

| Risk                           | Mitigation                                      | Residual Risk |
| ------------------------------ | ----------------------------------------------- | ------------- |
| Endpoint exposed in production | Dual guard: env var + NODE_ENV check            | Low           |
| Developer forgets to disable   | Startup warning log, .env.example default=false | Low           |
| OTP leaked in logs             | Only return OTP in response body, not logged    | Low           |

---

## Notes

- This endpoint is **optional** - most tests can pass with Plan A alone
- The endpoint is scoped by tenant (uses `x-tenant-slug` header)
- OTP retrieval uses the same Redis key pattern as the auth service
- TTL information helps tests verify timing constraints
