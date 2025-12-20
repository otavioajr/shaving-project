# Shaving Project Context

## Project Overview

**Shaving Project** is a Multi-Tenant Barbershop Management SaaS Platform designed for zero-cost deployment on Vercel Serverless.

**Key Technologies:**
- **Runtime:** Node.js 22 (LTS) + TypeScript
- **Framework:** Fastify (with `@fastify/aws-lambda` / Vercel adapter)
- **Database:** PostgreSQL (Supabase) with Prisma ORM
- **Caching/Rate Limiting:** Upstash Redis (HTTP/REST)
- **Package Manager:** pnpm
- **Architecture:** Monorepo (currently single backend package)

## Directory Structure

```
/
├── packages/
│   └── backend/           # Core API logic
│       ├── api/           # Vercel entrypoint
│       ├── prisma/        # Database schema, migrations, seed
│       └── src/           # Source code
│           ├── app.ts     # Fastify app factory
│           ├── server.ts  # Local dev server
│           ├── lib/       # Shared clients (Prisma, Redis)
│           ├── middleware/# Auth, Tenant, Rate Limit
│           └── ...        # Controllers, Services, Repositories
├── docs/                  # Project documentation & plans
│   ├── DEVELOPMENT.md     # Current progress & roadmap
│   └── plans/             # Detailed specs for each milestone
├── package.json           # Root workspace config
└── pnpm-workspace.yaml    # Workspace definition
```

## Development Workflow

### Prerequisites
- Node.js 22+
- pnpm 9+
- `.env` file configured in `packages/backend/` (see `.env.example`)

### Common Commands (Run from Root)

| Action | Command | Description |
| :--- | :--- | :--- |
| **Start Dev** | `pnpm dev` | Starts the Fastify server with hot-reload (Port 3000) |
| **Build** | `pnpm build` | Compiles TypeScript |
| **Test** | `pnpm test` | Runs Vitest unit/integration tests |
| **Lint** | `pnpm lint` | Runs ESLint |
| **DB Migrate**| `pnpm db:migrate`| Applies Prisma migrations |
| **DB Seed** | `pnpm db:seed` | Populates DB with test data (Barbershop, Admin, Client) |
| **DB Studio** | `pnpm db:studio` | Opens Prisma Studio GUI |

### API Access

- **Base URL:** `http://localhost:3000`
- **Swagger UI:** `http://localhost:3000/docs` (Public)
- **Health Check:** `http://localhost:3000/health` (Public)

**Multi-Tenancy:**
Most API endpoints require the `x-tenant-slug` header to identify the barbershop.
- Example: `x-tenant-slug: barbearia-teste`

## Key Architectural Patterns

1.  **Tenant Isolation:**
    *   **Strict Rule:** ALL database queries must filter by `barbershopId`.
    *   **RLS:** Row Level Security is enabled in Postgres as a defense-in-depth measure.
    *   **Middleware:** `tenant.ts` validates the slug and injects `tenantId` into the request context.

2.  **Serverless Constraints:**
    *   **Prisma:** Uses a singleton pattern (`src/lib/prisma.ts`) with `globalThis` to prevent connection exhaustion during hot-reloads.
    *   **State:** The application is stateless. All session data (OTP, etc.) is stored in Redis.

3.  **Layered Architecture:**
    *   **Routes:** Define endpoints and validation schemas.
    *   **Controllers:** Handle HTTP request/response logic.
    *   **Services:** Contain business logic.
    *   **Repositories:** Handle direct database interactions.

## Current Status & Roadmap

Refer to `docs/DEVELOPMENT.md` for the single source of truth on progress.

- **Completed:** Scaffolding, Database Schema, Core Infrastructure, Fastify Middleware (Tenant/RateLimit).
- **Current Focus:** Milestone 3 - Authentication (JWT + OTP).
