# Multi-Tenant Barbershop SaaS Backend - Implementation Plan

## Overview

**Project:** Multi-Tenant Barbershop SaaS Platform Backend
**Architecture:** Monorepo (backend first, frontend later)
**Package Manager:** pnpm (with workspaces)
**Deployment:** Vercel Serverless (Zero Cost)
**Database:** Supabase PostgreSQL (project: `shaving-project`)
**Cache:** Upstash Redis (`barbershop-saas-cache`)

---

## Current State

- **Project structure:** Only configuration/documentation files exist
- **Supabase:** Project exists, NO tables created yet
- **Upstash Redis:** Database `barbershop-saas-cache` ready
- **MCP Servers:** Supabase and Upstash configured and operational

---

## Milestones

### MILESTONE 0: Project Scaffolding

**Objective:** Set up monorepo structure, dependencies, and tooling.

**Deliverables:**
```
/packages/backend/
  /api/index.ts              # Vercel entrypoint
  /src/
    /controllers/
    /services/
    /repositories/
    /lib/
      prisma.ts              # Singleton pattern
      redis.ts               # Upstash client
    /middleware/
    /types/
    app.ts                   # Fastify factory
  /prisma/schema.prisma
  package.json
  tsconfig.json
  vitest.config.ts
  vercel.json
  .env.example
/docs/DEVELOPMENT.md         # Milestone tracking
/package.json                # Root workspace
/pnpm-workspace.yaml         # pnpm workspaces config
/README.md
```

**Dependencies:**
- `fastify`, `@fastify/jwt`, `@fastify/swagger`, `@fastify/swagger-ui`, `@fastify/cors`, `@fastify/cookie`
- `@prisma/client`, `prisma`
- `@upstash/redis`, `@upstash/ratelimit`
- `zod`, `date-fns`, `web-push`, `bcryptjs`
- `vitest`, `supertest`, `typescript`, `tsx`

**Tests:**
- [x] `pnpm install` succeeds
- [x] `pnpm build` succeeds
- [x] `pnpm lint` passes
- [x] Health check endpoint works

---

### MILESTONE 1: Database Schema & Core Infrastructure

**Objective:** Create Prisma schema, apply migrations, set up core libs.

**Prisma Schema (Entities):**
- `Barbershop` (tenant root): id, name, slug (unique), isActive
- `Professional`: id, name, email, passwordHash, commissionRate, role (ADMIN/BARBER)
- `Client`: id, name, phone, pushSubscription
- `Service`: id, name, price, duration
- `Appointment`: id, date, status, price, commissionValue, FK relations
- `Transaction`: id, amount, type (INCOME/EXPENSE), category, date

**Enums:** `Role`, `AppointmentStatus`, `PaymentMethod`, `TransactionType`

**Files to Create:**
- `/packages/backend/prisma/schema.prisma`
- `/packages/backend/src/lib/prisma.ts` (Singleton)
- `/packages/backend/src/lib/redis.ts`

**Tests:**
- [ ] `prisma validate` passes
- [ ] Migration applies via Supabase MCP
- [ ] All 6 tables created
- [ ] Prisma client generates

---

### MILESTONE 2: Fastify App & Core Middleware

**Objective:** Set up Fastify, Swagger, tenant validation, rate limiting.

**Components:**
- `src/app.ts` - Fastify factory with plugins (cors, jwt, swagger)
- `api/index.ts` - Vercel serverless handler
- `src/middleware/tenant.ts` - Validate `x-tenant-slug`, inject `req.tenantId`
- `src/middleware/rateLimit.ts` - Upstash rate limiting (IP + tenant)

**Endpoints:**
- `GET /health` - Health check (public)
- `GET /docs` - Swagger UI

**Tests:**
- [ ] `/health` returns `{ status: 'ok' }`
- [ ] `/docs` serves Swagger UI
- [ ] Missing tenant header returns 404
- [ ] Invalid tenant returns 404
- [ ] Valid tenant passes through
- [ ] Rate limiting returns 429 on excess

---

### MILESTONE 3: Authentication (JWT + OTP)

**Objective:** Implement JWT auth with Redis-based OTP.

**Components:**
- `src/services/auth.service.ts` - OTP, tokens, password hashing
- `src/controllers/auth.controller.ts` - Auth endpoints
- `src/middleware/auth.ts` - JWT verification, role-based access

**Endpoints:**
- `POST /auth/login` - Email/password login
- `POST /auth/request-otp` - Request OTP (stored in Redis, TTL 5min)
- `POST /auth/verify-otp` - Verify OTP, issue tokens
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Invalidate refresh token

**Token Config:**
- Access Token: 15 minutes
- Refresh Token: 7 days (stored in Redis)
- OTP: 6-digit, Redis TTL 5 minutes

**Tests:**
- [ ] OTP stored in Redis (NOT PostgreSQL)
- [ ] OTP verification works
- [ ] Access token expires in 15min
- [ ] Refresh token works
- [ ] Protected routes require auth
- [ ] Role-based access enforced

---

### MILESTONE 4: CRUD (Professionals, Clients, Services)

**Objective:** Implement CRUD with tenant isolation and pagination.

**Pattern:** Controller -> Service -> Repository

**Endpoints (all paginated with `page`, `limit`):**

**Professionals:**
- `GET /professionals` - List
- `GET /professionals/:id` - Get
- `POST /professionals` - Create (ADMIN)
- `PUT /professionals/:id` - Update
- `DELETE /professionals/:id` - Soft delete (ADMIN)

**Clients:**
- `GET /clients` - List
- `GET /clients/:id` - Get
- `POST /clients` - Create
- `PUT /clients/:id` - Update
- `DELETE /clients/:id` - Soft delete

**Services:**
- `GET /services` - List
- `GET /services/:id` - Get
- `POST /services` - Create (ADMIN)
- `PUT /services/:id` - Update (ADMIN)
- `DELETE /services/:id` - Soft delete (ADMIN)

**Tests:**
- [ ] All CRUD operations work
- [ ] Pagination works (page, limit, totalPages)
- [ ] Tenant isolation enforced
- [ ] Role-based access enforced
- [ ] Swagger docs complete

---

### MILESTONE 5: Appointment Management

**Objective:** Implement appointments with conflict validation and commission calculation.

**Endpoints:**
- `GET /appointments` - List (filter by date, status, professional)
- `GET /appointments/:id` - Get
- `POST /appointments` - Create (with conflict check)
- `PUT /appointments/:id` - Update/reschedule
- `DELETE /appointments/:id` - Cancel

**Business Rules:**
- Conflict validation: Check `barbershopId`, `professionalId`, `date` overlap
- Ignore `CANCELLED` appointments in conflict check
- Commission calculated ONLY when status -> `COMPLETED`
- Price and commission are snapshots (persisted at creation/completion)

**Tests:**
- [ ] Create appointment works
- [ ] Conflict detection prevents double-booking
- [ ] Status transitions work
- [ ] Commission calculated on COMPLETED
- [ ] Filters work (date, status, professional)

---

### MILESTONE 6: Financial Management

**Objective:** Implement transactions and financial reports.

**Endpoints:**
- `GET /transactions` - List (filter by date, type, category)
- `GET /transactions/:id` - Get
- `POST /transactions` - Create
- `PUT /transactions/:id` - Update
- `DELETE /transactions/:id` - Delete
- `GET /reports/summary` - Financial summary by period
- `GET /reports/commissions` - Commission report by professional

**Tests:**
- [ ] CRUD for transactions works
- [ ] Summary calculation correct
- [ ] Commission report aggregates correctly
- [ ] Decimal precision maintained

---

### MILESTONE 7: Notifications (Web Push + Cron)

**Objective:** Implement push notifications with Vercel Cron.

**Components:**
- `src/services/notification.service.ts` - Web Push
- `api/cron/notify.ts` - Cron endpoint

**Cron Config (vercel.json):**
```json
{
  "crons": [{ "path": "/api/cron/notify", "schedule": "* * * * *" }]
}
```

**Tests:**
- [ ] Push subscription saved
- [ ] Push notification sent
- [ ] Cron protected by CRON_SECRET
- [ ] Reminders sent for upcoming appointments

---

### MILESTONE 8: Barbershop Management

**Objective:** Implement tenant creation/management with dual onboarding.

**Admin Setup Strategy:**
1. **Seed Script:** CLI command (`pnpm seed`) for initial/controlled setup
2. **Self-Registration:** Public endpoint for SaaS growth

**Endpoints:**
- `POST /barbershops` - Self-registration (create barbershop + initial ADMIN)
- `GET /barbershops/:slug` - Public tenant info
- `PUT /barbershops` - Update current tenant (ADMIN)

**Seed Script:** `/packages/backend/prisma/seed.ts`
- Creates initial barbershop with ADMIN user
- Configurable via environment variables

**Tests:**
- [ ] Self-registration creates barbershop + ADMIN
- [ ] Seed script creates initial data
- [ ] Unique slug validation works
- [ ] Slug format: lowercase, alphanumeric, hyphens only

---

### MILESTONE 9: Testing, Docs & Deployment

**Objective:** Complete test coverage, documentation, CI/CD.

**Deliverables:**
- Test coverage >= 80%
- Complete Swagger documentation
- Updated README with setup instructions
- DEVELOPMENT.md with all milestones marked complete
- GitHub Actions CI (lint + test)
- Production deployment on Vercel

**Tests:**
- [ ] All tests pass
- [ ] Coverage >= 80%
- [ ] CI pipeline passes
- [ ] Vercel deployment succeeds

---

## Critical Files

| File | Purpose |
|------|---------|
| `/packages/backend/src/lib/prisma.ts` | Prisma singleton (CRITICAL for serverless) |
| `/packages/backend/prisma/schema.prisma` | Complete data model |
| `/packages/backend/src/middleware/tenant.ts` | Multi-tenant isolation |
| `/packages/backend/src/app.ts` | Fastify app factory |
| `/packages/backend/api/index.ts` | Vercel entrypoint |

---

## Environment Variables

```bash
# Supabase
DATABASE_URL="postgresql://...pooler:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...direct:5432/postgres"

# Upstash Redis
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."

# JWT
JWT_SECRET="min-32-characters"

# Web Push (VAPID)
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:..."

# Cron
CRON_SECRET="..."

# General
API_URL="https://..."
NODE_ENV="development"
```

---

## Notes

1. **Prisma Singleton:** MUST use `globalThis` pattern to prevent connection exhaustion
2. **OTP:** NEVER store in PostgreSQL, only Redis with TTL
3. **Tenant Isolation:** ALL queries MUST filter by `barbershopId`
4. **Pagination:** ALL listing routes MUST require `page` and `limit`
5. **Snapshots:** Store price/commission at transaction time

