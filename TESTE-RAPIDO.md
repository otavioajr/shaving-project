# 🚀 Teste Rápido - Validação E2E do Projeto

**Criado:** 2025-12-20
**Objetivo:** Executar validação rápida de todos os endpoints em 2 minutos

---

## ⚡ Quick Start (3 comandos)

```bash
# 1. Certifique-se de que o servidor está rodando
pnpm dev

# 2. Em outro terminal, execute o script de teste
./scripts/e2e-test.sh

# 3. Veja o resultado: ✓ TODOS OS TESTES PASSARAM!
```

---

## 📊 O que será testado

| Módulo             | Testes | Endpoints                         |
| ------------------ | ------ | --------------------------------- |
| Public Endpoints   | 4      | `/`, `/health`, `/docs`           |
| Tenant Middleware  | 3      | Validação multi-tenant            |
| Authentication     | 4      | Login, Refresh, OTP               |
| Professionals CRUD | 6      | GET, POST, PUT, DELETE            |
| Clients CRUD       | 4      | GET, POST, PUT, DELETE            |
| Services CRUD      | 3      | GET, POST, PUT, DELETE            |
| Appointments       | 4      | Criar, Status, Comissão           |
| Transactions       | 4      | INCOME, EXPENSE, Filtros          |
| Barbershop         | 2      | GET, PUT                          |
| **TOTAL**          | **43** | **Todos os principais endpoints** |

---

## 📋 Checklist de Verificação

Antes de executar os testes, certifique-se de:

- [ ] Servidor está rodando (`pnpm dev`)
- [ ] Banco foi seedado (`pnpm db:seed`)
- [ ] `.env` tem `ENABLE_TEST_OTP_ENDPOINT=true` (dev only)
- [ ] Redis (Upstash) está configurado
- [ ] Supabase está configurado

---

## 🎯 Status Atual do Projeto

### ✅ O que está FUNCIONANDO (70% completo)

**Infraestrutura & Core:**

- ✅ Multi-tenancy com cache Redis
- ✅ Rate limiting (IP + Tenant)
- ✅ Authentication (JWT + OTP)
- ✅ Row Level Security (RLS)
- ✅ Paginação em todos os endpoints

**Endpoints Implementados:**

- ✅ Auth (5 endpoints)
- ✅ Professionals CRUD (5 endpoints)
- ✅ Clients CRUD (5 endpoints)
- ✅ Services CRUD (5 endpoints)
- ✅ Appointments (6 endpoints)
- ✅ Transactions (5 endpoints)
- ✅ Barbershop (2 endpoints)

**Business Logic:**

- ✅ Validação de conflito de horário
- ✅ Cálculo automático de comissão
- ✅ Snapshot pattern (price/commission)

**Qualidade:**

- ✅ 68/68 testes unitários passando
- ✅ 10/10 testes E2E (TestSprite) passando
- ✅ Lint 0 warnings/errors

---

### ⚠️ O que FALTA Implementar (30% restante)

**Crítico (Segurança):**

- ❌ **RBAC (Role-Based Access Control)** - M4, M5, M6, M8
  - Qualquer usuário autenticado pode fazer qualquer coisa
  - ADMIN vs BARBER não tem diferença

**Importante (Business Logic):**

- ❌ **Validação de transição de status** - M5
  - Permite transições inválidas (ex: COMPLETED → PENDING)
  - Falta state machine

**Qualidade:**

- ❌ **Testes de integração para CRUD** - M4, M5, M6
  - Cobertura atual: ~58% (meta: 80%)

**Features:**

- ❌ **Endpoints de relatório** - M6
  - Financial summary
  - Commission report
- ❌ **Sistema de notificações** - M7
  - Web Push service
  - Cron job

---

## 🔧 Como Usar o Plano de Teste Completo

### 1. Documentação Completa

Veja o plano detalhado em: `docs/E2E-TEST-PLAN.md`

Inclui:

- Inventário completo de endpoints
- 45+ cenários de teste com comandos curl
- Fluxo completo (user journey)
- Checklist de validação
- Análise de gaps

### 2. Script Automatizado

Execute testes automaticamente: `./scripts/e2e-test.sh`

Inclui:

- 43 testes automatizados
- Output colorido (✓ verde, ✗ vermelho)
- Extração automática de tokens/IDs
- Summary de resultados

### 3. Testes Manuais (curl)

Para testar endpoints específicos, use os comandos do plano:

```bash
# Exemplo: Testar login
export BASE_URL="http://localhost:3000"
export TENANT="barbearia-teste"

curl -i -X POST "${BASE_URL}/api/auth/login" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@barbearia-teste.com",
    "password": "senha123"
  }'
```

---

## 🎓 Próximos Passos Recomendados

### Prioridade 1 (Segurança - CRÍTICO)

1. **Implementar RBAC em todos os endpoints**
   - Professional: ADMIN pode CRUD, BARBER apenas read
   - Appointments: ADMIN pode tudo, BARBER apenas seus appointments
   - Transactions: Apenas ADMIN
   - Barbershop: Apenas ADMIN

### Prioridade 2 (Business Logic)

2. **Implementar state machine para appointments**
   - PENDING → CONFIRMED → COMPLETED
   - PENDING → CANCELLED
   - Bloquear transições inválidas

### Prioridade 3 (Qualidade)

3. **Criar testes de integração**
   - CRUD endpoints (professionals, clients, services)
   - Appointment flow com auth/RBAC
   - Transaction filtering
   - Elevar cobertura para 80%+

### Prioridade 4 (Features)

4. **Implementar endpoints de relatório**
   - `GET /api/reports/financial-summary`
   - `GET /api/reports/commission`
   - Filtros por data, professional, etc.

### Prioridade 5 (Infraestrutura)

5. **Sistema de notificações**
   - Web Push service
   - Cron endpoint (`/api/cron/notify`)
   - Integrar com appointments

---

## 📝 Passo a Passo para Confirmação

Execute estes passos para confirmar que tudo está funcionando:

### 1. Preparação (2 min)

```bash
# Terminal 1: Inicie o servidor
cd /Users/otavioajr/Documents/Projetos/shaving-project
pnpm dev

# Terminal 2: Execute os testes
./scripts/e2e-test.sh
```

### 2. Validação Visual (1 min)

Abra no navegador:

- http://localhost:3000 - Deve retornar API info
- http://localhost:3000/health - Deve retornar `{"status":"ok"}`
- http://localhost:3000/docs - Deve abrir Swagger UI

### 3. Validação Manual (3 min)

Execute os comandos do `docs/E2E-TEST-PLAN.md` seção "Fluxo Completo"

### 4. Análise de Resultados (2 min)

Verifique:

- ✅ Script de teste passou todos os 43 testes?
- ✅ Swagger UI carregou sem erros 404?
- ✅ Fluxo completo (login → criar appointment → calcular comissão) funcionou?

### 5. Próximos Passos (Planning)

Se tudo passou:

- ✅ **Projeto está funcional e caminhando bem!**
- 📋 Próximo: Implementar RBAC (M4)
- 📋 Depois: Validação de status (M5)
- 📋 Depois: Testes de integração (M4-M6)

Se algo falhou:

- ❌ Veja logs do servidor
- ❌ Verifique `.env` está configurado
- ❌ Confirme que `pnpm db:seed` foi executado
- ❌ Revise `docs/E2E-TEST-PLAN.md` para debug

---

## 📚 Documentação Relacionada

- **Plano de Teste Completo:** `docs/E2E-TEST-PLAN.md`
- **Script de Teste:** `scripts/e2e-test.sh`
- **Guia de Teste Rápido:** `docs/QUICK-TEST.md`
- **Status do Desenvolvimento:** `docs/DEVELOPMENT.md`
- **Changelog:** `docs/CHANGELOG.md`

---

## 🆘 Troubleshooting

### Erro: "Servidor não está rodando"

```bash
# Certifique-se de que o servidor está rodando
pnpm dev
```

### Erro: "Tenant not found"

```bash
# Certifique-se de que o banco foi seedado
pnpm db:seed

# Verifique se o tenant existe
pnpm db:studio
# Abra tabela "Barbershop" e confirme que existe um com slug "barbearia-teste"
```

### Erro: "Invalid credentials"

```bash
# Credenciais padrão do seed:
# Email: admin@barbearia-teste.com
# Password: senha123

# Se alterou o seed, use as credenciais corretas
```

### Erro: "Access token não extraído"

```bash
# Certifique-se de que o login está funcionando
curl -i -X POST "http://localhost:3000/api/auth/login" \
  -H "x-tenant-slug: barbearia-teste" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@barbearia-teste.com",
    "password": "senha123"
  }'

# Deve retornar accessToken no body
```

### Script falha no macOS/Linux

```bash
# Certifique-se de que o script é executável
chmod +x ./scripts/e2e-test.sh

# Execute com bash explicitamente
bash ./scripts/e2e-test.sh
```

---

**Última atualização:** 2025-12-20

**Dúvidas?** Consulte `docs/E2E-TEST-PLAN.md` para detalhes completos.
