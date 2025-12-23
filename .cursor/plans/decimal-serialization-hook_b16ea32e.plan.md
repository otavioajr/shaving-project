---
name: decimal-serialization-hook
overview: Garantir que todas as respostas JSON em /api serializem Prisma Decimal como number (e Date como ISO string), alinhando runtime com os schemas Fastify/OpenAPI e evitando drop/mistyping de campos como price/amount/commissionRate/commissionValue.
todos:
  - id: add-preSerialization-hook
    content: Adicionar hook global preSerialization em packages/backend/src/app.ts aplicando serializeResponse apenas para rotas /api.
    status: completed
  - id: add-integration-test
    content: Criar teste Vitest com app.inject validando Decimal→number e Date→ISO em resposta /api com schema number.
    status: completed
  - id: run-lint-and-tests
    content: Executar pnpm test e pnpm lint para garantir que a mudança não introduziu regressões.
    status: completed
  - id: update-docs
    content: Atualizar docs/CHANGELOG.md, docs/DEVELOPMENT.md e README.md registrando a correção de serialização.
    status: completed
  - id: manual-validation-steps
    content: Documentar (na entrega) o passo a passo de validação local via curl/Swagger conforme AGENTS.md.
    status: completed
---

# Correção global de serialização (Prisma Decimal → number)

## Contexto e causa raiz

- Hoje os controllers retornam registros do Prisma (e estruturas que os contêm) diretamente via `reply.send(...)`.
- Campos `Decimal` do Prisma (ex.: `Service.price`, `Professional.commissionRate`, `Appointment.price`, `Appointment.commissionValue`, `Transaction.amount`) **não são `number` nativos** em runtime. Quando serializados, viram **string** ou podem ser incompatíveis com o serializer gerado a partir do schema.
- Os schemas das rotas declaram esses campos como `number` (ex.: `packages/backend/src/routes/appointments.ts`), então a resposta **pode ficar fora de contrato** e o Fastify/fast-json-stringify pode omitir ou tipar incorretamente o campo.

## Estratégia escolhida

Aplicar a conversão **uma única vez, de forma centralizada**, usando um hook global `preSerialization` que roda antes do Fastify serializar a resposta.

- Reaproveitar o utilitário existente `serializeResponse` em `packages/backend/src/lib/serializer.ts` (já converte `Decimal` para `number` e `Date` para ISO):
- `if (obj instanceof Decimal) return obj.toNumber()`
- `if (obj instanceof Date) return obj.toISOString()`

## Mudanças de código (implementação)

1. **Adicionar hook global `preSerialization` no app**

- Arquivo: `packages/backend/src/app.ts`
- Importar `serializeResponse`.
- Registrar um `app.addHook('preSerialization', ...)` que:
  - Só rode para respostas sob `request.url` que comecem com `/api` (evita overhead em `/docs/json`).
  - Retorne `serializeResponse(payload)`.

2. **Manter controllers como estão (sem duplicação)**

- Sem necessidade de “embrulhar” cada `reply.send(...)` nos controllers, já que o hook cobre todo `/api`.

## Testes (para evitar regressão)

1. **Adicionar teste de integração do hook** (Vitest + `app.inject`)

- Criar um teste que registra uma rota de teste em `/api/test-decimal` com schema de resposta exigindo `number`.
- Retornar no handler um payload contendo `new Decimal('10.50')` e `new Date(...)`.
- Validar que `response.json()` retorna `amount` como `number` e datas como `string` ISO.
- Reaproveitar o padrão de mocks já usado em `packages/backend/src/middleware/__tests__/integration.test.ts` para:
  - `getCachedTenant` retornar tenant válido.
  - `ipRatelimit.limit`/`tenantRatelimit.limit` retornarem `success: true`.

2. **Rodar suite atual**

- `pnpm test` (root) ou `pnpm -C packages/backend test`.
- `pnpm lint` para garantir que o import novo não quebra regras.

## Atualização de documentação (obrigatório no repo)

1. `docs/CHANGELOG.md`

- Em `[Unreleased]`, adicionar item em **Fixed** explicando: “API agora serializa Decimals do Prisma como números em respostas `/api` para alinhar com schemas.”

2. `docs/DEVELOPMENT.md`

- Registrar essa correção como ajuste técnico dentro do milestone atual (Testing/Docs/Deployment) ou uma nota de manutenção (bugfix) com data.

3. `README.md`

- Adicionar uma linha curta em “API / Swagger” ou “Notes” dizendo que campos monetários/percentuais armazenados como Decimal no banco são retornados como `number` na API.

## Passo a passo para você validar localmente (manual)

- Subir o backend (`pnpm dev`).
- Chamar um endpoint com Decimal e conferir tipo no JSON:
- `GET /api/services` → `price` deve vir como número.
- `GET /api/professionals` → `commissionRate` deve vir como número.
- `GET /api/appointments/:id` → `price` e `commissionValue` como número (quando existir).
