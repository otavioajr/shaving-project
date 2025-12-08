# Copilot Instructions

Multi-tenant Barbershop SaaS backend using Fastify, Prisma, and Upstash Redis, deployed on Vercel Serverless.

## Architecture Overview

```
api/index.ts          → Vercel catch-all entrypoint (monolithic function pattern)
src/app.ts            → Fastify app builder with middleware chain
src/routes/           → Route definitions with Swagger schemas
src/controllers/      → Request validation (Zod) + delegation to services
src/services/         → Business logic layer
src/repositories/     → Prisma data access (always filter by barbershopId)
src/middleware/       → tenant.ts → auth.ts → rateLimit.ts (execution order)
src/lib/              → prisma.ts (singleton), redis.ts (OTP, cache, rate limit)
```

## Critical Patterns

### Multi-Tenant Isolation (SECURITY-CRITICAL)
Every database query MUST filter by `barbershopId`. The tenant is resolved via `x-tenant-slug` header → cached in Redis → injected as `request.tenantId`.

```typescript
// ✅ CORRECT - Always include barbershopId
prisma.client.findFirst({ where: { id, barbershopId } })

// ❌ WRONG - Never query without tenant scope
prisma.client.findFirst({ where: { id } })
```

### Prisma Singleton (prevents connection exhaustion)
Always import from `src/lib/prisma.ts` - never instantiate `new PrismaClient()` directly.

### Pagination Required
All list endpoints must accept `page` and `limit` params (Vercel 10s timeout). See `src/repositories/clientRepository.ts` for standard pattern.

### OTP/Tokens in Redis Only
Never store OTP codes or refresh tokens in PostgreSQL. Use helpers in `src/lib/redis.ts`:
- `storeOTP()`, `verifyOTP()` - 5 min TTL
- `storeRefreshToken()`, `verifyRefreshToken()` - 7 day TTL

## Request Flow

1. `tenantMiddleware` - validates `x-tenant-slug`, returns 404 if missing/invalid, injects `request.tenantId`
2. `authMiddleware` - verifies JWT, sets `request.user` (doesn't reject - routes decide if auth required)
3. `rateLimitMiddleware` - dual-layer IP (100/min) + tenant (1000/min) rate limiting

Public routes (skip middleware): `/health`, `/docs`, `/`

## Adding New Endpoints

1. **Repository** (`src/repositories/`) - data access with `barbershopId` filtering
2. **Service** (`src/services/`) - business logic, validation, call repository
3. **Controller** (`src/controllers/`) - Zod validation, extract `request.tenantId`, call service
4. **Route** (`src/routes/`) - Swagger schema, bind controller methods
5. **Register** in `src/app.ts` with `/api` prefix

## Development Commands

```bash
pnpm dev              # Local dev with hot reload (tsx watch)
pnpm test             # Run Vitest
pnpm test:coverage    # 80% threshold
pnpm db:migrate       # Prisma migrations (uses DIRECT_URL)
pnpm db:seed          # Seeds: barbearia-teste, admin@barbearia-teste.com / senha123
pnpm db:studio        # Prisma Studio GUI
```

## Testing Patterns

- Tests live beside code: `*.test.ts` or `*.spec.ts`
- Mock `src/lib/prisma` and `src/lib/redis` using `vi.mock()`
- See `src/middleware/__tests__/tenant.test.ts` for middleware testing pattern
- Test with tenant isolation: each test should use unique `barbershopId`

## Environment Variables

Essential vars (see `packages/backend/.env.example`):
- `DATABASE_URL` - Supabase pooler (port 6543)
- `DIRECT_URL` - Direct connection for migrations
- `UPSTASH_REDIS_REST_URL/TOKEN` - Redis for cache/rate limit/OTP
- `JWT_SECRET` - Minimum 32 characters
- `CRON_SECRET` - Protects `/api/cron/*` endpoints

## Business Rules

- **Appointments**: Validate time conflicts by `barbershopId` + `professionalId`, ignore `CANCELLED` status
- **Commissions**: Calculate only when status → `COMPLETED`, store as snapshot in `commissionValue`
- **Price snapshots**: Copy service price to appointment at booking time (not referenced dynamically)

## Após implementações

No final de cada implementação, incluir passo a passo de validação para o criador do sistema confirmar que está funcionando.
