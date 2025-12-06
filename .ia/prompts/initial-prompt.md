Act as a Senior Software Architect (Tech Lead). We’re starting the development of the **Backend** for a **Multi-Tenant Barbershop SaaS Platform**.

**Goal:** Build a robust, scalable Node.js Backend focused on **Zero Cost** (Free Tier), ready to be deployed on **Vercel (Serverless)**.

---

### 1. Tech Stack & Infrastructure
- **Runtime:** Node.js (LTS) + TypeScript  
- **Framework:** Fastify (use the adapter for Vercel Serverless)  
- **Entrypoint:** Use the **Monolithic Function** pattern in `/api/index.ts` (catch-all) to centralize routes and reduce cold start.  
- **Database:** PostgreSQL via **Supabase**  
  - **CRITICAL:** Implement the **Prisma Singleton** pattern (`global.prisma`) to avoid connection exhaustion.  
  - The code must be prepared to use the **Supabase Connection Pooler** (Port 6543) in production.  
- **Cache & Rate Limit:** **Upstash Redis** (via HTTP/REST)  
- **Tests:** Vitest + Supertest  
- **CI:** GitHub Actions (Lint + Test)  
- **Libs:** `zod` (validation), `@fastify/jwt`, `@upstash/ratelimit`, `date-fns`, `web-push`  

---

### 2. Multi-Tenant Architecture & Security
- **Tenant Identification:**
  - Global middleware: Read the `x-tenant-slug` header. Validate it in the database/cache. Inject `req.tenantId`.  
  - If the header is missing or invalid -> return 404 error.  
- **Rate Limiting:** Implement middleware using **Upstash Redis** to limit requests per IP and per tenant.  
- **Authentication (JWT):**
  - **Access Token:** Short-lived (15 min).  
  - **Refresh Token:** Long-lived (7 days), stored in Redis or HttpOnly Cookie.  
  - **Secure Fake OTP:** Generate a 6-digit numeric code, save it in **Upstash** (TTL 5 min). Validate via Redis. (Do NOT store OTP in Postgres.)  
- **Pagination:** Listing routes MUST require `page` and `limit` to avoid Vercel timeouts (10s limit).

---

### 3. Prisma Schema (Refined SaaS)
- **Enums:**
  - `AppointmentStatus`: `['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']`  
  - `PaymentMethod`: `['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX']`  

- **Entities** (All must have `barbershopId`, `createdAt`, `updatedAt`):
  - **Barbershop:** id, name, slug (unique), isActive  
  - **Professional:** id, name, email, passwordHash, commissionRate (Decimal), role (ADMIN/BARBER)  
  - **Client:** id, name, phone, pushSubscription  
  - **Service:** id, name, price, duration  
  - **Appointment:** id, date, status (Enum), price (snapshot), commissionValue (snapshot), professionalId, serviceId, clientId, createdBy (User ID)  
  - **Transaction:** id, amount, type (INCOME/EXPENSE), category, date, createdBy  

---

### 4. Business Rules
- **Scheduling:** Validate time conflicts respecting `barbershopId`, `professionalId` and status (ignore cancelled appointments).  
- **Finance:**
  - Calculate commission only when status changes to `COMPLETED`. Persist the calculated value.  
- **Notifications (Vercel Cron):**
  - Create a `/api/cron/notify` route protected by a `CRON_SECRET` header.  
  - Configure `vercel.json` to call this route every 1 minute.  

---

### 5. Initial Deliverables
1. `package.json` with scripts and dependencies  
2. Folder structure: `/api/index.ts` (entrypoint), `/src/controllers`, `/src/services`, `/src/repositories`  
3. Complete and refined `schema.prisma`  
4. `PrismaClient` Singleton setup (`src/lib/prisma.ts`)  
5. Tenant middleware and Rate Limit configuration (Upstash)  
6. `.env.example` file (explaining `DATABASE_URL` vs `DIRECT_URL` for migrations)  
