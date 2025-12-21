# Scripts de Teste

## E2E Test Runner

Script automatizado para executar testes de ponta a ponta de todos os endpoints principais.

### Pré-requisitos

1. Servidor rodando:
   ```bash
   cd /Users/otavioajr/Documents/Projetos/shaving-project
   pnpm dev
   ```

2. Banco de dados seedado:
   ```bash
   pnpm db:seed
   ```

3. Variável `ENABLE_TEST_OTP_ENDPOINT=true` no `.env` (apenas para dev/test)

### Uso Básico

```bash
# Executar todos os testes com configuração padrão
./scripts/e2e-test.sh
```

### Uso com Configuração Customizada

```bash
# Customizar base URL
BASE_URL="http://localhost:3001" ./scripts/e2e-test.sh

# Customizar tenant
TENANT="minha-barbearia" ./scripts/e2e-test.sh

# Customizar credenciais
ADMIN_EMAIL="admin@example.com" ADMIN_PASSWORD="mypass" ./scripts/e2e-test.sh

# Combinar múltiplas configurações
BASE_URL="https://api.example.com" TENANT="prod-tenant" ./scripts/e2e-test.sh
```

### O que é testado

O script executa **43 testes** cobrindo:

- ✅ **Public Endpoints** (4 testes)
  - Health check
  - API info
  - Swagger UI
  - Swagger JSON

- ✅ **Tenant Middleware** (3 testes)
  - Validação de tenant header
  - Rejeição de tenant inválido
  - Aceitação de tenant válido

- ✅ **Authentication** (4 testes)
  - Login válido/inválido
  - Refresh token
  - Request OTP

- ✅ **Professionals CRUD** (6 testes)
  - Listar, buscar, criar, atualizar, deletar

- ✅ **Clients CRUD** (4 testes)
  - Listar, criar, atualizar, deletar

- ✅ **Services CRUD** (3 testes)
  - Listar, criar, atualizar

- ✅ **Appointments** (4 testes)
  - Listar, criar, atualizar status, calcular comissão

- ✅ **Transactions** (4 testes)
  - Listar, criar income/expense, filtrar

- ✅ **Barbershop** (2 testes)
  - Buscar, atualizar

### Saída Esperada

```
========================================
1. PUBLIC ENDPOINTS
========================================
✓ TC001: Health Check - PASSED (Status: 200)
✓ TC002: API Info (Root) - PASSED (Status: 200)
✓ TC003: Swagger UI - PASSED (Status: 200)
✓ TC004: Swagger JSON - PASSED (Status: 200)

========================================
2. TENANT MIDDLEWARE
========================================
✓ TC005: Rota protegida SEM tenant - PASSED (Status: 404)
✓ TC006: Tenant INVÁLIDO - PASSED (Status: 404)
✓ TC007: Tenant VÁLIDO - PASSED (Status: 200)

...

========================================
RESUMO DOS TESTES
========================================

Total de testes: 43
Testes passados: 43
Testes falhos: 0

✓ TODOS OS TESTES PASSARAM!
```

### Exit Codes

- `0` - Todos os testes passaram
- `1` - Alguns testes falharam ou servidor não está rodando

### Troubleshooting

**Erro: "Servidor não está rodando"**
```bash
# Certifique-se de que o servidor está rodando
pnpm dev
```

**Erro: "Tenant não encontrado"**
```bash
# Certifique-se de que o banco foi seedado
pnpm db:seed
```

**Erro: "Não foi possível extrair access token"**
- Verifique se as credenciais estão corretas
- Verifique se o tenant existe e está ativo
- Verifique logs do servidor

### Dependências

- `curl` - Para fazer requisições HTTP
- `grep` - Para extrair dados das respostas
- `jq` (opcional) - Para parsing JSON mais robusto

### Notas

- O script usa `set -e`, então para na primeira falha de comando
- Testes são executados sequencialmente para evitar conflitos
- IDs são extraídos dinamicamente das respostas (seed data)
- Timestamps são usados para criar dados únicos
