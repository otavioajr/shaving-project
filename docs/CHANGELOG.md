# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Changed

- **Refactor:** NotificationService - Use Prisma.GetPayload for type-safe relations (2025-12-23)
  - Replaced manual `AppointmentWithRelations` interface with Prisma-generated type
  - Removed unnecessary type assertion `as Promise<AppointmentWithRelations[]>`
  - Improved type safety by using Prisma's native type generation
  - Removed unused imports: `Appointment`, `Professional`, `Service`

### Added

- **Milestone 7: Notifications (Web Push + Cron) - COMPLETE** (2025-12-23)
  - **New Service:** `NotificationService` (singleton pattern)
    - `sendNotification()` - Send push notifications via web-push library
    - `sendAppointmentReminder()` - Format and send appointment reminders
    - `processReminders()` - Cron job logic to find and notify upcoming appointments
    - Error handling for expired (410) and invalid (404) subscriptions
  - **New Endpoint:** `POST /api/cron/notify` (protected by CRON_SECRET header)
    - Finds CONFIRMED appointments in next 15-minute window
    - Sends push notifications to clients with valid subscriptions
    - Returns statistics: `{ sent: number, errors: number }`
  - **New Schema:** `notification.schema.ts` with Zod validators
    - `pushSubscriptionSchema` - Validates Web Push subscription format
    - `notificationPayloadSchema` - Validates notification content
  - **Middleware Updates:**
    - Added `/api/cron` bypass in `tenantMiddleware` (no tenant header required)
    - Added `/api/cron` bypass in `rateLimitMiddleware` (no rate limiting)
  - **Tests:** 16 new tests (10 unit + 6 integration) covering:
    - Subscription validation (valid/invalid formats)
    - Push notification sending (success and error cases)
    - Error handling (410 Gone, 404 Not Found, 429 Rate Limit)
    - Appointment reminder formatting
    - Cron endpoint authentication and processing
  - **All Tests:** 124/124 passing ✅
  - **Lint:** 0 errors/0 warnings ✅

- **Prettier & Code Formatting Tooling** (2025-12-22)
  - Added Prettier v3.7.4 for consistent code formatting
  - Configured with: no semicolons, single quotes, 2-space indent, 100 print width
  - Added `eslint-config-prettier` to disable conflicting ESLint rules
  - Added EditorConfig (`.editorconfig`) for cross-IDE consistency
  - Added husky + lint-staged for pre-commit formatting enforcement
  - New scripts: `pnpm format`, `pnpm format:check`
  - Files: `.prettierrc`, `.prettierignore`, `.editorconfig`, `.husky/pre-commit`

- **Milestone 6: Financial Reports - COMPLETE** (2025-12-23)
  - **New Endpoints:**
    - `GET /api/reports/summary` - Aggregated financial summary (income, expenses, net, appointments)
    - `GET /api/reports/commissions` - Commission breakdown by professional
  - **Logic:**
    - Aggregation of transactions by type/category
    - Calculation of appointment revenue and commissions
    - Date range validation (max 365 days, from <= to)
  - **Tests:** Added `src/controllers/__tests__/reports.test.ts` covering auth, validation, and aggregations

- **Milestone 5: Appointment Management - COMPLETE** (2025-12-23)
  - **JWT Authentication Required:** Added `requireAuth` middleware to ALL appointment routes (GET, POST, PUT, PATCH, DELETE)
  - **Swagger Security Schemas:** Added `security: [{ bearerAuth: [] }]` and 401/403 response schemas to all appointment endpoints
  - **Tenant Mismatch Validation:** Added `user.barbershopId !== tenantId` check in all appointment controller methods (returns 403 Tenant mismatch)
  - **Status Transition State Machine:** Implemented validation for appointment status transitions
    - PENDING → CONFIRMED | CANCELLED
    - CONFIRMED → COMPLETED | CANCELLED | NO_SHOW
    - COMPLETED/CANCELLED/NO_SHOW are final states (no further transitions allowed)
    - Invalid transitions return 400 with descriptive error message
  - **Soft Delete via Cancellation:** DELETE endpoint now cancels appointments (sets status=CANCELLED) instead of physically deleting
    - Preserves audit history
    - Respects state machine (only PENDING/CONFIRMED can be cancelled)
    - Returns 400 when attempting to delete final state appointments
  - **Commission Calculation:** Fixed to calculate ONLY when transitioning TO COMPLETED (not if already completed)
  - **Comprehensive Tests:** Added `src/controllers/__tests__/appointments.test.ts` covering:
    - Authentication requirements (401 when no JWT)
    - Tenant mismatch scenarios (403)
    - Date range filtering in list endpoint
    - Appointment creation with/without conflicts
    - CANCELLED appointments excluded from conflict checks
    - Valid and invalid status transitions
    - Commission calculation on COMPLETED transition
    - Cancellation via DELETE (soft delete)

- RBAC aplicado no CRUD de Professionals/Services (ADMIN vs BARBER), com self-update restrito a name/email/password.
- Autenticação obrigatória também nos endpoints GET de professionals/clients/services.
- Soft delete (`isActive=false`) para professionals/clients/services com filtros de listagem apenas ativos.
- Testes de controllers para CRUD de professionals/clients/services.

### Fixed

- **Cron notification performance optimization** (2025-12-23)
  - Changed `processReminders()` to send appointment reminders in parallel with limited concurrency (5)
  - Replaced sequential `for...of` loop with concurrent execution to reduce cron job execution time
  - Maintains non-abortive behavior: collects all results even if some fail
  - Invalid subscriptions are still properly removed after all reminders are processed
- **Tenant scoping in commission report professionals lookup** (2025-12-23)
  - Added `barbershopId` filter when fetching professionals for commission aggregation
- **Cron secret comparison hardened** (2025-12-23)
  - Use constant-time comparison for `CRON_SECRET` validation to reduce timing attack risk
- **Cron notify error handling** (2025-12-23)
  - Return generic error message in production to avoid leaking internal details
  - Detailed error messages remain available in dev/test environments for debugging
  - Added error logging with `request.log.error()` for server-side debugging
  - Added success logging with statistics (`{ sent, errors }`) after processing reminders
- **Push subscription JSON null handling** (2025-12-23)
  - Use `Prisma.DbNull` for clearing and filtering client push subscriptions

- **Appointment Update Final-State Response** (2025-12-23)
  - Map attempts to update COMPLETED/CANCELLED/NO_SHOW appointments to 400 in `appointmentController.update`
  - Prevents expected business-rule violations from returning 500

- **Proteção de Rotas de Transações (GET)** (2025-12-22)
  - **Problema:** Rotas GET `/api/transactions` e `/api/transactions/:id` não exigiam autenticação JWT, permitindo acesso apenas com `x-tenant-slug`.
  - **Solução:** Adicionado middleware `requireAuth` e validação de tenant match no `transactionController`.
  - **Arquivos modificados:**
    - `src/routes/transactions.ts`: Adicionado `preHandler: requireAuth` e schemas de segurança.
    - `src/controllers/transactionController.ts`: Adicionado check de auth e tenant mismatch em `list()` e `getById()`.
  - **Testes:** Novo arquivo `src/controllers/__tests__/transactions.test.ts` cobrindo cenários 401 e 403.

- **Correção de serialização Decimal nos Services** (2025-12-20)
  - **Problema:** Endpoints com campos `Decimal` (professionals, services, appointments, transactions) retornavam erro 500 porque Fastify valida o response schema ANTES do hook `preSerialization`
  - **Solução:** Movido a conversão `Decimal → number` para o **service layer** (antes de retornar ao controller)
  - **Arquivos modificados:**
    - `src/lib/serializer.ts` - Novos helpers type-safe: `serializeProfessional()`, `serializeService()`, `serializeAppointmentWithRelations()`, `serializeTransactionWithRelations()`
    - `src/services/professionalService.ts` - Usa `serializeProfessional()`
    - `src/services/serviceService.ts` - Usa `serializeService()`
    - `src/services/appointmentService.ts` - Usa `serializeAppointmentWithRelations()` (serializa também nested relations)
    - `src/services/transactionService.ts` - Usa `serializeTransactionWithRelations()` (serializa também nested relations)
  - **Validação:** E2E tests 34/34 ✅, Vitest 68/68 ✅, Lint 0 errors ✅
- ESLint do backend agora passa sem warnings/erros (remoção de `any` explícito, ajustes de controllers/services e tipagem de testes).
- E2E script agora falha quando `ACCESS_TOKEN` não é obtido (testes autenticados obrigatórios) e reporta testes pulados com clareza.
- Script `pnpm start` do backend agora aponta para o arquivo correto gerado pelo build (`dist/src/server.js`).

### Docs

- Alinhado `docs/DEVELOPMENT.md` e `docs/QUICK-TEST.md` com o estado atual do backend (status de milestones, números de testes/cobertura e TestSprite).
- Corrigidos links relativos em `docs/plans/*.md` para navegação correta.
- Documentado `pnpm lint` como verificação obrigatória em toda implementação (README e QUICK-TEST).
- Adicionado checklist de PR/merge ("Definition of Done") em `docs/PR-CHECKLIST.md`.
- **TestSprite MCP E2E Run** (2025-12-23)
  - Executado TestSprite MCP de ponta a ponta no backend
  - Regenerado `code_summary.json` com documentação OpenAPI completa de todas as features
  - Gerado novo `testsprite_backend_test_plan.json` com 10 test cases
  - Resultado: **1/10 testes passando** (TC009 - Barbershop GET/PUT)
  - **Root cause dos 9 falhos:** Credenciais incorretas nos testes gerados (`admin@barbearia.com` vs `admin@barbearia-teste.com`)
  - Report consolidado: `packages/backend/testsprite_tests/testsprite-mcp-test-report.md`
  - **Nota:** Créditos do TestSprite esgotados durante re-execução com credenciais corretas

### Next Steps

- Milestone 6: adicionar endpoints de summary/commission report e testes
- Milestone 8: proteger update de barbershop com auth/RBAC
- Milestone 9: CI (lint/test), deploy Vercel e elevar cobertura para >= 80%

---

## [0.3.1] - 2025-12-07

### Database Seed Script - COMPLETE ✅

#### Added

**Seed Script:**

- `prisma/seed.ts` - Development database seeder
  - Idempotent script (safe to run multiple times)
  - Creates 1 barbershop with slug `barbearia-teste`
  - Creates 2 professionals (admin + barber with credentials)
  - Creates 1 test client
  - Creates 3 services (Corte, Barba, Corte+Barba)
  - Uses `DIRECT_URL` to bypass connection pooler (avoids prepared statement cache issues)
  - Outputs test credentials for manual API testing

**Documentation:**

- Updated `docs/QUICK-TEST.md` with seed instructions and credential info
- Added "Testar com Dados de Seed" section with example curl requests
- Clear steps in preamble: install → db:generate → **db:seed** → dev

#### Technical Details

- **Idempotency:** Script checks if data exists before creating (uses `findUnique`/`findFirst`)
- **Connection:** Uses `DIRECT_URL` environment variable to avoid Supabase pooler prepared statement cache
- **Error Handling:** Tries/catch with proper `prisma.$disconnect()` cleanup
- **Output:** Clear console logs (✅ created, ✓ already exists) + test credentials summary

#### Verified

- ✅ `pnpm db:seed` runs successfully (first execution)
- ✅ `pnpm db:seed` is idempotent (second execution shows ✓ already exists)
- ✅ Barbershop slug `barbearia-teste` is created and ready for API tests
- ✅ Test credentials are printed and ready for use

---

## [0.3.0] - 2025-12-07

### Milestone 2: Fastify App & Core Middleware - COMPLETE ✅

#### Added

**Middleware:**

- `src/middleware/tenant.ts` - Tenant validation middleware
  - Validates `x-tenant-slug` header
  - Caches tenant lookups in Redis (5-minute TTL)
  - Injects `tenantId` and `tenantSlug` into request context
  - Returns 404 for missing/invalid/inactive tenants
  - Skips validation for public routes (`/health`, `/docs`, `/`)
- `src/middleware/rateLimit.ts` - Rate limiting middleware
  - IP-based rate limiting (100 requests per 60 seconds)
  - Tenant-based rate limiting (1000 requests per 60 seconds)
  - Uses Upstash Redis for distributed rate limiting
  - Returns 429 with appropriate headers when limits exceeded
  - Skips rate limiting for public routes

**Database Migrations:**

- `prisma/migrations/20251207085846_add_rls_and_indexes/migration.sql` - RLS and performance indexes
  - Enabled Row Level Security (RLS) on all tables (barbershops, professionals, clients, services, appointments, transactions)
  - Created RLS policies for tenant isolation using `current_setting('app.current_tenant')`
  - Added composite indexes for performance:
    - `appointments(barbershopId, createdById)` - Optimizes queries filtering by creator
    - `appointments(barbershopId, serviceId)` - Optimizes queries filtering by service
    - `transactions(barbershopId, createdById)` - Optimizes queries filtering by creator
  - Policies designed to work with Prisma in serverless (fallback to application-level filtering)

**Application Updates:**

- Updated `src/app.ts` to register global middlewares
  - Tenant middleware registered first (validates tenant before rate limiting)
  - Rate limit middleware registered second
  - Public routes (`/health`, `/docs`, `/`) bypass both middlewares

**Tests:**

- `src/middleware/__tests__/tenant.test.ts` - 9 unit tests for tenant middleware
  - Tests public route skipping
  - Tests missing header handling
  - Tests invalid/inactive tenant handling
  - Tests caching behavior
  - Tests tenant injection into request context
- `src/middleware/__tests__/rateLimit.test.ts` - 8 unit tests for rate limit middleware
  - Tests public route skipping
  - Tests IP rate limiting
  - Tests tenant rate limiting
  - Tests header detection (x-forwarded-for, x-real-ip)
  - Tests 429 response with headers
- `src/middleware/__tests__/integration.test.ts` - 10 integration tests
  - Tests public routes accessibility
  - Tests tenant middleware integration with Fastify
  - Tests rate limit middleware integration
  - Tests caching behavior in real requests
  - Tests tenant injection in route handlers

#### Verified

- ✅ Middleware registered and working in Fastify app
- ✅ Public routes (`/health`, `/docs`, `/`) accessible without tenant header
- ✅ Tenant validation returns 404 for missing/invalid tenants
- ✅ Rate limiting returns 429 when limits exceeded
- ✅ Tenant caching works (Redis lookup before database)
- ✅ RLS enabled on all tables
- ✅ Composite indexes created for performance
- ✅ `npm test` - All middleware tests passing (27 tests total)

#### Technical Details

- **Middleware Order:** Tenant validation → Rate limiting (both global hooks)
- **Cache Strategy:** Tenant lookups cached for 5 minutes in Redis
- **Rate Limits:** IP (100/60s), Tenant (1000/60s) using sliding window
- **RLS Strategy:** Defense-in-depth - primary isolation via application code, RLS adds protection for direct database access
- **IP Detection:** Supports `x-forwarded-for`, `x-real-ip`, and direct `request.ip`
- **Error Responses:** Consistent 404 for tenant errors, 429 for rate limit errors

---

## [0.2.0] - 2025-12-06

### Milestone 1: Database Schema & Core Infrastructure - COMPLETE ✅

#### Added

**Database Migrations:**

- `prisma/migrations/20251206133233_init/migration.sql` - Initial migration creating all database tables, enums, indexes, and foreign keys
  - 6 tables: `barbershops`, `professionals`, `clients`, `services`, `appointments`, `transactions`
  - 4 enums: `Role`, `AppointmentStatus`, `PaymentMethod`, `TransactionType`
  - Cascading foreign keys for tenant isolation
  - Composite indexes for multi-tenant query optimization

**Unit Tests:**

- `src/__tests__/prisma.test.ts` - 5 tests verifying schema structure and migration integrity
  - Validates schema contains all enums and models
  - Verifies PostgreSQL datasource configuration
  - Confirms Prisma client generator setup
  - Validates cascading deletes
- `src/__tests__/redis.test.ts` - 18 tests for Redis client and all helpers
  - Tests OTP storage/verification (5-minute TTL)
  - Tests refresh token management (7-day TTL)
  - Tests tenant cache helpers (5-minute TTL)
  - Tests IP and tenant rate limiters
  - Full coverage of all Redis helper functions

#### Verified

- ✅ `npx prisma validate` - Schema is valid
- ✅ Migration created and applied to Supabase
- ✅ All 6 tables created with correct structure
- ✅ All indexes created for query optimization
- ✅ Foreign keys with CASCADE deletes working
- ✅ `npx prisma generate` - Prisma Client generated successfully
- ✅ `npm test` - 23 tests passing (5 Prisma + 18 Redis)
- ✅ Unit tests cover core library functionality

#### Technical Details

- **Migration File:** Prisma auto-generated migration from schema changes
- **Enums:** All 4 business enums created as PostgreSQL custom types
- **Indexes:** 12 composite and single-column indexes created for performance
- **Foreign Keys:** 8 foreign key constraints with proper cascade rules
- **Constraints:** Unique constraints for `slug` and composite `(barbershopId, email/phone)`
- **Data Types:** Decimals for prices/commissions, JSONB for push subscriptions, TIMESTAMP for audit fields

---

## [0.1.1] - 2025-12-06

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

_Configuration Files:_

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

_Core Application:_

- `src/app.ts` - Fastify application factory
  - CORS support with credentials
  - JWT authentication (@fastify/jwt)
  - Cookie support (@fastify/cookie)
  - Swagger/OpenAPI 3.0 documentation
  - Health check endpoint
  - Root endpoint with API info
- `src/server.ts` - Local development server (port 3000)
- `api/index.ts` - Vercel serverless entrypoint with Fastify adapter

_Core Libraries:_

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

_Type Definitions:_

- `src/types/index.ts` - TypeScript type definitions
  - `PaginationParams` interface
  - `PaginatedResult<T>` interface
  - `AuthenticatedUser` interface
  - Fastify type extensions (tenantId, tenantSlug)
  - @fastify/jwt type extensions (JWT payload)

_Database Schema:_

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

_Folder Structure:_

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
**Current Version:** 0.3.0
**Status:** Milestone 0 Complete, Milestone 1 Complete, Milestone 2 Complete, Milestone 3 Pending

### Key Architecture Principles

1. **Multi-Tenant Isolation:** All entities scoped by `barbershopId`
2. **Zero-Cost Deployment:** Optimized for Vercel/Supabase/Upstash free tiers
3. **Serverless-First:** Connection pooling, singleton patterns, stateless design
4. **Type Safety:** End-to-end TypeScript with strict mode
5. **API-First:** Swagger documentation from day one
