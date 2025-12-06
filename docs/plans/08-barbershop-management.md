# MILESTONE 8: Barbershop Management

## Pré-Requisitos - Leitura Obrigatória

Antes de iniciar este milestone, LEIA os seguintes arquivos para contexto completo:

1. **[docs/plans/principal-plan.md](docs/plans/principal-plan.md)** - Visão geral do projeto, arquitetura, tech stack e regras críticas
2. **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Status atual dos milestones e o que já foi implementado
3. **[docs/CHANGELOG.md](docs/CHANGELOG.md)** - Histórico detalhado de todas as mudanças feitas no projeto

---

## Objetivo

Implementar gestão completa de barbershops (tenants) com duas estratégias de onboarding: seed script para setup inicial controlado e self-registration para crescimento SaaS.

---

## Arquivos a Criar

### Repository
1. **`/packages/backend/src/repositories/barbershop.repository.ts`**
   - CRUD básico
   - Busca por slug
   - Validação de slug único

### Service
2. **`/packages/backend/src/services/barbershop.service.ts`**
   - Lógica de negócio
   - Self-registration
   - Validação de slug

### Controller
3. **`/packages/backend/src/controllers/barbershop.controller.ts`**
   - Endpoints públicos e protegidos

### Schema
4. **`/packages/backend/src/schemas/barbershop.schema.ts`**
   - Validação Zod

### Seed Script
5. **`/packages/backend/prisma/seed.ts`**
   - Script para criar barbershop inicial
   - Criar primeiro ADMIN user

---

## Endpoints

### POST /barbershops (Self-Registration)
- Body: `{ name, slug, adminEmail, adminPassword, adminName }`
- Auth: NÃO requerida (público)
- Ação: Cria barbershop + primeiro ADMIN user
- Retorna: Barbershop criado + tokens de acesso
- **Valida:** Slug único, formato válido

### GET /barbershops/:slug (Public Info)
- Params: `slug`
- Auth: NÃO requerida (público)
- Retorna: Informações públicas do barbershop
- **Retorna:** `{ id, name, slug, isActive }` (sem dados sensíveis)

### PUT /barbershops (Update Current Tenant)
- Body: `{ name?, isActive? }`
- Auth: Requerida
- Role: ADMIN apenas
- Retorna: Barbershop atualizado
- **Nota:** Atualiza o tenant atual (do `req.tenantId`)

---

## Self-Registration

### Fluxo

1. Cliente envia dados:
   - `name`: Nome do barbershop
   - `slug`: Slug único (será validado)
   - `adminEmail`: Email do primeiro admin
   - `adminPassword`: Senha do primeiro admin
   - `adminName`: Nome do primeiro admin

2. Validações:
   - Slug único (não existe)
   - Formato de slug válido
   - Email único (não existe em nenhum tenant)
   - Senha forte (mínimo 8 caracteres)

3. Criação:
   - Criar barbershop
   - Criar professional com role ADMIN
   - Hash da senha
   - Gerar tokens de acesso

4. Retorno:
   - Barbershop criado
   - Access token + refresh token
   - Status 201 Created

### Validação de Slug

**Formato:**
- Apenas letras minúsculas, números e hífens
- Não pode começar ou terminar com hífen
- Mínimo 3 caracteres, máximo 50
- Regex: `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`

**Exemplos válidos:**
- `meu-barbershop`
- `barbershop-123`
- `barbearia`

**Exemplos inválidos:**
- `Meu-Barbershop` (maiúsculas)
- `-barbershop` (começa com hífen)
- `barbershop-` (termina com hífen)
- `barbershop_123` (underscore não permitido)

---

## Seed Script

### Localização
`/packages/backend/prisma/seed.ts`

### Configuração

**Variáveis de Ambiente:**
```bash
SEED_BARBERSHOP_NAME="Meu Barbershop"
SEED_BARBERSHOP_SLUG="meu-barbershop"
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="senha-segura-123"
SEED_ADMIN_NAME="Admin"
```

### Funcionalidade

1. Verificar se barbershop já existe (por slug)
2. Se não existir:
   - Criar barbershop
   - Criar professional ADMIN
   - Hash da senha
   - Log de sucesso
3. Se existir:
   - Log informativo (skip)

### Execução

**Comando:**
```bash
pnpm db:seed
```

**Configuração no `package.json`:**
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

---

## Implementação

### Repository

```typescript
async findBySlug(slug: string): Promise<Barbershop | null>
async create(data: CreateBarbershopData): Promise<Barbershop>
async update(id: string, data: UpdateBarbershopData): Promise<Barbershop>
async isSlugUnique(slug: string, excludeId?: string): Promise<boolean>
```

### Service

```typescript
async selfRegister(data: SelfRegisterInput): Promise<SelfRegisterResult>
async getPublicInfo(slug: string): Promise<PublicBarbershopInfo>
async updateCurrentTenant(
  tenantId: string,
  data: UpdateBarbershopInput
): Promise<Barbershop>
async validateSlug(slug: string): boolean
```

### Self-Registration Result

```typescript
{
  barbershop: Barbershop,
  tokens: {
    accessToken: string,
    refreshToken: string
  },
  admin: {
    id: string,
    email: string,
    name: string
  }
}
```

---

## Dependências

Todas as dependências já estão instaladas:
- `@prisma/client`
- `bcryptjs`
- `zod`
- `tsx` (para seed script)

---

## Checklist de Testes

### Self-Registration
- [ ] Criar barbershop via self-registration funciona
- [ ] Primeiro ADMIN criado automaticamente
- [ ] Tokens de acesso retornados
- [ ] Slug único validado (erro se duplicado)
- [ ] Formato de slug validado
- [ ] Email único validado (erro se duplicado)
- [ ] Senha forte validada
- [ ] Hash de senha funciona

### Public Info
- [ ] Buscar barbershop por slug funciona
- [ ] Retorna apenas dados públicos
- [ ] Retorna 404 se barbershop não existe
- [ ] Retorna 404 se barbershop inativo

### Update Current Tenant
- [ ] Atualizar nome funciona (ADMIN apenas)
- [ ] Atualizar isActive funciona (ADMIN apenas)
- [ ] BARBER não pode atualizar
- [ ] Isolamento por tenant funciona

### Seed Script
- [ ] Seed script cria barbershop se não existe
- [ ] Seed script não duplica se já existe
- [ ] Seed script cria ADMIN corretamente
- [ ] Variáveis de ambiente funcionam
- [ ] Comando `pnpm db:seed` funciona

### Validações
- [ ] Slug formato válido
- [ ] Slug único
- [ ] Email único
- [ ] Senha forte

---

## Observações Críticas

1. **Slug Uniqueness:** Slug deve ser único globalmente (não apenas por tenant). É o identificador do tenant.

2. **Email Uniqueness:** Email do admin deve ser único globalmente. Um email não pode ser usado em múltiplos tenants.

3. **Self-Registration Security:** Self-registration é público, mas validar todos os inputs rigorosamente para prevenir abuso.

4. **Seed Script:** Seed script é para setup inicial/controlado. Não deve ser executado em produção sem cuidado.

5. **Tenant Isolation:** Update sempre atualiza o tenant atual (`req.tenantId`), nunca permite atualizar outro tenant.

6. **Slug Immutability:** Considerar tornar slug imutável após criação para evitar quebras de links/configurações.

7. **Public Info:** Endpoint público deve retornar apenas dados não sensíveis. Útil para verificar se barbershop existe antes de tentar login.

---

## Próximos Passos

Após completar este milestone, o próximo será:
- **MILESTONE 9:** Testing, Docs & Deployment

