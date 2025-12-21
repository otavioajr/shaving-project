# Repository Guidelines

- **No final de cada implementação, colocar um passo a passo do que eu (criador do sistema) preciso fazer para confirmar que está tudo funcionando**

## Análises do projeto sempre que for inicializar uma nova implementação e finalizar
- Sempre análisar os arquivos `docs/CHANGELOG.md` e `docs/DEVELOPMENT.md` antes de qualquer implementação para vermos que passo estamos.
- Sempre que finalizar toda implementação nova, atualizar `docs/CHANGELOG.md` e `docs/DEVELOPMENT.md` no estado que estamos.

## Checklist obrigatório (toda implementação)
- Rodar `pnpm lint` (lint precisa sair **0 errors/0 warnings**).
- Rodar `pnpm test` (suite Vitest passando).
- Se houver mudanças de build/runtime, rodar também `pnpm build`.

## Project Structure & Module Organization
- Monorepo via pnpm; backend in `packages/backend`.
- Entrypoints: `api/index.ts` for Vercel, `src/server.ts` for local using `src/app.ts`.
- `src/` folders: controllers, services, repositories, middleware (tenant/auth/rate limit), lib (Prisma/Redis), schemas/types/utils; tests live beside code.
- Database schema and seeds in `prisma/`; plans and progress in `docs/`.

## Build, Test, and Development Commands
- `pnpm install` to bootstrap; `pnpm dev` runs Fastify with tsx watch.
- `pnpm build` compiles to `dist`; `pnpm start` runs the built server.
- `pnpm lint` / `pnpm lint:fix` run ESLint; keep code warning-free before PRs.
- `pnpm test`, `pnpm test:watch`, `pnpm test:coverage` (80% threshold) run Vitest.
- DB: `pnpm db:generate`, `pnpm db:migrate` (uses `DIRECT_URL`), `pnpm db:push`, `pnpm db:seed`, `pnpm db:studio`.

## Coding Style & Naming Conventions
- TypeScript + ESM, 2-space indent, prefer named exports and single-responsibility files.
- Always use Prisma singleton in `src/lib/prisma.ts` and Redis helper in `src/lib/redis.ts`.
- ESLint: no unused vars (`_` to ignore), `any` discouraged, console only for warn/error.
- Multi-tenant safety: every query filters by `barbershopId`; protected routes require `x-tenant-slug`.
- When adding endpoints, align Swagger/Zod schemas and reuse shared validators.

## Testing Guidelines
- Vitest + Supertest; tests as `*.test.ts`/`*.spec.ts` with setup in `src/__tests__/setup.ts`.
- Target >=80% coverage; unit-test services/repos, integration-test controllers/middleware (tenant/auth/rate limit).
- Mock external providers (Redis/JWT); for DB tests, isolate tenants and reset fixtures.
- Add pagination, tenant header, and health/docs assertions for new routes.

## Commit & Pull Request Guidelines
- Commits: short, imperative, English (e.g., “Add tenant middleware”); one logical change each.
- PRs: summary, linked issue/milestone, commands run (lint/tests), API/env notes, and screenshots/logs when relevant.
- Document new env vars and update `packages/backend/.env.example` accordingly.

## Security & Configuration Tips
- Copy `packages/backend/.env.example` to `.env`; fill `DATABASE_URL`, `DIRECT_URL`, Redis, JWT, `CRON_SECRET` (use Supabase pooler port 6543 in prod).
- OTP codes stay in Redis with TTL; never store in PostgreSQL.
- Enforce pagination (`page`/`limit`) to avoid Vercel timeouts.
- Protect cron endpoints with `CRON_SECRET`; Swagger can stay public but avoid sensitive payloads.
