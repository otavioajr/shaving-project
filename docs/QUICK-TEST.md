# Teste rápido local

Guia curto para validar o que já existe no backend e ver algo rodando em poucos minutos.

## Pré-requisitos
- Node.js 22+ e pnpm 9+
- Variáveis de ambiente preenchidas em `packages/backend/.env` (use `packages/backend/.env.example` como base)

## Passo a passo
1. Instale dependências na raiz:
   ```bash
   pnpm install
   ```
2. Gere o client do Prisma (necessário após configurar o `.env`):
   ```bash
   pnpm db:generate
   ```
3. Rode as migrations (necessário em um banco “novo”):
   ```bash
   pnpm db:migrate
   ```
4. **Popular dados de teste (NOVO):**
   ```bash
   pnpm db:seed
   ```
   Isto cria automaticamente:
   - 1 barbershop de teste (`barbearia-teste`)
   - 1 admin (`admin@barbearia-teste.com` / `senha123`)
   - 1 barbeiro (`barber@barbearia-teste.com` / `senha123`)
   - 1 cliente de teste (`João Silva`)
   - 3 serviços (Corte, Barba, Corte+Barba)
   
   ✅ Seguro rodar múltiplas vezes (idempotente)

5. Suba o servidor em modo dev (porta 3000):
   ```bash
   pnpm dev
   ```

## Smoke manual
- Health check (público, sem tenant):  
  ```bash
  curl -i http://localhost:3000/health
  ```  
  Esperado: `200 OK` com `{ "status": "ok", "environment": "development", ... }`.

- Swagger UI: abra `http://localhost:3000/docs` no navegador para ver a documentação carregando.

- Endpoint raiz:  
  ```bash
  curl -i http://localhost:3000/
  ```  
  Esperado: `200 OK` com nome e versão da API.

## Testar com Dados de Seed

Agora que você rodou `pnpm db:seed`, você pode testar rotas protegidas:

```bash
# Teste listagem com tenant válido
curl -i -H "x-tenant-slug: barbearia-teste" http://localhost:3000/api/professionals
```

**Esperado:**
- Status: `200 OK` (listagem não exige auth; create/update/delete exigem)
- Body: `{ data: [...], pagination: { page, limit, total, totalPages } }`
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (rate limit ativado)

## Testes automatizados
- Rodar suite atual (Vitest com mocks, não precisa de DB/Redis reais):
  ```bash
  pnpm test
  ```
- Cobertura opcional:
  ```bash
  pnpm test:coverage
  ```

## TestSprite (E2E)
Para rodar os testes E2E gerados pelo TestSprite contra o backend local:

1. No `packages/backend/.env`, habilite (somente dev/test):
   ```bash
   ENABLE_TEST_OTP_ENDPOINT="true"
   ```
   **IMPORTANTE:** em produção isso deve ficar `false` e `NODE_ENV` deve ser `production`.
2. Suba o backend: `pnpm dev`
3. Rode os testes gerados (exemplos do report atual):
   ```bash
   python3 testsprite_tests/TC001_test_root_info_endpoint.py
   python3 testsprite_tests/TC002_test_health_check_endpoint.py
   python3 testsprite_tests/TC003_test_swagger_ui_documentation_endpoint.py
   python3 testsprite_tests/TC004_test_auth_login_with_email_password.py
   python3 testsprite_tests/TC005_test_auth_refresh_access_token.py
   python3 testsprite_tests/TC006_test_auth_logout.py
   python3 testsprite_tests/TC007_test_auth_request_otp.py
   python3 testsprite_tests/TC008_test_auth_verify_otp.py
   python3 testsprite_tests/TC009_test_auth_test_otp_retrieval.py
   python3 testsprite_tests/TC010_test_professionals_list_pagination.py
   ```

Veja o report consolidado em `testsprite_tests/testsprite-mcp-test-report.md`.

---

## ✅ Validação dos Middlewares (Tenant + Rate Limit)

### 1. Testar Swagger UI Completo
**Objetivo:** Confirmar que todas as sub-rotas do Swagger funcionam sem bloqueio

1. Abra `http://localhost:3000/docs` no navegador
2. Abra o **DevTools** (F12) → Aba **Network**
3. Recarregue a página (Ctrl+R)

**Verificar:**
- ✅ Interface do Swagger UI carrega completamente
- ✅ **Nenhuma requisição com status 404** no Network
- ✅ Requisições esperadas com 200:
  - `/docs` → 200
  - `/docs/static/...` → 200
  - `/docs/json` ou `/docs/` → 200

---

### 2. Testar Rotas Públicas (Sem Tenant e Sem Rate Limit)
**Objetivo:** Confirmar que rotas públicas não exigem tenant nem aplicam rate limit

```bash
# Health check
curl -i http://localhost:3000/health

# Swagger JSON
curl -i http://localhost:3000/docs/json
```

**Verificar:**
- ✅ Status: `200 OK`
- ✅ **Sem headers** `X-RateLimit-*` (não aplica rate limit)
- ✅ **Não exige** header `x-tenant-slug`

---

### 3. Testar Rota Protegida SEM Header de Tenant
**Objetivo:** Confirmar que rotas protegidas bloqueiam sem tenant

```bash
curl -i http://localhost:3000/api/professionals
```

**Verificar:**
- ✅ Status: `404 Not Found`
- ✅ Resposta: `{"error": "Tenant not found", "message": "Missing x-tenant-slug header"}`

---

### 4. Testar Rota Protegida COM Tenant Válido
**Objetivo:** Confirmar que rate limit é aplicado em rotas protegidas

**Pré-requisito:** Criar um tenant no banco
```bash
# Opção 1: Via Prisma Studio
pnpm db:studio
# Criar um Barbershop com slug "barbearia-teste"

# Opção 2: Via seed (se existir)
pnpm db:seed
```

**Teste:**
```bash
curl -i -H "x-tenant-slug: barbearia-teste" http://localhost:3000/api/professionals
```

**Verificar:**
- ✅ Status: `200 OK` (GET list; POST/PUT/DELETE sem token retornam `401`)
- ✅ **COM headers** `X-RateLimit-*`:
  ```
  X-RateLimit-Limit: 1000
  X-RateLimit-Remaining: 999
  X-RateLimit-Reset: 2025-12-07T...
  ```

---

### 5. Testar Rate Limit (Opcional)
**Objetivo:** Confirmar que rate limit bloqueia após atingir limite

```bash
# Fazer 101 requisições rápidas (assumindo limite de 100/min)
for i in {1..101}; do
  curl -s -H "x-tenant-slug: barbearia-teste" http://localhost:3000/api/professionals > /dev/null
  echo "Request $i"
done

# Confirmar bloqueio
curl -i -H "x-tenant-slug: barbearia-teste" http://localhost:3000/api/professionals
```

**Verificar:**
- ✅ Status: `429 Too Many Requests`
- ✅ Resposta: `{"error": "Too Many Requests", ...}`
- ✅ Header `X-RateLimit-Remaining: 0`

---

## 🧪 Checklist de Validação

- [ ] Swagger UI carrega sem erros 404 no DevTools
- [ ] `/health` retorna 200 sem rate limit headers
- [ ] `/docs/json` retorna 200 sem rate limit headers
- [ ] Rotas protegidas sem header retornam 404
- [ ] Rotas protegidas com tenant válido retornam rate limit headers
- [ ] Rate limit bloqueia após 100 requisições (opcional)

---

## 🐛 Troubleshooting

### Swagger ainda retorna 404 em sub-rotas
**Causa:** Middlewares não atualizados corretamente

**Solução:**
1. Verifique que **ambos** os arquivos têm a correção:
   - `packages/backend/src/middleware/tenant.ts`
   - `packages/backend/src/middleware/rateLimit.ts`

   Procure por:
   ```typescript
   if (PUBLIC_ROUTES.includes(path) || path.startsWith('/docs')) {
     return
   }
   ```

2. Reinicie o servidor: `Ctrl+C` → `npm run dev`

---

### Tenant não encontrado mesmo com slug correto
**Causa:** Barbershop não existe ou está inativo no banco

**Solução:**
1. Execute `npm run db:studio`
2. Vá para tabela `Barbershop`
3. Verifique se existe registro com o `slug` usado
4. Confirme que `isActive = true`

---

### Rate limit não funciona
**Causa:** Redis (Upstash) não configurado

**Solução:**
1. Verifique `.env` tem as variáveis:
   ```env
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   ```
2. Verifique logs do servidor para erros de conexão Redis
