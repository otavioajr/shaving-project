# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-Tenant Barbershop SaaS Platform backend built for zero-cost deployment on Vercel Serverless using Supabase (PostgreSQL) and Upstash Redis.

## Tech Stack

- **Runtime:** Node.js (LTS) + TypeScript
- **Framework:** Fastify with Vercel Serverless adapter
- **Database:** PostgreSQL via Supabase with Prisma ORM
- **Cache/Rate Limiting:** Upstash Redis (HTTP/REST)
- **Testing:** Vitest + Supertest
- **Key Libraries:** `zod`, `@fastify/jwt`, `@upstash/ratelimit`, `date-fns`, `web-push`
- **Always create a to-do test for user**

## Architecture

### Serverless Entry Point

- **Monolithic Function Pattern:** All routes centralized in `/api/index.ts` (catch-all) to reduce cold starts
- Must use Fastify adapter for Vercel Serverless

### Multi-Tenant Architecture

- **Tenant Identification:** Global middleware reads `x-tenant-slug` header
  - Validates tenant in database/cache
  - Injects `req.tenantId` into request context
  - Returns 404 if header is missing or invalid
- **All database entities** must be scoped by `barbershopId` (tenant isolation)

### Database Connection Management

**CRITICAL:** Must implement Prisma Singleton pattern in `src/lib/prisma.ts`:
```typescript
global.prisma
```
This prevents connection exhaustion in serverless environment.

**Production:** Configure to use Supabase Connection Pooler (Port 6543)

### Authentication & Security

- **JWT Authentication:**
  - Access Token: 15 min lifetime
  - Refresh Token: 7 days, stored in Redis or HttpOnly Cookie
- **OTP System:** 6-digit codes stored in Upstash Redis (TTL: 5 min) - NEVER in PostgreSQL
- **Rate Limiting:** Middleware using Upstash Redis, limit by IP and tenant

### API Design

- **Pagination Required:** All listing endpoints MUST accept `page` and `limit` parameters (Vercel has 10s timeout limit)
- **Tenant Header:** All requests must include `x-tenant-slug` header

## Data Model

### Enums

- `AppointmentStatus`: `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`
- `PaymentMethod`: `CASH`, `CREDIT_CARD`, `DEBIT_CARD`, `PIX`

### Core Entities

All entities include: `barbershopId`, `createdAt`, `updatedAt`

- **Barbershop:** tenant root (id, name, slug-unique, isActive)
- **Professional:** users (name, email, passwordHash, commissionRate-Decimal, role: ADMIN/BARBER)
- **Client:** customers (name, phone, pushSubscription)
- **Service:** offerings (name, price, duration)
- **Appointment:** bookings with status, price snapshot, commissionValue snapshot, foreign keys to professional/service/client/createdBy
- **Transaction:** financial records (amount, type: INCOME/EXPENSE, category, date, createdBy)

## Business Rules

### Scheduling

- Validate time conflicts considering: `barbershopId`, `professionalId`, and status
- Ignore `CANCELLED` appointments when checking conflicts

### Finance

- Commission calculation triggered ONLY when appointment status → `COMPLETED`
- Persist calculated commission value (snapshot pattern)

### Notifications

- Cron endpoint: `/api/cron/notify` protected by `CRON_SECRET` header
- Configure `vercel.json` to invoke every 1 minute
- Uses Web Push API for client notifications

## Environment Variables

- `DATABASE_URL`: Supabase pooler connection (Port 6543) for runtime queries
- `DIRECT_URL`: Direct connection for Prisma migrations
- `CRON_SECRET`: Secret to protect cron endpoints
- Refer to `.env.example` for complete list

## Project Structure

```
/api/index.ts              # Vercel serverless entrypoint (catch-all)
/src/
  /controllers/            # Request handlers
  /services/               # Business logic
  /repositories/           # Data access layer
  /lib/
    prisma.ts              # Prisma singleton instance
  /middleware/             # Tenant validation, rate limit, auth
```

## Development Commands

When the project is set up, typical commands will be:
- `npm run dev` - Local development
- `npm test` - Run Vitest test suite
- `npm run lint` - Code linting
- `npx prisma migrate dev` - Run database migrations (uses DIRECT_URL)
- `npx prisma generate` - Generate Prisma Client

## Critical Implementation Notes

1. **Always use Prisma Singleton** - Direct instantiation will exhaust connections
2. **Never store OTP in PostgreSQL** - Use Redis with TTL
3. **All queries must filter by barbershopId** - Multi-tenant isolation is security-critical
4. **Snapshot financial data** - Store price/commission at transaction time
5. **Require pagination parameters** - Prevent Vercel timeouts on large datasets