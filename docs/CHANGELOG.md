# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **Plans Structure:** Criada estrutura de planos individuais por milestone em `docs/plans/`
  - `principal-plan.md` - Plano principal com visão geral completa do projeto
  - `01-database-schema.md` - Plano detalhado do Milestone 1
  - `02-fastify-middleware.md` - Plano detalhado do Milestone 2
  - `03-authentication.md` - Plano detalhado do Milestone 3
  - `04-crud-entities.md` - Plano detalhado do Milestone 4
  - `05-appointments.md` - Plano detalhado do Milestone 5
  - `06-financial.md` - Plano detalhado do Milestone 6
  - `07-notifications.md` - Plano detalhado do Milestone 7
  - `08-barbershop-management.md` - Plano detalhado do Milestone 8
  - `09-testing-deployment.md` - Plano detalhado do Milestone 9
- Cada plano inclui seção obrigatória de pré-requisitos com links para `principal-plan.md`, `DEVELOPMENT.md` e `CHANGELOG.md`

### Next Steps
- Milestone 1: Database Schema & Core Infrastructure
- Milestone 2: Fastify App & Core Middleware

---

## [0.1.0] - 2025-12-06

### Milestone 0: Project Scaffolding - COMPLETE ✅

#### Added

**Root Monorepo Structure:**
- `package.json` - Root workspace configuration with pnpm scripts
- `pnpm-workspace.yaml` - pnpm workspaces configuration
- `.gitignore` - Comprehensive ignore rules for Node.js, build outputs, env files
- `.nvmrc` - Node.js 22 LTS version specification
- `README.md` - Project overview, getting started guide, and API documentation
- `docs/DEVELOPMENT.md` - Milestone tracking document
- `docs/CHANGELOG.md` - This changelog file

**Backend Package Structure (`packages/backend/`):**

*Configuration Files:*
- `package.json` - Dependencies and npm scripts for backend
  - Runtime: fastify, @fastify/jwt, @fastify/swagger, @fastify/cors, @fastify/cookie
  - Database: @prisma/client, prisma
  - Cache: @upstash/redis, @upstash/ratelimit
  - Validation: zod
  - Auth: bcryptjs, web-push
  - Testing: vitest, supertest
  - Dev tools: tsx, typescript, eslint
- `tsconfig.json` - TypeScript strict configuration with ES2022 target
- `vitest.config.ts` - Test configuration with 80% coverage threshold
- `vercel.json` - Vercel serverless deployment with cron configuration
- `eslint.config.js` - ESLint flat config with TypeScript rules
- `.env.example` - Environment variables template with detailed comments

*Core Application:*
- `src/app.ts` - Fastify application factory
  - CORS support with credentials
  - JWT authentication (@fastify/jwt)
  - Cookie support (@fastify/cookie)
  - Swagger/OpenAPI 3.0 documentation
  - Health check endpoint
  - Root endpoint with API info
- `src/server.ts` - Local development server (port 3000)
- `api/index.ts` - Vercel serverless entrypoint with Fastify adapter

*Core Libraries:*
- `src/lib/prisma.ts` - **Prisma Singleton Pattern**
  - Uses `globalThis` to prevent connection exhaustion in serverless
  - Development logging (query, error, warn)
  - Production logging (error only)
- `src/lib/redis.ts` - Upstash Redis client with helpers
  - IP-based rate limiting (100 req/60s)
  - Tenant-based rate limiting (1000 req/60s)
  - OTP storage/verification (5-minute TTL)
  - Refresh token storage (7-day TTL)
  - Tenant cache (5-minute TTL)

*Type Definitions:*
- `src/types/index.ts` - TypeScript type definitions
  - `PaginationParams` interface
  - `PaginatedResult<T>` interface
  - `AuthenticatedUser` interface
  - Fastify type extensions (tenantId, tenantSlug)
  - @fastify/jwt type extensions (JWT payload)

*Database Schema:*
- `prisma/schema.prisma` - Complete Prisma schema
  - **Enums:** Role, AppointmentStatus, PaymentMethod, TransactionType
  - **Models:**
    - `Barbershop` (tenant root)
    - `Professional` (users with role and commission rate)
    - `Client` (customers with push subscription)
    - `Service` (offerings with price and duration)
    - `Appointment` (bookings with price/commission snapshots)
    - `Transaction` (financial records)
  - **Indexes:** Optimized for multi-tenant queries
  - **Cascading deletes:** Tenant isolation enforcement

*Folder Structure:*
- `src/controllers/` - Empty, ready for route handlers
- `src/services/` - Empty, ready for business logic
- `src/repositories/` - Empty, ready for data access layer
- `src/middleware/` - Empty, ready for middleware
- `src/schemas/` - Empty, ready for Zod schemas
- `src/utils/` - Empty, ready for utility functions
- `src/__tests__/` - Test setup configuration

#### Verified

- ✅ `pnpm install` - 494 packages installed successfully
- ✅ `pnpm db:generate` - Prisma client generated
- ✅ `pnpm build` - TypeScript compilation successful
- ✅ `pnpm lint` - ESLint passes without errors
- ✅ Development server starts and runs
- ✅ `GET /health` - Returns `{"status":"ok"}` (200)
- ✅ `GET /` - Returns API info (200)
- ✅ `GET /docs` - Swagger UI accessible (200)

#### Technical Decisions

1. **Package Manager:** pnpm (fast, disk-efficient, great for monorepos)
2. **Prisma Singleton:** Implemented `globalThis` pattern to prevent connection exhaustion in Vercel serverless
3. **OTP Storage:** Redis-only with TTL (NEVER PostgreSQL)
4. **Rate Limiting:** Dual-layer (IP + Tenant) using Upstash
5. **Swagger:** OpenAPI 3.0 with tags for organized documentation
6. **TypeScript:** Strict mode with ES2022 target
7. **Testing:** Vitest with 80% coverage threshold

#### Infrastructure Setup

- **Supabase:** Project `shaving-project` (ref: vsbvxitmupvoljopzbek) - ready, no tables yet
- **Upstash Redis:** Database `barbershop-saas-cache` - ready and configured
- **Node Version:** 22 LTS
- **Deployment Target:** Vercel Serverless

---

## Project Metadata

**Started:** 2025-12-06
**Current Version:** 0.1.0
**Status:** Milestone 0 Complete, Milestone 1 Pending

### Key Architecture Principles

1. **Multi-Tenant Isolation:** All entities scoped by `barbershopId`
2. **Zero-Cost Deployment:** Optimized for Vercel/Supabase/Upstash free tiers
3. **Serverless-First:** Connection pooling, singleton patterns, stateless design
4. **Type Safety:** End-to-end TypeScript with strict mode
5. **API-First:** Swagger documentation from day one
