# Plan 12: Fix ESLint (backend) to Pass CI

## Prerequisites

Before executing this plan, read:

1. **[DEVELOPMENT.md](../DEVELOPMENT.md)** - Current milestone status
2. **[CHANGELOG.md](../CHANGELOG.md)** - Recent changes (optional)

---

## Objective

Make `pnpm --filter @shaving/backend lint` pass by fixing the current **ESLint errors** (not necessarily all warnings).

This plan is intentionally scoped to:

- Fix only what is required for lint to pass (errors)
- Avoid mixing unrelated refactors in the “TestSprite fixes” PR

---

## Current State (Problem)

Running:

```bash
pnpm --filter @shaving/backend lint
```

The backend currently fails lint mainly due to:

- `@typescript-eslint/no-unused-vars` (unused `error` in `catch`)
- `no-useless-catch` (try/catch that only re-throws)
- `@typescript-eslint/no-unused-vars` for unused `passwordHash` after destructuring
- `no-console` (disallows `console.log`, allows only `console.warn`/`console.error`)

There are also many warnings about `any` (`@typescript-eslint/no-explicit-any`), but they are **not required** to get lint green if we focus strictly on errors.

---

## Scope

### In-scope (lint errors)

Fix errors in:

- `packages/backend/src/middleware/auth.ts`
- `packages/backend/src/controllers/authController.ts`
- `packages/backend/src/controllers/barbershopController.ts`
- `packages/backend/src/controllers/professionalController.ts`
- `packages/backend/src/services/authService.ts`

### Out-of-scope (optional follow-up)

Reduce warnings by removing `any` usage via proper Fastify type augmentation for:

- `request.tenantId` / `request.tenantSlug`
- `request.user`

This is useful, but should be a separate (optional) follow-up PR to keep scope controlled.

---

## Implementation Steps (Option A: Minimal — make lint pass)

### 1) Fix unused catch variable (`no-unused-vars`)

**Files:**

- `packages/backend/src/middleware/auth.ts`
- `packages/backend/src/controllers/authController.ts` (refresh: inner `catch`)

**Change:**

- Replace `catch (error)` with `catch {}` (or `catch (_error)` if you need the variable later).

Example:

```ts
try {
  await request.jwtVerify()
} catch {
  // ignore
}
```

### 2) Remove useless try/catch wrappers (`no-useless-catch`)

**Files:**

- `packages/backend/src/controllers/authController.ts` (`logout`)
- `packages/backend/src/controllers/barbershopController.ts` (`get`)

**Change:**

- Remove try/catch that does only `throw error`.
- Keep error handling only where it actually maps error types to responses.

### 3) Fix unused `passwordHash` destructuring (`no-unused-vars`)

**File:**

- `packages/backend/src/controllers/professionalController.ts`

**Change:**

```ts
const { passwordHash: _passwordHash, ...professionalData } = professional
return reply.status(200).send(professionalData)
```

### 4) Fix disallowed console usage (`no-console`)

**File:**

- `packages/backend/src/services/authService.ts`

**Change:**

- Replace `console.log(...)` with `console.warn(...)`, or guard it with environment check:

```ts
if (process.env.NODE_ENV !== 'production') {
  console.warn(`OTP for ${email}: ${otp}`)
}
```

---

## Implementation Steps (Option B: Reduce warnings — optional)

### 1) Add Fastify request type augmentation

Goal: remove repetitive `(request as any)` by defining typed properties once.

Suggested file:

- `packages/backend/src/types/fastify.d.ts` (or similar, depending on existing structure)

Define:

- `tenantId?: string`
- `tenantSlug?: string`
- `user?: { id: string; barbershopId: string; role: string; email?: string }`

Then update controllers/middlewares to stop using `any`.

---

## Verification Checklist

1. Lint green:

```bash
pnpm --filter @shaving/backend lint
```

2. Unit tests still passing:

```bash
pnpm --filter @shaving/backend test
```

3. (Optional) Start server and smoke-check:

```bash
pnpm --filter @shaving/backend dev
curl -i http://localhost:3000/health
```

---

## Step-by-step for the creator to confirm everything is working

1. Pull the branch locally and install deps:

```bash
pnpm install
```

2. Run lint:

```bash
pnpm --filter @shaving/backend lint
```

3. Run backend tests:

```bash
pnpm --filter @shaving/backend test
```

4. (Optional) Run backend locally:

```bash
pnpm --filter @shaving/backend dev
curl -i http://localhost:3000/health
```
