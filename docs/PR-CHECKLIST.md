# PR / Merge Checklist (Definition of Done)

Este checklist é o “padrão mínimo” para abrir PR e fazer merge na `main`.

## 0) Antes de começar (obrigatório)

- [ ] Ler `docs/DEVELOPMENT.md` (status e milestone atual).
- [ ] Ler `docs/CHANGELOG.md` (mudanças recentes e contexto).

## 1) Qualidade de código (obrigatório)

- [ ] `pnpm lint` (precisa sair **0 errors / 0 warnings**).
- [ ] `pnpm test` (Vitest passando).
- [ ] `pnpm build` (TypeScript compila sem erros).

## 2) Quando a mudança mexe em API/rotas

- [ ] Swagger e schemas estão alinhados (Swagger + Zod).
- [ ] Rotas protegidas continuam exigindo tenant (`x-tenant-slug`) e auth quando aplicável.
- [ ] Qualquer query/repository novo filtra por `barbershopId` (isolamento multi-tenant).
- [ ] Listagens usam paginação (`page`/`limit`) para evitar timeouts.

## 3) Quando a mudança mexe em DB/Prisma

- [ ] Migração criada/aplicada (quando necessário) e `pnpm db:generate` ok.
- [ ] `packages/backend/.env.example` atualizado se houver novas env vars.

## 4) Testes e cobertura (recomendado)

- [ ] `pnpm test:coverage` (meta do projeto: >= 80%; se não atingir, registrar no PR o motivo e próximo passo).
- [ ] Para features críticas, fazer smoke local:
  - [ ] `pnpm dev`
  - [ ] `curl -i http://localhost:3000/health`
  - [ ] `curl -i http://localhost:3000/docs/json`

## 5) Documentação (obrigatório)

- [ ] Atualizar `docs/CHANGELOG.md` com o que mudou.
- [ ] Atualizar `docs/DEVELOPMENT.md` com o estado atual (checklists, notas e data).
- [ ] Se o fluxo de teste mudou, atualizar `docs/QUICK-TEST.md`.

## 6) PR pronto para merge (obrigatório)

- [ ] PR descreve o que mudou e por quê (link para milestone/issue se existir).
- [ ] PR lista comandos executados (`lint`, `test`, `build`, opcional `test:coverage`).
- [ ] PR documenta impactos: env vars, migrações, endpoints novos/alterados.
