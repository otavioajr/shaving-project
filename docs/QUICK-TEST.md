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
3. Suba o servidor em modo dev (porta 3000):
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

## Testes automatizados
- Rodar suite atual (Vitest com mocks, não precisa de DB/Redis reais):
  ```bash
  pnpm test
  ```
- Cobertura opcional:
  ```bash
  pnpm test:coverage
  ```

Pronto: se os comandos acima passarem e as respostas baterem com o esperado, o que já está implementado está funcionando.
