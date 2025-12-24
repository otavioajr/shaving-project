# Plano 13: Correção de Testes - Mocking em barbershops.test.ts

**Status:** ✅ COMPLETO  
**Prioridade:** Alta  
**Data:** 2025-12-24  
**Issue:** Testes de barbershops usando Prisma/Redis reais sem mocks

---

## 📋 Problema Identificado

O arquivo `packages/backend/src/controllers/__tests__/barbershops.test.ts` está:

1. ❌ **Usando Prisma real** sem mocks - tenta conectar com Postgres real
2. ❌ **Usando Redis real** sem mocks - tenta conectar com Upstash real  
3. ❌ **Mutando dados reais** - usa `prisma.barbershop.update()` diretamente
4. ❌ **Não fecha o app** - falta `afterEach` com `app.close()`
5. ❌ **Inconsistente** - não segue o padrão dos outros testes de controllers

### Impacto

- ⚠️ Testes falham sem credenciais de DB/Redis configuradas
- ⚠️ Estado persistente entre execuções de testes
- ⚠️ Timeouts e falhas de rede
- ⚠️ Inconsistência com padrão do projeto

---

## 🎯 Objetivo

Refatorar `barbershops.test.ts` para seguir o padrão dos outros testes de controllers:
- Mockar Prisma e Redis
- Fechar app após cada teste
- Isolar estado entre testes
- Manter mesma cobertura de testes

---

## 📚 Padrão de Referência

Os testes de `auth.test.ts` e `professionals.test.ts` seguem este padrão:

```typescript
// 1. Mock Redis
vi.mock('../../lib/redis.js', () => ({
  redis: redisMock,
  ipRatelimit: ipRatelimitMock,
  tenantRatelimit: tenantRatelimitMock,
  getCachedTenant,
  // ... outros métodos
}))

// 2. Mock Prisma
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    barbershop: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      // ... outros métodos
    },
    professional: {
      findFirst: vi.fn(),
      create: vi.fn(),
      // ... outros métodos
    },
  },
}))

// 3. Fechar app após cada teste
afterEach(async () => {
  await app.close()
})
```

---

## ✅ Checklist de Implementação

### Fase 1: Setup de Mocks

- [x] Criar mocks para Redis (redisMock, ipRatelimitMock, tenantRatelimitMock)
- [x] Criar mocks para Prisma (barbershop, professional)
- [x] Adicionar `vi.mock()` para `../../lib/redis.js`
- [x] Adicionar `vi.mock()` para `../../lib/prisma.js`
- [x] Remover import direto de `prisma` real

### Fase 2: Refatorar Testes

- [x] **Self-registration tests:**
  - [x] Mock `barbershop.findUnique` para verificar slug único
  - [x] Mock `professional.findFirst` para verificar email único
  - [x] Mock `barbershop.create` com nested `professional.create`
  - [x] Mock `redis.setex` para refresh token storage

- [x] **Public info tests:**
  - [x] Mock `barbershop.findUnique` para retornar barbershop ativo/inativo
  - [x] Remover uso direto de `prisma.barbershop.update()` (linha 225)

- [x] **GET /api/barbershop tests:**
  - [x] Adicionar testes para endpoint protegido GET /api/barbershop
  - [x] Mock `barbershop.findUnique` para buscar barbershop por ID
  - [x] Testar validações de auth e tenant mismatch

- [x] **Update tests:**
  - [x] Mock `barbershop.findUnique` para buscar barbershop
  - [x] Mock `barbershop.update` para atualizar
  - [x] Mock `professional.findFirst` para login de admin/barber

### Fase 3: Cleanup e Isolamento

- [x] Adicionar `afterEach` com `await app.close()`
- [x] Adicionar `vi.clearAllMocks()` no `beforeEach`
- [x] Garantir isolamento entre testes (reset de mocks)

### Fase 4: Validação

- [x] Executar `pnpm test` e garantir todos os testes passando
- [x] Verificar que não há tentativas de conexão real com DB/Redis
- [x] Validar que testes são rápidos e isolados
- [x] Comparar com padrão de `auth.test.ts` e `professionals.test.ts`

---

## 🔧 Estrutura Esperada

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'

// Mocks
const redisMock = { ... }
const ipRatelimitMock = { ... }
const tenantRatelimitMock = { ... }
const getCachedTenant = vi.fn()

vi.mock('../../lib/redis.js', () => ({ ... }))
vi.mock('../../lib/prisma.js', () => ({ ... }))

async function buildTestApp(): Promise<FastifyInstance> {
  const { buildApp } = await import('../../app.js')
  return buildApp({ logger: false })
}

describe('Barbershop Endpoints', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    // Setup mocks defaults
    app = await buildTestApp()
  })

  afterEach(async () => {
    await app.close()
  })

  // ... testes
})
```

---

## 📝 Notas Técnicas

### Mock de Self-Registration

O self-registration cria barbershop + professional em uma transação:

```typescript
// Mock deve retornar estrutura aninhada
barbershopCreate.mockResolvedValueOnce({
  id: 'barbershop-id',
  name: 'Nova Barbearia',
  slug: 'nova-barbearia',
  isActive: true,
  professionals: [{
    id: 'admin-id',
    name: 'Admin Nova',
    email: 'admin@nova.com',
  }],
  createdAt: new Date(),
  updatedAt: new Date(),
})
```

### Mock de Slug/Email Uniqueness

```typescript
// Slug único - não existe
barbershopFindUnique.mockResolvedValueOnce(null)

// Email único - não existe
professionalFindFirst.mockResolvedValueOnce(null)

// Duplicata - já existe
barbershopFindUnique.mockResolvedValueOnce({ id: 'existing-id' })
```

### Mock de Public Info

```typescript
// Barbershop ativo
barbershopFindUnique.mockResolvedValueOnce({
  id: 'id',
  name: 'Barbearia',
  slug: 'barbearia',
  isActive: true,
})

// Barbershop inativo (deve retornar null no service)
barbershopFindUnique.mockResolvedValueOnce({
  id: 'id',
  slug: 'barbearia',
  isActive: false,
})
```

---

## 🚨 Pontos de Atenção

1. **Transação Atômica:** O self-register usa `barbershop.create` com nested `professional.create`. O mock deve refletir isso.

2. **Tenant Middleware:** Como os endpoints públicos bypassam tenant middleware, os mocks de `getCachedTenant` podem não ser necessários para alguns testes.

3. **JWT Signing:** O controller usa `request.server.jwt.sign()`. Isso deve funcionar normalmente com o app mockado.

4. **Refresh Token Storage:** Mockar `authService.saveRefreshToken()` que chama Redis internamente.

---

## ✅ Critérios de Sucesso

- [x] Todos os 20 testes passando (16 originais + 4 novos para GET /api/barbershop)
- [x] Zero tentativas de conexão com DB/Redis reais
- [x] Testes executam rapidamente (< 5s total)
- [x] Estado isolado entre testes
- [x] Padrão consistente com outros testes de controllers
- [x] `pnpm lint` sem erros
- [x] `pnpm test` passando completamente

## 📝 Mudanças Implementadas

1. **Removido:** Import direto de `prisma` real
2. **Adicionado:** Mocks completos para Redis e Prisma
3. **Adicionado:** `afterEach` com `app.close()` para cleanup
4. **Adicionado:** `vi.clearAllMocks()` no `beforeEach` para isolamento
5. **Refatorado:** Todos os testes agora usam mocks
6. **Adicionado:** Testes para GET /api/barbershop (endpoint protegido)
7. **Corrigido:** Mock de `barbershop.findUnique` para suportar busca por slug e ID

---

## 📅 Estimativa

- **Tempo:** 2-3 horas
- **Complexidade:** Média (requer entender mocks e estrutura de dados)

---

## 🔗 Referências

- `packages/backend/src/controllers/__tests__/auth.test.ts` - Padrão de referência
- `packages/backend/src/controllers/__tests__/professionals.test.ts` - Padrão de referência
- `packages/backend/src/controllers/barbershopController.ts` - Controller sendo testado
- `packages/backend/src/services/barbershopService.ts` - Service sendo testado

---

**Última atualização:** 2025-12-24
