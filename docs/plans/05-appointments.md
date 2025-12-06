# MILESTONE 5: Appointment Management

## Pré-Requisitos - Leitura Obrigatória

Antes de iniciar este milestone, LEIA os seguintes arquivos para contexto completo:

1. **[docs/plans/principal-plan.md](docs/plans/principal-plan.md)** - Visão geral do projeto, arquitetura, tech stack e regras críticas
2. **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Status atual dos milestones e o que já foi implementado
3. **[docs/CHANGELOG.md](docs/CHANGELOG.md)** - Histórico detalhado de todas as mudanças feitas no projeto

---

## Objetivo

Implementar sistema completo de agendamentos com validação de conflitos, transições de status e cálculo automático de comissão quando um agendamento é completado.

---

## Arquivos a Criar

### Repository
1. **`/packages/backend/src/repositories/appointment.repository.ts`**
   - CRUD básico
   - Busca com filtros (date, status, professional)
   - Validação de conflitos

### Service
2. **`/packages/backend/src/services/appointment.service.ts`**
   - Lógica de negócio
   - Validação de conflitos
   - Cálculo de comissão
   - Transições de status

### Controller
3. **`/packages/backend/src/controllers/appointment.controller.ts`**
   - Endpoints REST
   - Validação de requests

### Schema
4. **`/packages/backend/src/schemas/appointment.schema.ts`**
   - Validação Zod

---

## Endpoints

### GET /appointments
- Query params: `page`, `limit`, `date?`, `status?`, `professionalId?`
- Auth: Requerida
- Role: Qualquer
- Retorna: Lista paginada de appointments com filtros

### GET /appointments/:id
- Params: `id`
- Auth: Requerida
- Role: Qualquer
- Retorna: Appointment específico

### POST /appointments
- Body: `{ professionalId, clientId, serviceId, date }`
- Auth: Requerida
- Role: Qualquer
- Retorna: Appointment criado
- **Valida:** Conflitos de horário

### PUT /appointments/:id
- Params: `id`
- Body: `{ date?, status?, professionalId?, clientId?, serviceId? }`
- Auth: Requerida
- Role: Qualquer
- Retorna: Appointment atualizado
- **Valida:** Conflitos ao reagendar

### DELETE /appointments/:id
- Params: `id`
- Auth: Requerida
- Role: Qualquer
- Ação: Cancela appointment (status -> CANCELLED)
- Retorna: 204 No Content

---

## Regras de Negócio

### Validação de Conflitos

**Critérios para conflito:**
- Mesmo `barbershopId`
- Mesmo `professionalId`
- `date` sobrepõe horário existente
- Status NÃO é `CANCELLED`

**Cálculo de sobreposição:**
- Appointment A: `dateA` até `dateA + durationA`
- Appointment B: `dateB` até `dateB + durationB`
- Conflito se: `dateA < dateB + durationB` E `dateB < dateA + durationA`

**Ignorar:**
- Appointments com status `CANCELLED`
- O próprio appointment (em updates)

### Transições de Status

**Status válidos:**
- `PENDING` → `CONFIRMED`, `CANCELLED`
- `CONFIRMED` → `COMPLETED`, `CANCELLED`, `NO_SHOW`
- `COMPLETED` → (final, não pode mudar)
- `CANCELLED` → (final, não pode mudar)
- `NO_SHOW` → (final, não pode mudar)

### Cálculo de Comissão

**Trigger:** Apenas quando status muda para `COMPLETED`

**Fórmula:**
```
commissionValue = price * (commissionRate / 100)
```

**Snapshot:** Armazenar `price` e `commissionValue` no appointment
- `price`: Snapshot do preço do service no momento da criação/compleção
- `commissionValue`: Calculado quando status -> `COMPLETED`

**Fonte de dados:**
- `price`: Do `Service` atual (ou snapshot se já existir)
- `commissionRate`: Do `Professional` atual

---

## Implementação

### Repository - Validação de Conflitos

```typescript
async checkConflict(
  barbershopId: string,
  professionalId: string,
  date: Date,
  duration: number,
  excludeId?: string
): Promise<boolean>
```

**Lógica:**
1. Calcular `endDate = date + duration`
2. Buscar appointments onde:
   - `barbershopId` = X
   - `professionalId` = Y
   - `status != CANCELLED`
   - `id != excludeId` (se fornecido)
   - `date < endDate` AND `date + duration > date`
3. Retornar `true` se encontrar conflito

### Service - Cálculo de Comissão

```typescript
async completeAppointment(
  id: string,
  barbershopId: string
): Promise<Appointment>
```

**Lógica:**
1. Buscar appointment
2. Buscar service atual (para preço)
3. Buscar professional atual (para commissionRate)
4. Calcular `commissionValue = price * (commissionRate / 100)`
5. Atualizar appointment:
   - `status = COMPLETED`
   - `price = service.price` (snapshot)
   - `commissionValue = calculatedValue` (snapshot)

### Service - Criar Appointment

```typescript
async createAppointment(
  data: CreateAppointmentInput,
  barbershopId: string,
  createdBy: string
): Promise<Appointment>
```

**Lógica:**
1. Buscar service para obter `price` e `duration`
2. Validar conflitos
3. Criar appointment com:
   - `price = service.price` (snapshot)
   - `commissionValue = null` (será calculado quando COMPLETED)
   - `status = PENDING`
   - `createdBy = userId`

---

## Filtros

### Por Data
- `date`: Filtrar por data específica (YYYY-MM-DD)
- Retorna appointments do dia

### Por Status
- `status`: Filtrar por status específico
- Valores: `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`

### Por Professional
- `professionalId`: Filtrar appointments de um professional específico

### Combinação
- Todos os filtros podem ser combinados
- Paginação sempre aplicada

---

## Dependências

Todas as dependências já estão instaladas:
- `@prisma/client`
- `zod`
- `date-fns` (para manipulação de datas)

---

## Checklist de Testes

- [ ] Criar appointment funciona
- [ ] Validação de conflito previne double-booking
- [ ] Conflito não ocorre com appointments CANCELLED
- [ ] Reagendar valida novos conflitos
- [ ] Transições de status funcionam corretamente
- [ ] Status inválidos retornam erro
- [ ] Comissão calculada quando status -> COMPLETED
- [ ] Snapshot de price e commissionValue funciona
- [ ] Filtro por data funciona
- [ ] Filtro por status funciona
- [ ] Filtro por professional funciona
- [ ] Filtros combinados funcionam
- [ ] Paginação funciona
- [ ] Cancelar appointment funciona (status -> CANCELLED)
- [ ] Testes unitários passam
- [ ] Testes de integração passam

---

## Observações Críticas

1. **Conflitos:** Validação de conflitos é CRÍTICA para evitar double-booking. Sempre verificar antes de criar/atualizar.

2. **Snapshots:** `price` e `commissionValue` devem ser snapshots para manter histórico financeiro correto mesmo se service/professional mudarem.

3. **Comissão:** Comissão calculada APENAS quando status muda para `COMPLETED`. Não calcular em outros momentos.

4. **Status Transitions:** Validar transições de status para manter consistência de dados.

5. **Performance:** Índices no banco devem incluir `barbershopId`, `professionalId`, `date`, `status` para queries eficientes.

6. **Timezone:** Considerar timezone do barbershop ao trabalhar com datas.

---

## Próximos Passos

Após completar este milestone, o próximo será:
- **MILESTONE 6:** Financial Management

