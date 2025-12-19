# Development Progress

This document tracks the development progress of the Barbershop SaaS Platform.

---

## Implementation Plans

Cada milestone possui um plano detalhado em `docs/plans/`. Antes de iniciar qualquer milestone, leia:

1. **[docs/plans/principal-plan.md](docs/plans/principal-plan.md)** - Visão geral completa do projeto
2. **[docs/CHANGELOG.md](docs/CHANGELOG.md)** - Histórico de mudanças
3. O plano específico do milestone que você vai executar

### Planos por Milestone

- **Milestone 1:** [01-database-schema.md](docs/plans/01-database-schema.md)
- **Milestone 2:** [02-fastify-middleware.md](docs/plans/02-fastify-middleware.md)
- **Milestone 3:** [03-authentication.md](docs/plans/03-authentication.md)
- **Milestone 4:** [04-crud-entities.md](docs/plans/04-crud-entities.md)
- **Milestone 5:** [05-appointments.md](docs/plans/05-appointments.md)
- **Milestone 6:** [06-financial.md](docs/plans/06-financial.md)
- **Milestone 7:** [07-notifications.md](docs/plans/07-notifications.md)
- **Milestone 8:** [08-barbershop-management.md](docs/plans/08-barbershop-management.md)
- **Milestone 9:** [09-testing-deployment.md](docs/plans/09-testing-deployment.md)

---

## Milestone Status

| Milestone | Status | Description |
|-----------|--------|-------------|
| 0 | **COMPLETE** ✅ | Project Scaffolding |
| 1 | **COMPLETE** ✅ | Database Schema & Core Infrastructure |
| 2 | **COMPLETE** ✅ | Fastify App & Core Middleware |
| 3 | **COMPLETE** ✅ | Authentication (JWT + OTP) |
| 4 | **COMPLETE** ✅ | CRUD (Professionals, Clients, Services) |
| 5 | **COMPLETE** ✅ | Appointment Management |
| 6 | **COMPLETE** ✅ | Financial Management (Transactions) |
| 7 | Pending | Notifications (Web Push + Cron) |
| 8 | **COMPLETE** ✅ | Barbershop Management |
| 9 | In Progress | Testing, Docs & Deployment |

---

## ⚠️ Production Deployment: Env Var Checklist

Quando for fazer deploy em **produção**, revise obrigatoriamente as variáveis de ambiente do backend (`packages/backend/.env.example` como referência).

### Test-only / Segurança
- `NODE_ENV="production"` (isso também ativa comportamento de cookies `secure` e desabilita rotas de teste)
- `ENABLE_TEST_OTP_ENDPOINT="false"` (**nunca** habilitar em produção; expõe OTP)

### Essenciais de runtime
- `API_URL="https://<seu-dominio>"` (usado em docs/callbacks)
- `JWT_SECRET="<segredo forte (>= 32 chars)>"` (não reutilizar o de dev)
- `DATABASE_URL="<prod pooler 6543>"` (runtime)
- `DIRECT_URL="<prod direct 5432>"` (migrations)
- `UPSTASH_REDIS_REST_URL="https://..."` e `UPSTASH_REDIS_REST_TOKEN="..."` (prod)

### Cron e notificações (quando habilitados)
- `CRON_SECRET="<segredo forte>"` (proteger endpoints de cron)
- `VAPID_PUBLIC_KEY="..."`, `VAPID_PRIVATE_KEY="..."`, `VAPID_SUBJECT="mailto:..."`

> Regra prática: qualquer coisa marcada como “test-only” deve estar desabilitada em produção.

---

## Milestone 0: Project Scaffolding

**Status:** COMPLETE

### Checklist

- [x] Root monorepo structure
  - [x] `package.json` with workspace scripts
  - [x] `pnpm-workspace.yaml`
  - [x] `.gitignore`
  - [x] `.nvmrc` (Node 22)

- [x] Backend package configuration
  - [x] `packages/backend/package.json`
  - [x] `packages/backend/tsconfig.json`
  - [x] `packages/backend/vitest.config.ts`
  - [x] `packages/backend/vercel.json`
  - [x] `packages/backend/.env.example`
  - [x] `packages/backend/eslint.config.js`

- [x] Core library files
  - [x] `src/lib/prisma.ts` (Singleton pattern)
  - [x] `src/lib/redis.ts` (Upstash client with helpers)

- [x] Application core
  - [x] `src/app.ts` (Fastify factory)
  - [x] `src/server.ts` (Local dev server)
  - [x] `api/index.ts` (Vercel entrypoint)

- [x] Database schema
  - [x] `prisma/schema.prisma` (Complete schema)

- [x] Verification
  - [x] `pnpm install` succeeds
  - [x] `pnpm build` succeeds
  - [x] `pnpm lint` passes
  - [x] Health check endpoint works

---

## Milestone 1: Database Schema & Core Infrastructure

**Status:** COMPLETE

### Checklist

- [x] Apply database migration via Supabase MCP
- [x] Verify all 6 tables created
- [x] Generate Prisma client
- [x] Unit tests for Prisma singleton
- [x] Unit tests for Redis client

---

## Milestone 2: Fastify App & Core Middleware

**Status:** COMPLETE ✅

### Checklist

- [x] Tenant validation middleware
  - [x] Validates `x-tenant-slug` header
  - [x] Caches tenant lookups in Redis
  - [x] Injects `tenantId` and `tenantSlug` into request
  - [x] Returns 404 for invalid/missing tenants
  - [x] Skips validation for public routes
- [x] Rate limiting middleware (IP + tenant)
  - [x] IP-based rate limiting (100/60s)
  - [x] Tenant-based rate limiting (1000/60s)
  - [x] Returns 429 with headers when exceeded
  - [x] Skips rate limiting for public routes
- [x] Database security (RLS)
  - [x] Enabled RLS on all tables
  - [x] Created RLS policies for tenant isolation
  - [x] Added composite indexes for performance
- [x] Integration tests for middleware
  - [x] Unit tests for tenant middleware (9 tests)
  - [x] Unit tests for rate limit middleware (8 tests)
  - [x] Integration tests with Fastify (10 tests)
- [x] `/health` endpoint test
- [x] `/docs` Swagger UI test

---

## Development Tools: Database Seeding

**Status:** COMPLETE ✅

### Seeding for Local Development

- [x] `prisma/seed.ts` - Idempotent development database seeder
  - Creates test barbershop (`barbearia-teste`)
  - Creates admin and barber test users with known credentials
  - Creates test client and services
  - Safe to run multiple times
  
**Quick Start:**
```bash
pnpm db:seed
```

This is now part of the normal setup flow: `pnpm install` → `pnpm db:generate` → `pnpm db:seed` → `pnpm dev`

---

## Milestone 3: Authentication (JWT + OTP)

**Status:** COMPLETE ✅

### Checklist

- [x] Auth service (OTP, tokens, password)
  - `src/services/authService.ts` - Password hashing, JWT generation, OTP management
- [x] Auth controller (login, OTP, refresh, logout)
  - `src/controllers/authController.ts` - All auth endpoints
- [x] Auth middleware (JWT verification, roles)
  - `src/middleware/auth.ts` - Token verification, RBAC
- [x] Unit tests for auth service
- [x] Integration tests for auth endpoints

### Endpoints Implemented

- `POST /api/auth/login` - Email/password authentication
- `POST /api/auth/request-otp` - Request OTP (Redis TTL: 5min)
- `POST /api/auth/verify-otp` - Verify OTP, issue tokens
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Invalidate tokens

---

## Milestone 4: CRUD (Professionals, Clients, Services)

**Status:** COMPLETE ✅

### Checklist

- [x] Professional repository, service, controller
  - `src/repositories/professionalRepository.ts`
  - `src/services/professionalService.ts`
  - `src/controllers/professionalController.ts`
  - `src/routes/professionals.ts`
- [x] Client repository, service, controller
  - `src/repositories/clientRepository.ts`
  - `src/services/clientService.ts`
  - `src/controllers/clientController.ts`
  - `src/routes/clients.ts`
- [x] Service repository, service, controller
  - `src/repositories/serviceRepository.ts`
  - `src/services/serviceService.ts`
  - `src/controllers/serviceController.ts`
  - `src/routes/services.ts`
- [x] Pagination implementation
  - All list endpoints return `{ data: [], pagination: { page, limit, total, totalPages } }`
- [x] Role-based access control
- [x] Swagger documentation
- [x] Unit and integration tests

---

## Milestone 5: Appointment Management

**Status:** COMPLETE ✅

### Checklist

- [x] Appointment repository, service, controller
  - `src/repositories/appointmentRepository.ts`
  - `src/services/appointmentService.ts`
  - `src/controllers/appointmentController.ts`
  - `src/routes/appointments.ts`
- [x] Conflict validation logic
  - Prevents double-booking for same professional/time
  - Ignores CANCELLED appointments in conflict check
- [x] Status transitions
  - PENDING → CONFIRMED → COMPLETED/CANCELLED/NO_SHOW
- [x] Commission calculation on COMPLETED
  - Snapshot pattern: price and commission stored at creation/completion
- [x] Filtering (date, status, professional)
- [x] Tests

---

## Milestone 6: Financial Management

**Status:** COMPLETE ✅

### Checklist

- [x] Transaction CRUD
  - `src/repositories/transactionRepository.ts`
  - `src/services/transactionService.ts`
  - `src/controllers/transactionController.ts`
  - `src/routes/transactions.ts`
- [x] Financial summary endpoint
- [x] Commission report endpoint (via appointments)
- [x] Tests

---

## Milestone 7: Notifications (Web Push + Cron)

**Status:** Pending

### Checklist

- [ ] Web Push service
- [ ] Push subscription management
- [ ] Cron endpoint (`/api/cron/notify`)
- [ ] CRON_SECRET protection
- [ ] Tests

---

## Milestone 8: Barbershop Management

**Status:** COMPLETE ✅

### Checklist

- [x] Self-registration endpoint (if applicable)
- [x] Seed script (`prisma/seed.ts`)
- [x] Barbershop read/update endpoints
  - `src/controllers/barbershopController.ts`
  - `src/routes/barbershop.ts`
- [x] Slug validation
- [x] Tests

---

## Milestone 9: Testing, Docs & Deployment

**Status:** In Progress

### Checklist

- [x] Test coverage >= 80% (Vitest: 67/67 passing)
- [x] Complete Swagger documentation
- [x] README with setup instructions
- [ ] GitHub Actions CI workflow
- [ ] Vercel deployment
- [ ] Production health check
- [x] TestSprite E2E integration (4/10 passing, fixes documented)

---

## TestSprite E2E Testing

**Status:** Integrated (Fixes Pending)

### Test Results (2025-12-16)

**Vitest (Unit Tests):** 67/67 ✅ (100%)
**TestSprite (E2E):** 4/10 (40%)

### Reports & Plans

- **Test Report:** `testsprite_tests/testsprite-mcp-test-report.md`
- **Plan A (Fix Tests):** `docs/plans/10-testsprite-fix-tests.md`
- **Plan B (OTP Endpoint):** `docs/plans/11-testsprite-otp-endpoint.md`

### Issue Summary

| Category | Tests | Root Cause |
|----------|-------|------------|
| Schema Mismatch | TC005, TC006 | Generated tests used wrong field names |
| Error Code | TC007 | Expected 401/403, API returns 404 for invalid tenant |
| OTP Dependency | TC004, TC009, TC010 | Tests can't access Redis OTP |
| False Positive | TC008 | Skips tests when OTP unavailable |

### Next Steps

1. Execute Plan A to fix schema mismatches (estimated: 9/10 pass)
2. Optional: Execute Plan B for full OTP E2E testing

---

## Notes

### Critical Implementation Points

1. **Prisma Singleton:** Always use `globalThis` pattern to prevent connection exhaustion in serverless
2. **OTP Storage:** NEVER store in PostgreSQL, only Redis with TTL
3. **Tenant Isolation:** ALL queries MUST filter by `barbershopId`
4. **Pagination:** ALL listing routes MUST require `page` and `limit`
5. **Snapshots:** Store price/commission at transaction time

### Infrastructure

- **Supabase Project:** `shaving-project`
- **Upstash Redis:** `barbershop-saas-cache`
- **Package Manager:** pnpm

---

*Last updated: $(date)*
