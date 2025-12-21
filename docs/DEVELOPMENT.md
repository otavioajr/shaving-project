# Development Progress

This document tracks the development progress of the Barbershop SaaS Platform.

---

## Implementation Plans

Cada milestone possui um plano detalhado em `docs/plans/`. Antes de iniciar qualquer milestone, leia:

1. **[plans/principal-plan.md](plans/principal-plan.md)** - Visão geral completa do projeto
2. **[CHANGELOG.md](CHANGELOG.md)** - Histórico de mudanças
3. O plano específico do milestone que você vai executar

### Planos por Milestone

- **Milestone 1:** [01-database-schema.md](plans/01-database-schema.md)
- **Milestone 2:** [02-fastify-middleware.md](plans/02-fastify-middleware.md)
- **Milestone 3:** [03-authentication.md](plans/03-authentication.md)
- **Milestone 4:** [04-crud-entities.md](plans/04-crud-entities.md)
- **Milestone 5:** [05-appointments.md](plans/05-appointments.md)
- **Milestone 6:** [06-financial.md](plans/06-financial.md)
- **Milestone 7:** [07-notifications.md](plans/07-notifications.md)
- **Milestone 8:** [08-barbershop-management.md](plans/08-barbershop-management.md)
- **Milestone 9:** [09-testing-deployment.md](plans/09-testing-deployment.md)

---

## Milestone Status

| Milestone | Status | Description |
|-----------|--------|-------------|
| 0 | **COMPLETE** ✅ | Project Scaffolding |
| 1 | **COMPLETE** ✅ | Database Schema & Core Infrastructure |
| 2 | **COMPLETE** ✅ | Fastify App & Core Middleware |
| 3 | **COMPLETE** ✅ | Authentication (JWT + OTP) |
| 4 | In Progress | CRUD (Professionals, Clients, Services) |
| 5 | In Progress | Appointment Management |
| 6 | In Progress | Financial Management |
| 7 | In Progress | Notifications (Web Push + Cron) |
| 8 | In Progress | Barbershop Management |
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
  - [x] Unit tests for tenant middleware (12 tests)
  - [x] Unit tests for rate limit middleware (13 tests)
  - [x] Integration tests with Fastify (11 tests)
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
  - `src/middleware/auth.ts` - Token verification (RBAC ainda não aplicado)
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

**Status:** IN PROGRESS

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
- [x] Auth required for create/update/delete operations
- [ ] Role-based access control (RBAC) by `role` (ADMIN vs BARBER)
- [x] Swagger documentation (schemas in routes)
- [ ] Unit and integration tests for CRUD endpoints

---

## Milestone 5: Appointment Management

**Status:** IN PROGRESS

### Checklist

- [x] Appointment repository, service, controller
  - `src/repositories/appointmentRepository.ts`
  - `src/services/appointmentService.ts`
  - `src/controllers/appointmentController.ts`
  - `src/routes/appointments.ts`
- [x] Conflict validation logic
  - Prevents double-booking for same professional/time
  - Ignores CANCELLED appointments in conflict check
- [ ] Status transitions validation (enforce allowed changes)
  - Planned: PENDING → CONFIRMED → COMPLETED/CANCELLED/NO_SHOW
- [x] Commission calculation on COMPLETED
  - Snapshot pattern: price and commission stored at creation/completion
- [x] Filtering (date, status, professional)
- [x] Auth required for create/update/delete operations
- [ ] Tests

---

## Milestone 6: Financial Management

**Status:** IN PROGRESS

### Checklist

- [x] Transaction CRUD
  - `src/repositories/transactionRepository.ts`
  - `src/services/transactionService.ts`
  - `src/controllers/transactionController.ts`
  - `src/routes/transactions.ts`
- [x] Auth required for create/update/delete operations
- [ ] Financial summary endpoint
- [ ] Commission report endpoint (via appointments)
- [ ] Tests

---

## Milestone 7: Notifications (Web Push + Cron)

**Status:** IN PROGRESS

### Checklist

- [x] Persist push subscription on Client (`pushSubscription` field)
- [ ] Web Push service (send notifications)
- [ ] Cron endpoint (`/api/cron/notify`)
- [ ] CRON_SECRET protection
- [ ] Tests

---

## Milestone 8: Barbershop Management

**Status:** IN PROGRESS

### Checklist

- [ ] Self-registration endpoint (if applicable)
- [x] Seed script (`prisma/seed.ts`)
- [x] Barbershop read/update endpoints
  - `src/controllers/barbershopController.ts`
  - `src/routes/barbershops.ts`
- [ ] Slug validation (for create/update slug operations)
- [ ] Require auth/RBAC for barbershop update
- [ ] Tests

---

## Milestone 9: Testing, Docs & Deployment

**Status:** IN PROGRESS

### Checklist

- [x] `pnpm test` passing (Vitest: 68/68 ✅)
- [x] `pnpm lint` passing (0 warnings/errors)
- [ ] Test coverage >= 80% (current: ~58% lines/stmts on `pnpm test:coverage`)
- [x] Complete Swagger documentation
- [x] README with setup instructions
- [ ] GitHub Actions CI workflow
- [ ] Vercel deployment
- [ ] Production health check
- [x] TestSprite E2E integration (10/10 passing, report available)
- [ ] PR/Merge checklist followed (`docs/PR-CHECKLIST.md`)

### Maintenance Notes

- 2025-12-19: Hook global de pre-serialization para converter Prisma Decimal em `number` e `Date` em ISO string nas respostas `/api`.
- 2025-12-20: ESLint do backend passou sem warnings/erros após ajustes de tipagem e limpeza de `any` explícito.
- 2025-12-20: **Correção Decimal→number movida para service layer** (preSerialization hook não era chamado antes da validação de schema do Fastify). Helpers type-safe em `serializer.ts`, aplicados em todos os services com campos Decimal.

---

## TestSprite E2E Testing

**Status:** Integrated (Current suite passing)

### Test Results (2025-12-18)

**Vitest (Unit Tests):** 68/68 ✅
**Vitest Coverage:** ~58% (target: 80%)
**TestSprite (E2E):** 10/10 ✅ (100%)

### Reports & Plans

- **Test Report:** `testsprite_tests/testsprite-mcp-test-report.md`
- **Plan A (Fix Tests):** `docs/plans/10-testsprite-fix-tests.md`
- **Plan B (OTP Endpoint):** `docs/plans/11-testsprite-otp-endpoint.md`

### Notes

- Earlier TestSprite failures (schema mismatch / tenant error code expectations / OTP dependency) were addressed; Plan A/B remain as reference in `docs/plans/`.

---

## Notes

### E2E Script (Local)

- Script: `scripts/e2e-test.sh`
- Default behavior: exige testes autenticados (falha se `ACCESS_TOKEN` não for obtido)
- Para rodar somente endpoints públicos: `PUBLIC_ONLY=1 ./scripts/e2e-test.sh`
- Para desabilitar a exigência de auth explicitamente: `REQUIRE_AUTH_TESTS=0 ./scripts/e2e-test.sh`

### Critical Implementation Points

1. **Prisma Singleton:** Always use `globalThis` pattern to prevent connection exhaustion in serverless
2. **OTP Storage:** NEVER store in PostgreSQL, only Redis with TTL
3. **Tenant Isolation:** ALL queries MUST filter by `barbershopId`
4. **Pagination:** ALL listing routes MUST implement pagination via `page`/`limit` (defaults ok)
5. **Snapshots:** Store price/commission at transaction time

### Infrastructure

- **Supabase Project:** `shaving-project`
- **Upstash Redis:** `barbershop-saas-cache`
- **Package Manager:** pnpm

---

*Last updated: 2025-12-20*
