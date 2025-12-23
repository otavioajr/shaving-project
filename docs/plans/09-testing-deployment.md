# MILESTONE 9: Testing, Docs & Deployment

## Pré-Requisitos - Leitura Obrigatória

Antes de iniciar este milestone, LEIA os seguintes arquivos para contexto completo:

1. **[principal-plan.md](principal-plan.md)** - Visão geral do projeto, arquitetura, tech stack e regras críticas
2. **[DEVELOPMENT.md](../DEVELOPMENT.md)** - Status atual dos milestones e o que já foi implementado
3. **[CHANGELOG.md](../CHANGELOG.md)** - Histórico detalhado de todas as mudanças feitas no projeto

---

## Objetivo

Completar cobertura de testes (>= 80%), finalizar documentação Swagger, atualizar README com instruções de setup, configurar CI/CD com GitHub Actions e fazer deploy em produção no Vercel.

---

## Tarefas

### 1. Cobertura de Testes

**Meta:** >= 80% de cobertura

**Áreas a Cobrir:**

- [ ] Services (auth, professional, client, service, appointment, transaction, notification, barbershop)
- [ ] Repositories (todos)
- [ ] Controllers (todos)
- [ ] Middleware (tenant, auth, rateLimit)
- [ ] Utils (se houver)

**Tipos de Testes:**

- Unit tests (services, repositories)
- Integration tests (controllers, endpoints)
- E2E tests (fluxos completos)

**Comandos:**

```bash
pnpm test              # Executar testes
pnpm test:coverage      # Ver cobertura
pnpm test:watch        # Modo watch
```

### 2. Documentação Swagger

**Completar:**

- [ ] Todos os endpoints documentados
- [ ] Schemas de request/response completos
- [ ] Exemplos para cada endpoint
- [ ] Tags organizadas
- [ ] Autenticação documentada (Bearer token)
- [ ] Códigos de resposta documentados (200, 400, 401, 403, 404, 429, 500)

**Verificar:**

- [ ] Swagger UI acessível em `/docs`
- [ ] Todos os endpoints aparecem
- [ ] Exemplos funcionam
- [ ] Try it out funciona

### 3. README Atualizado

**Seções Obrigatórias:**

1. **Visão Geral**
   - Descrição do projeto
   - Arquitetura multi-tenant
   - Tech stack

2. **Pré-requisitos**
   - Node.js 22 LTS
   - pnpm
   - Conta Supabase
   - Conta Upstash Redis
   - Conta Vercel (para deploy)

3. **Setup Local**
   - Clone do repositório
   - Instalação de dependências
   - Configuração de variáveis de ambiente
   - Setup do banco de dados
   - Execução de migrations
   - Seed inicial (opcional)
   - Executar servidor local

4. **Comandos Disponíveis**

   ```bash
   pnpm install          # Instalar dependências
   pnpm dev              # Servidor local
   pnpm build            # Build
   pnpm test             # Testes
   pnpm test:coverage    # Cobertura
   pnpm lint             # Linter
   pnpm db:generate      # Gerar Prisma client
   pnpm db:migrate       # Executar migrations
   pnpm db:seed          # Seed inicial
   ```

5. **Estrutura do Projeto**
   - Explicação das pastas
   - Padrões de código

6. **API Documentation**
   - Link para Swagger UI
   - Autenticação
   - Endpoints principais

7. **Deploy**
   - Instruções para Vercel
   - Variáveis de ambiente
   - Configuração de cron

8. **Contribuindo**
   - Guidelines
   - Padrões de commit

### 4. GitHub Actions CI

**Arquivo:** `.github/workflows/ci.yml`

**Jobs:**

1. **Lint**
   - Executar `pnpm lint`
   - Falhar se houver erros

2. **Test**
   - Executar `pnpm test`
   - Gerar relatório de cobertura
   - Falhar se cobertura < 80%

3. **Build**
   - Executar `pnpm build`
   - Verificar se compila sem erros

**Trigger:**

- Push para `main`
- Pull requests para `main`

**Configuração:**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:coverage

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
```

### 5. Deploy Vercel

**Configuração:**

1. **Variáveis de Ambiente no Vercel:**
   - Todas as variáveis do `.env.example`
   - `CRON_SECRET` (gerar único)
   - `VAPID_*` keys (gerar para produção)

2. **Build Settings:**
   - Framework Preset: Other
   - Build Command: `cd packages/backend && pnpm build`
   - Output Directory: `packages/backend/dist`
   - Install Command: `pnpm install`

3. **Cron Configuration:**
   - Verificar `vercel.json` com cron configurado
   - Path: `/api/cron/notify`
   - Schedule: `* * * * *` (1 minuto)

4. **Health Check:**
   - Verificar `/health` em produção
   - Status deve ser `{ status: "ok" }`

### 6. DEVELOPMENT.md Final

**Atualizar:**

- [ ] Marcar todos os milestones como COMPLETE
- [ ] Adicionar data de conclusão
- [ ] Adicionar links para documentação
- [ ] Adicionar notas finais

---

## Checklist de Testes

### Cobertura

- [ ] Cobertura >= 80% em todos os arquivos
- [ ] Relatório de cobertura gerado
- [ ] Testes críticos cobertos (auth, tenant isolation, etc.)

### Documentação

- [ ] Swagger completo
- [ ] README atualizado
- [ ] DEVELOPMENT.md atualizado
- [ ] CHANGELOG.md atualizado

### CI/CD

- [ ] GitHub Actions configurado
- [ ] Lint passa no CI
- [ ] Testes passam no CI
- [ ] Build passa no CI
- [ ] Badge de status no README (opcional)

### Deploy

- [ ] Deploy no Vercel bem-sucedido
- [ ] Variáveis de ambiente configuradas
- [ ] Health check funciona em produção
- [ ] Swagger acessível em produção
- [ ] Cron configurado e funcionando

---

## Observações Críticas

1. **Cobertura:** Focar em testes críticos primeiro (auth, tenant isolation, validações). Não precisa 100%, mas >= 80% é essencial.

2. **CI/CD:** GitHub Actions deve falhar rápido. Lint e testes devem rodar em paralelo para velocidade.

3. **Deploy:** Sempre testar em staging antes de produção. Vercel preview deployments são úteis.

4. **Secrets:** Nunca commitar secrets. Usar Vercel environment variables.

5. **Documentação:** README deve ser suficiente para um desenvolvedor novo começar o projeto.

6. **Swagger:** Documentação completa facilita integração e manutenção.

---

## Próximos Passos

Após completar este milestone:

- ✅ Projeto completo e em produção
- ✅ Documentação completa
- ✅ Testes com boa cobertura
- ✅ CI/CD configurado
- ✅ Pronto para evoluções futuras
