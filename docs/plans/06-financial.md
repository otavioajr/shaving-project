# MILESTONE 6: Financial Management

## Pré-Requisitos - Leitura Obrigatória

Antes de iniciar este milestone, LEIA os seguintes arquivos para contexto completo:

1. **[principal-plan.md](principal-plan.md)** - Visão geral do projeto, arquitetura, tech stack e regras críticas
2. **[DEVELOPMENT.md](../DEVELOPMENT.md)** - Status atual dos milestones e o que já foi implementado
3. **[CHANGELOG.md](../CHANGELOG.md)** - Histórico detalhado de todas as mudanças feitas no projeto

---

## Objetivo

Implementar sistema completo de transações financeiras e relatórios (resumo financeiro e relatório de comissões por professional).

---

## Arquivos a Criar

### Repository
1. **`/packages/backend/src/repositories/transaction.repository.ts`**
   - CRUD básico
   - Busca com filtros (date, type, category)
   - Agregações para relatórios

### Service
2. **`/packages/backend/src/services/transaction.service.ts`**
   - Lógica de negócio
   - Cálculos de relatórios

### Controller
3. **`/packages/backend/src/controllers/transaction.controller.ts`**
   - Endpoints CRUD de transações
   - Endpoints de relatórios

### Schema
4. **`/packages/backend/src/schemas/transaction.schema.ts`**
   - Validação Zod

---

## Endpoints

### Transactions CRUD

**GET /transactions**
- Query params: `page`, `limit`, `dateFrom?`, `dateTo?`, `type?`, `category?`
- Auth: Requerida
- Role: Qualquer
- Retorna: Lista paginada de transactions com filtros

**GET /transactions/:id**
- Params: `id`
- Auth: Requerida
- Role: Qualquer
- Retorna: Transaction específica

**POST /transactions**
- Body: `{ amount, type, category, date }`
- Auth: Requerida
- Role: Qualquer
- Retorna: Transaction criada

**PUT /transactions/:id**
- Params: `id`
- Body: `{ amount?, type?, category?, date? }`
- Auth: Requerida
- Role: Qualquer
- Retorna: Transaction atualizada

**DELETE /transactions/:id**
- Params: `id`
- Auth: Requerida
- Role: Qualquer
- Retorna: 204 No Content

### Reports

**GET /reports/summary**
- Query params: `dateFrom`, `dateTo` (obrigatórios)
- Auth: Requerida
- Role: Qualquer
- Retorna: Resumo financeiro do período

**GET /reports/commissions**
- Query params: `dateFrom`, `dateTo` (obrigatórios), `professionalId?`
- Auth: Requerida
- Role: Qualquer
- Retorna: Relatório de comissões por professional

---

## Modelo de Dados

### Transaction

**Campos:**
- `id`: String (UUID)
- `barbershopId`: String (FK)
- `amount`: Decimal (valor da transação)
- `type`: TransactionType (`INCOME` ou `EXPENSE`)
- `category`: String (categoria livre, ex: "Salário", "Aluguel", "Material")
- `date`: DateTime (data da transação)
- `createdBy`: String (FK para Professional)
- `createdAt`, `updatedAt`: DateTime

**Tipos:**
- `INCOME`: Receita (valores positivos)
- `EXPENSE`: Despesa (valores positivos, mas tipo indica despesa)

---

## Relatórios

### Financial Summary

**Endpoint:** `GET /reports/summary?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`

**Response:**
```typescript
{
  period: {
    from: Date,
    to: Date
  },
  income: {
    total: number,
    count: number,
    byCategory: { [category: string]: number }
  },
  expenses: {
    total: number,
    count: number,
    byCategory: { [category: string]: number }
  },
  net: number, // income.total - expenses.total
  appointments: {
    completed: number,
    totalRevenue: number, // soma de price dos appointments COMPLETED
    totalCommissions: number // soma de commissionValue dos appointments COMPLETED
  }
}
```

**Lógica:**
1. Buscar transactions no período
2. Separar por `type` (INCOME/EXPENSE)
3. Agrupar por `category`
4. Buscar appointments COMPLETED no período
5. Calcular totais

### Commission Report

**Endpoint:** `GET /reports/commissions?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD&professionalId?=uuid`

**Response:**
```typescript
{
  period: {
    from: Date,
    to: Date
  },
  professionals: [
    {
      id: string,
      name: string,
      email: string,
      commissionRate: number,
      appointmentsCompleted: number,
      totalCommissions: number,
      totalRevenue: number // soma de price dos appointments
    }
  ],
  totals: {
    professionals: number,
    appointmentsCompleted: number,
    totalCommissions: number,
    totalRevenue: number
  }
}
```

**Lógica:**
1. Buscar appointments COMPLETED no período
2. Filtrar por `professionalId` se fornecido
3. Agrupar por professional
4. Calcular totais por professional
5. Calcular totais gerais

---

## Implementação

### Repository - Agregações

```typescript
async getSummaryByPeriod(
  barbershopId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<SummaryData>

async getCommissionsByPeriod(
  barbershopId: string,
  dateFrom: Date,
  dateTo: Date,
  professionalId?: string
): Promise<CommissionData[]>
```

### Service - Cálculos

**Precisão Decimal:**
- Usar `Decimal` do Prisma para cálculos monetários
- Arredondar para 2 casas decimais na apresentação
- Manter precisão completa no banco

**Validações:**
- `amount` deve ser positivo
- `date` deve estar dentro do período válido
- `category` não pode ser vazio

---

## Filtros

### Por Data
- `dateFrom`: Data inicial (YYYY-MM-DD)
- `dateTo`: Data final (YYYY-MM-DD)
- Retorna transactions no intervalo

### Por Tipo
- `type`: `INCOME` ou `EXPENSE`
- Filtra por tipo de transação

### Por Categoria
- `category`: String (busca parcial)
- Filtra por categoria

### Combinação
- Todos os filtros podem ser combinados
- Paginação sempre aplicada

---

## Dependências

Todas as dependências já estão instaladas:
- `@prisma/client`
- `zod`
- `date-fns`

---

## Checklist de Testes

### Transactions CRUD
- [ ] Listar transactions com paginação funciona
- [ ] Buscar transaction por ID funciona
- [ ] Criar transaction funciona
- [ ] Atualizar transaction funciona
- [ ] Deletar transaction funciona
- [ ] Filtro por data funciona
- [ ] Filtro por tipo funciona
- [ ] Filtro por categoria funciona
- [ ] Filtros combinados funcionam
- [ ] Isolamento por tenant funciona

### Financial Summary
- [ ] Resumo calculado corretamente
- [ ] Income total correto
- [ ] Expenses total correto
- [ ] Net calculado corretamente
- [ ] Agrupamento por categoria funciona
- [ ] Appointments COMPLETED incluídos
- [ ] Período validado (dateFrom < dateTo)
- [ ] Precisão decimal mantida

### Commission Report
- [ ] Relatório agrupa por professional
- [ ] Comissões calculadas corretamente
- [ ] Revenue total por professional correto
- [ ] Totais gerais corretos
- [ ] Filtro por professionalId funciona
- [ ] Período validado
- [ ] Apenas appointments COMPLETED incluídos

### Validações
- [ ] Amount deve ser positivo
- [ ] Date deve ser válida
- [ ] Category não pode ser vazio
- [ ] Type deve ser INCOME ou EXPENSE

---

## Observações Críticas

1. **Precisão Decimal:** Sempre usar `Decimal` do Prisma para valores monetários. Nunca usar `number` (float) para evitar erros de precisão.

2. **Snapshots:** Appointments já têm snapshots de `price` e `commissionValue`. Relatórios devem usar esses valores, não buscar do service/professional atual.

3. **Performance:** Índices no banco devem incluir `barbershopId`, `date`, `type` para queries eficientes.

4. **Period Validation:** Sempre validar que `dateFrom <= dateTo` e que o período não seja muito grande (ex: máximo 1 ano).

5. **Aggregations:** Usar agregações do Prisma quando possível para melhor performance.

6. **Permissions:** Todos podem ver relatórios, mas considerar restringir edição de transactions para ADMIN apenas no futuro.

---

## Próximos Passos

Após completar este milestone, o próximo será:
- **MILESTONE 7:** Notifications (Web Push + Cron)
