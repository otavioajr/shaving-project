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
| 0 | **COMPLETE** | Project Scaffolding |
| 1 | Pending | Database Schema & Core Infrastructure |
| 2 | Pending | Fastify App & Core Middleware |
| 3 | Pending | Authentication (JWT + OTP) |
| 4 | Pending | CRUD (Professionals, Clients, Services) |
| 5 | Pending | Appointment Management |
| 6 | Pending | Financial Management |
| 7 | Pending | Notifications (Web Push + Cron) |
| 8 | Pending | Barbershop Management |
| 9 | Pending | Testing, Docs & Deployment |

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

**Status:** Pending

### Checklist

- [ ] Apply database migration via Supabase MCP
- [ ] Verify all 6 tables created
- [ ] Generate Prisma client
- [ ] Unit tests for Prisma singleton
- [ ] Unit tests for Redis client

---

## Milestone 2: Fastify App & Core Middleware

**Status:** Pending

### Checklist

- [ ] Tenant validation middleware
- [ ] Rate limiting middleware (IP + tenant)
- [ ] Integration tests for middleware
- [ ] `/health` endpoint test
- [ ] `/docs` Swagger UI test

---

## Milestone 3: Authentication (JWT + OTP)

**Status:** Pending

### Checklist

- [ ] Auth service (OTP, tokens, password)
- [ ] Auth controller (login, OTP, refresh, logout)
- [ ] Auth middleware (JWT verification, roles)
- [ ] Unit tests for auth service
- [ ] Integration tests for auth endpoints

---

## Milestone 4: CRUD (Professionals, Clients, Services)

**Status:** Pending

### Checklist

- [ ] Professional repository, service, controller
- [ ] Client repository, service, controller
- [ ] Service repository, service, controller
- [ ] Pagination implementation
- [ ] Role-based access control
- [ ] Swagger documentation
- [ ] Unit and integration tests

---

## Milestone 5: Appointment Management

**Status:** Pending

### Checklist

- [ ] Appointment repository, service, controller
- [ ] Conflict validation logic
- [ ] Status transitions
- [ ] Commission calculation on COMPLETED
- [ ] Filtering (date, status, professional)
- [ ] Tests

---

## Milestone 6: Financial Management

**Status:** Pending

### Checklist

- [ ] Transaction CRUD
- [ ] Financial summary endpoint
- [ ] Commission report endpoint
- [ ] Tests

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

**Status:** Pending

### Checklist

- [ ] Self-registration endpoint
- [ ] Seed script (`prisma/seed.ts`)
- [ ] Barbershop update endpoint
- [ ] Slug validation
- [ ] Tests

---

## Milestone 9: Testing, Docs & Deployment

**Status:** Pending

### Checklist

- [ ] Test coverage >= 80%
- [ ] Complete Swagger documentation
- [ ] README with setup instructions
- [ ] GitHub Actions CI workflow
- [ ] Vercel deployment
- [ ] Production health check

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
