# MILESTONE 2: Fastify App & Core Middleware

## Pré-Requisitos - Leitura Obrigatória

Antes de iniciar este milestone, LEIA os seguintes arquivos para contexto completo:

1. **[principal-plan.md](principal-plan.md)** - Visão geral do projeto, arquitetura, tech stack e regras críticas
2. **[DEVELOPMENT.md](../DEVELOPMENT.md)** - Status atual dos milestones e o que já foi implementado
3. **[CHANGELOG.md](../CHANGELOG.md)** - Histórico detalhado de todas as mudanças feitas no projeto

---

## Objetivo

Configurar Fastify com plugins essenciais, implementar middleware de validação de tenant e rate limiting, e garantir que os endpoints básicos funcionem corretamente.

---

## Arquivos a Criar/Modificar

### Arquivos Existentes (já criados no Milestone 0)

- `/packages/backend/src/app.ts` - Fastify factory já existe
- `/packages/backend/api/index.ts` - Vercel entrypoint já existe

### Arquivos a Criar

1. **`/packages/backend/src/middleware/tenant.ts`**
   - Validar header `x-tenant-slug`
   - Buscar tenant no banco/cache
   - Injetar `req.tenantId` e `req.tenantSlug`
   - Retornar 404 se tenant inválido ou ausente

2. **`/packages/backend/src/middleware/rateLimit.ts`**
   - Rate limiting por IP (100 req/60s)
   - Rate limiting por tenant (1000 req/60s)
   - Usar Upstash Redis
   - Retornar 429 quando exceder limite

### Arquivos a Modificar

1. **`/packages/backend/src/app.ts`**
   - Registrar middleware de tenant (global)
   - Registrar middleware de rate limiting (global)
   - Garantir que `/health` seja público (sem tenant)
   - Garantir que `/docs` seja público (sem tenant)

---

## Implementação

### Middleware de Tenant

**Localização:** `src/middleware/tenant.ts`

**Funcionalidade:**

- Ler header `x-tenant-slug` da requisição
- Buscar barbershop no banco por `slug`
- Cachear resultado no Redis (TTL 5 minutos)
- Injetar `tenantId` e `tenantSlug` no objeto request
- Retornar 404 se:
  - Header ausente
  - Tenant não encontrado
  - Tenant inativo (`isActive = false`)

**Exceções (rotas públicas):**

- `/health` - Health check
- `/docs` - Swagger UI
- `/` - Root endpoint

### Middleware de Rate Limiting

**Localização:** `src/middleware/rateLimit.ts`

**Funcionalidade:**

- Usar `@upstash/ratelimit` com Redis
- Duas camadas:
  1. Por IP: 100 requisições por 60 segundos
  2. Por Tenant: 1000 requisições por 60 segundos
- Retornar 429 com headers apropriados quando exceder

### Database Security & Performance Improvements

**⚠️ IMPORTANTE:** Pendências identificadas no review do Milestone 1

#### 1. Row Level Security (RLS) - CRITICAL

**Contexto:** Atualmente todas as tabelas estão sem RLS. Como usamos Fastify API (não PostgREST), o isolamento é feito no middleware. Porém, RLS adiciona camada extra de segurança "defense-in-depth" caso haja acesso direto ao banco ou bugs no código.

**Tabelas que precisam de RLS:**

- `barbershops`
- `professionals`
- `clients`
- `services`
- `appointments`
- `transactions`

**Implementação:**

```sql
-- Exemplo para tabela professionals
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Isolamento por tenant"
  ON professionals
  FOR ALL
  USING (barbershopId = current_setting('app.current_tenant')::text);
```

**Estratégia:**

- Criar migration `add_rls_policies.sql`
- Habilitar RLS em todas as tabelas (exceto `_prisma_migrations`)
- Criar políticas que validem `barbershopId`
- Configurar `current_setting('app.current_tenant')` no middleware de tenant

**Referência:** [Supabase RLS Documentation](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public)

#### 2. Performance Indexes - INFO

**Contexto:** As composite foreign keys adicionadas no Milestone 1 precisam de índices para otimizar queries.

**Índices Faltando:**

1. `appointments(barbershopId, createdById)` - Para queries de appointments criados por professional
2. `appointments(barbershopId, serviceId)` - Para queries de appointments por serviço
3. `transactions(barbershopId, createdById)` - Para queries de transações por professional

**Implementação:**

```sql
-- Migration: add_composite_fk_indexes.sql
CREATE INDEX "appointments_barbershopId_createdById_idx"
  ON "appointments"("barbershopId", "createdById");

CREATE INDEX "appointments_barbershopId_serviceId_idx"
  ON "appointments"("barbershopId", "serviceId");

CREATE INDEX "transactions_barbershopId_createdById_idx"
  ON "transactions"("barbershopId", "createdById");
```

**Impacto:**

- Melhora performance de queries que filtram por creator/service
- Reduz full table scans
- Especialmente importante com growth de dados

**Referência:** [Supabase Unindexed FK Documentation](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)

### Endpoints

**GET /health** (público, sem tenant)

- Retornar `{ status: "ok" }`
- Status code 200

**GET /docs** (público, sem tenant)

- Servir Swagger UI
- Status code 200

---

## Dependências

Todas as dependências já estão instaladas:

- `fastify`
- `@fastify/jwt`
- `@fastify/swagger`
- `@fastify/swagger-ui`
- `@fastify/cors`
- `@fastify/cookie`
- `@upstash/ratelimit`

---

## Checklist de Testes

### Middleware

- [ ] `/health` retorna `{ status: "ok" }` (200)
- [ ] `/docs` serve Swagger UI (200)
- [ ] Requisição sem header `x-tenant-slug` retorna 404
- [ ] Requisição com tenant inválido retorna 404
- [ ] Requisição com tenant inativo retorna 404
- [ ] Requisição com tenant válido passa pelo middleware
- [ ] `req.tenantId` e `req.tenantSlug` estão disponíveis após validação
- [ ] Rate limiting por IP funciona (429 após 100 req/60s)
- [ ] Rate limiting por tenant funciona (429 após 1000 req/60s)
- [ ] Cache de tenant funciona (Redis)
- [ ] Testes de integração para middleware passam

### Database Security & Performance

- [ ] RLS habilitado em todas as tabelas (exceto `_prisma_migrations`)
- [ ] Políticas RLS criadas para isolamento por `barbershopId`
- [ ] `current_setting('app.current_tenant')` configurado no middleware
- [ ] Índices compostos criados para composite FKs
- [ ] Supabase Advisors não reporta mais erros CRITICAL de RLS
- [ ] Supabase Advisors não reporta mais warnings de unindexed FKs

---

## Observações Críticas

1. **Tenant Isolation:** O middleware de tenant é FUNDAMENTAL para segurança multi-tenant. Sempre validar antes de qualquer operação de banco.

2. **Performance:** Cache de tenant no Redis reduz queries ao banco. TTL de 5 minutos é um bom equilíbrio entre performance e consistência.

3. **Rate Limiting:** Duas camadas (IP + Tenant) previnem abuso tanto de IPs individuais quanto de tenants específicos.

4. **Rotas Públicas:** `/health` e `/docs` devem ser acessíveis sem tenant para monitoramento e documentação.

5. **TypeScript:** Garantir que os tipos Fastify estejam estendidos corretamente para `tenantId` e `tenantSlug` (já feito no Milestone 0).

6. **Database Security (RLS):** Row Level Security adiciona camada de defesa extra além do middleware. É especialmente importante para:
   - Prevenir acesso direto ao banco (ex: psql, Supabase Studio)
   - Proteção contra bugs no código aplicativo
   - Compliance e auditoria de segurança
   - **ATENÇÃO:** RLS deve ser configurado ANTES de ir para produção

7. **Database Performance (Indexes):** Composite FKs precisam de índices para evitar performance degradation. Queries sem índices podem causar timeouts em produção quando o volume de dados crescer.

---

## Próximos Passos

Após completar este milestone, o próximo será:

- **MILESTONE 3:** Authentication (JWT + OTP)
