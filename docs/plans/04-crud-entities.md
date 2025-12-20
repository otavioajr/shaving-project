# MILESTONE 4: CRUD (Professionals, Clients, Services)

## Pré-Requisitos - Leitura Obrigatória

Antes de iniciar este milestone, LEIA os seguintes arquivos para contexto completo:

1. **[principal-plan.md](principal-plan.md)** - Visão geral do projeto, arquitetura, tech stack e regras críticas
2. **[DEVELOPMENT.md](../DEVELOPMENT.md)** - Status atual dos milestones e o que já foi implementado
3. **[CHANGELOG.md](../CHANGELOG.md)** - Histórico detalhado de todas as mudanças feitas no projeto

---

## Objetivo

Implementar CRUD completo para Professionals, Clients e Services seguindo o padrão Controller -> Service -> Repository, com paginação obrigatória, isolamento por tenant e controle de acesso baseado em roles.

---

## Arquivos a Criar

### Repositories (Data Access Layer)
1. **`/packages/backend/src/repositories/professional.repository.ts`**
2. **`/packages/backend/src/repositories/client.repository.ts`**
3. **`/packages/backend/src/repositories/service.repository.ts`**

### Services (Business Logic)
4. **`/packages/backend/src/services/professional.service.ts`**
5. **`/packages/backend/src/services/client.service.ts`**
6. **`/packages/backend/src/services/service.service.ts`**

### Controllers (Request Handlers)
7. **`/packages/backend/src/controllers/professional.controller.ts`**
8. **`/packages/backend/src/controllers/client.controller.ts`**
9. **`/packages/backend/src/controllers/service.controller.ts`**

### Schemas (Zod Validation)
10. **`/packages/backend/src/schemas/professional.schema.ts`**
11. **`/packages/backend/src/schemas/client.schema.ts`**
12. **`/packages/backend/src/schemas/service.schema.ts`**

---

## Padrão de Implementação

### Arquitetura em Camadas

```
Controller (Request/Response)
    ↓
Service (Business Logic)
    ↓
Repository (Data Access)
    ↓
Prisma Client
```

### Repository Pattern

**Responsabilidades:**
- Queries ao banco de dados
- Filtros por `barbershopId` (tenant isolation)
- Paginação
- Operações CRUD básicas

**Exemplo:**
```typescript
async findAll(barbershopId: string, page: number, limit: number): Promise<PaginatedResult<Professional>>
async findById(id: string, barbershopId: string): Promise<Professional | null>
async create(data: CreateProfessionalData, barbershopId: string): Promise<Professional>
async update(id: string, data: UpdateProfessionalData, barbershopId: string): Promise<Professional>
async delete(id: string, barbershopId: string): Promise<void>
```

### Service Pattern

**Responsabilidades:**
- Validações de negócio
- Transformações de dados
- Lógica complexa
- Chamadas ao repository

**Exemplo:**
```typescript
async listProfessionals(barbershopId: string, page: number, limit: number)
async getProfessional(id: string, barbershopId: string)
async createProfessional(data: CreateProfessionalInput, barbershopId: string, createdBy: string)
async updateProfessional(id: string, data: UpdateProfessionalInput, barbershopId: string)
async deleteProfessional(id: string, barbershopId: string, requesterRole: Role)
```

### Controller Pattern

**Responsabilidades:**
- Validação de request (Zod)
- Extração de parâmetros
- Chamadas ao service
- Formatação de response
- Tratamento de erros

---

## Endpoints

### Professionals

**GET /professionals**
- Query params: `page`, `limit`
- Auth: Requerida
- Role: Qualquer (BARBER ou ADMIN)
- Retorna: Lista paginada de professionals do tenant

**GET /professionals/:id**
- Params: `id`
- Auth: Requerida
- Role: Qualquer
- Retorna: Professional específico

**POST /professionals**
- Body: `{ name, email, password, commissionRate, role }`
- Auth: Requerida
- Role: ADMIN apenas
- Retorna: Professional criado

**PUT /professionals/:id**
- Params: `id`
- Body: `{ name?, email?, commissionRate?, role? }`
- Auth: Requerida
- Role: ADMIN ou próprio professional
- Retorna: Professional atualizado

**DELETE /professionals/:id**
- Params: `id`
- Auth: Requerida
- Role: ADMIN apenas
- Retorna: 204 No Content

### Clients

**GET /clients**
- Query params: `page`, `limit`
- Auth: Requerida
- Role: Qualquer
- Retorna: Lista paginada de clients do tenant

**GET /clients/:id**
- Params: `id`
- Auth: Requerida
- Role: Qualquer
- Retorna: Client específico

**POST /clients**
- Body: `{ name, phone, pushSubscription? }`
- Auth: Requerida
- Role: Qualquer
- Retorna: Client criado

**PUT /clients/:id**
- Params: `id`
- Body: `{ name?, phone?, pushSubscription? }`
- Auth: Requerida
- Role: Qualquer
- Retorna: Client atualizado

**DELETE /clients/:id**
- Params: `id`
- Auth: Requerida
- Role: Qualquer
- Retorna: 204 No Content

### Services

**GET /services**
- Query params: `page`, `limit`
- Auth: Requerida
- Role: Qualquer
- Retorna: Lista paginada de services do tenant

**GET /services/:id**
- Params: `id`
- Auth: Requerida
- Role: Qualquer
- Retorna: Service específico

**POST /services**
- Body: `{ name, price, duration }`
- Auth: Requerida
- Role: ADMIN apenas
- Retorna: Service criado

**PUT /services/:id**
- Params: `id`
- Body: `{ name?, price?, duration? }`
- Auth: Requerida
- Role: ADMIN apenas
- Retorna: Service atualizado

**DELETE /services/:id**
- Params: `id`
- Auth: Requerida
- Role: ADMIN apenas
- Retorna: 204 No Content

---

## Paginação

**Obrigatória em TODOS os endpoints de listagem**

**Query Parameters:**
- `page`: Número da página (mínimo 1)
- `limit`: Itens por página (mínimo 1, máximo 100)

**Response Format:**
```typescript
{
  data: T[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number,
    hasNext: boolean,
    hasPrevious: boolean
  }
}
```

---

## Dependências

Todas as dependências já estão instaladas:
- `zod` (validação)
- `@prisma/client` (database)
- `@fastify/jwt` (autenticação)

---

## Checklist de Testes

### Professionals
- [ ] Listar professionals com paginação funciona
- [ ] Buscar professional por ID funciona
- [ ] Criar professional (ADMIN apenas) funciona
- [ ] Atualizar professional (ADMIN ou próprio) funciona
- [ ] Deletar professional (ADMIN apenas) funciona
- [ ] Isolamento por tenant funciona
- [ ] Validação de role funciona

### Clients
- [ ] Listar clients com paginação funciona
- [ ] Buscar client por ID funciona
- [ ] Criar client funciona
- [ ] Atualizar client funciona
- [ ] Deletar client funciona
- [ ] Isolamento por tenant funciona

### Services
- [ ] Listar services com paginação funciona
- [ ] Buscar service por ID funciona
- [ ] Criar service (ADMIN apenas) funciona
- [ ] Atualizar service (ADMIN apenas) funciona
- [ ] Deletar service (ADMIN apenas) funciona
- [ ] Isolamento por tenant funciona
- [ ] Validação de role funciona

### Paginação
- [ ] Paginação funciona corretamente
- [ ] `totalPages` calculado corretamente
- [ ] `hasNext` e `hasPrevious` corretos
- [ ] Validação de `page` e `limit` funciona
- [ ] Limite máximo de 100 funciona

### Swagger
- [ ] Documentação Swagger completa para todos endpoints
- [ ] Schemas de request/response documentados
- [ ] Exemplos incluídos

---

## Observações Críticas

1. **Tenant Isolation:** TODAS as queries devem filtrar por `barbershopId`. Nunca retornar dados de outros tenants.

2. **Paginação Obrigatória:** Todos os endpoints de listagem DEVEM aceitar `page` e `limit`. Isso previne timeouts no Vercel (limite de 10s).

3. **Role-Based Access:** Implementar validação de roles corretamente:
   - ADMIN: Acesso total
   - BARBER: Acesso limitado (não pode criar/editar/deletar professionals ou services)

4. **Soft Delete:** Considerar implementar soft delete (campo `deletedAt`) ao invés de deletar fisicamente.

5. **Validação:** Usar Zod para validar todos os inputs antes de processar.

6. **Error Handling:** Retornar erros apropriados:
   - 404: Recurso não encontrado
   - 403: Sem permissão (role)
   - 400: Dados inválidos
   - 401: Não autenticado

---

## Próximos Passos

Após completar este milestone, o próximo será:
- **MILESTONE 5:** Appointment Management
