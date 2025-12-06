# Barbershop SaaS Platform

Multi-Tenant Barbershop Management Platform built for zero-cost deployment on Vercel Serverless.

## Tech Stack

- **Runtime:** Node.js 22 (LTS) + TypeScript
- **Framework:** Fastify with Vercel Serverless adapter
- **Database:** PostgreSQL via Supabase with Prisma ORM
- **Cache/Rate Limiting:** Upstash Redis (HTTP/REST)
- **Testing:** Vitest + Supertest
- **Documentation:** Swagger (OpenAPI 3.0)

## Project Structure

```
shaving-project/
├── packages/
│   └── backend/           # Backend API
│       ├── api/           # Vercel serverless entrypoint
│       ├── prisma/        # Database schema and migrations
│       └── src/
│           ├── controllers/
│           ├── services/
│           ├── repositories/
│           ├── middleware/
│           ├── lib/       # Prisma, Redis clients
│           └── types/
├── docs/                  # Documentation
│   └── DEVELOPMENT.md     # Development progress tracking
├── package.json           # Root workspace
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- Supabase account (PostgreSQL)
- Upstash account (Redis)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd shaving-project

# Install dependencies
pnpm install

# Copy environment variables
cp packages/backend/.env.example packages/backend/.env
# Edit .env with your credentials

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
```

### Environment Variables

See `packages/backend/.env.example` for all required variables:

- `DATABASE_URL` - Supabase pooler connection (port 6543)
- `DIRECT_URL` - Direct connection for migrations
- `UPSTASH_REDIS_REST_URL` - Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN` - Redis REST token
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `CRON_SECRET` - Secret for cron endpoint protection

## Development

```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Lint code
pnpm lint

# Open Prisma Studio
pnpm db:studio
```

## API Documentation

When the server is running, access Swagger UI at:

```
http://localhost:3000/docs
```

## Multi-Tenant Architecture

All requests (except public endpoints) require the `x-tenant-slug` header:

```bash
curl -H "x-tenant-slug: my-barbershop" http://localhost:3000/api/...
```

### Public Endpoints

- `GET /health` - Health check
- `GET /docs` - Swagger UI
- `POST /barbershops` - Self-registration

## Deployment

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd packages/backend
vercel
```

Configure environment variables in Vercel dashboard.

## License

MIT
