# MILESTONE 1: Database Schema & Core Infrastructure

## Pré-Requisitos - Leitura Obrigatória

Antes de iniciar este milestone, LEIA os seguintes arquivos para contexto completo:

1. **[principal-plan.md](principal-plan.md)** - Visão geral do projeto, arquitetura, tech stack e regras críticas
2. **[DEVELOPMENT.md](../DEVELOPMENT.md)** - Status atual dos milestones e o que já foi implementado
3. **[CHANGELOG.md](../CHANGELOG.md)** - Histórico detalhado de todas as mudanças feitas no projeto

---

## Objetivo

Criar schema Prisma completo, aplicar migrations no Supabase, e configurar as bibliotecas core (Prisma singleton e Redis client).

---

## Arquivos a Criar/Modificar

### Arquivos Existentes (já criados no Milestone 0)
- `/packages/backend/prisma/schema.prisma` - Schema já existe, precisa ser validado
- `/packages/backend/src/lib/prisma.ts` - Singleton já existe, precisa ser testado
- `/packages/backend/src/lib/redis.ts` - Client já existe, precisa ser testado

### Tarefas Principais

1. **Validar Schema Prisma**
   - Executar `npx prisma validate`
   - Verificar se todos os modelos estão corretos

2. **Aplicar Migration no Supabase**
   - Usar Supabase MCP para aplicar migration
   - Verificar criação das 6 tabelas:
     - `Barbershop`
     - `Professional`
     - `Client`
     - `Service`
     - `Appointment`
     - `Transaction`

3. **Gerar Prisma Client**
   - Executar `npx prisma generate`
   - Verificar geração dos tipos TypeScript

4. **Testar Bibliotecas Core**
   - Criar testes unitários para Prisma singleton
   - Criar testes unitários para Redis client

---

## Schema Prisma - Entidades

### Enums

```prisma
enum Role {
  ADMIN
  BARBER
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum PaymentMethod {
  CASH
  CREDIT_CARD
  DEBIT_CARD
  PIX
}

enum TransactionType {
  INCOME
  EXPENSE
}
```

### Modelos

**Barbershop (tenant root):**
- `id` (String, @id, @default(uuid()))
- `name` (String)
- `slug` (String, @unique)
- `isActive` (Boolean, @default(true))
- `createdAt` (DateTime, @default(now()))
- `updatedAt` (DateTime, @updatedAt)

**Professional:**
- `id` (String, @id, @default(uuid()))
- `barbershopId` (String, Foreign Key)
- `name` (String)
- `email` (String, @unique)
- `passwordHash` (String)
- `commissionRate` (Decimal)
- `role` (Role)
- `createdAt`, `updatedAt`

**Client:**
- `id` (String, @id, @default(uuid()))
- `barbershopId` (String, Foreign Key)
- `name` (String)
- `phone` (String)
- `pushSubscription` (String?, nullable)
- `createdAt`, `updatedAt`

**Service:**
- `id` (String, @id, @default(uuid()))
- `barbershopId` (String, Foreign Key)
- `name` (String)
- `price` (Decimal)
- `duration` (Int) // em minutos
- `createdAt`, `updatedAt`

**Appointment:**
- `id` (String, @id, @default(uuid()))
- `barbershopId` (String, Foreign Key)
- `professionalId` (String, Foreign Key)
- `clientId` (String, Foreign Key)
- `serviceId` (String, Foreign Key)
- `date` (DateTime)
- `status` (AppointmentStatus)
- `price` (Decimal) // snapshot
- `commissionValue` (Decimal?) // snapshot, calculado quando COMPLETED
- `createdBy` (String, Foreign Key to Professional)
- `createdAt`, `updatedAt`

**Transaction:**
- `id` (String, @id, @default(uuid()))
- `barbershopId` (String, Foreign Key)
- `amount` (Decimal)
- `type` (TransactionType)
- `category` (String)
- `date` (DateTime)
- `createdBy` (String, Foreign Key to Professional)
- `createdAt`, `updatedAt`

---

## Dependências

Todas as dependências já estão instaladas no Milestone 0:
- `@prisma/client`
- `prisma`
- `@upstash/redis`

---

## Checklist de Testes

- [ ] `npx prisma validate` passa sem erros
- [ ] Migration aplicada via Supabase MCP
- [ ] Todas as 6 tabelas criadas no Supabase
- [ ] `npx prisma generate` gera client com sucesso
- [ ] Testes unitários para Prisma singleton passam
- [ ] Testes unitários para Redis client passam
- [ ] Verificar índices criados corretamente
- [ ] Verificar relações de foreign key funcionando

---

## Observações Críticas

1. **Prisma Singleton:** O arquivo `src/lib/prisma.ts` já implementa o padrão singleton usando `globalThis`. Isso é CRÍTICO para evitar esgotamento de conexões no ambiente serverless.

2. **Connection Pooling:** Em produção, usar `DATABASE_URL` com pooler (porta 6543) para queries runtime. `DIRECT_URL` (porta 5432) apenas para migrations.

3. **Tenant Isolation:** Todos os modelos (exceto Barbershop) devem ter `barbershopId` e índices compostos para queries eficientes.

4. **Snapshots:** Appointment armazena `price` e `commissionValue` como snapshots para manter histórico financeiro correto.

5. **Cascading Deletes:** Configurar `onDelete: Cascade` para manter integridade referencial quando um barbershop for deletado.

---

## Próximos Passos

Após completar este milestone, o próximo será:
- **MILESTONE 2:** Fastify App & Core Middleware
