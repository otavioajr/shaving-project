# MILESTONE 3: Authentication (JWT + OTP)

## Pré-Requisitos - Leitura Obrigatória

Antes de iniciar este milestone, LEIA os seguintes arquivos para contexto completo:

1. **[principal-plan.md](principal-plan.md)** - Visão geral do projeto, arquitetura, tech stack e regras críticas
2. **[DEVELOPMENT.md](../DEVELOPMENT.md)** - Status atual dos milestones e o que já foi implementado
3. **[CHANGELOG.md](../CHANGELOG.md)** - Histórico detalhado de todas as mudanças feitas no projeto

---

## Objetivo

Implementar autenticação completa com JWT (access + refresh tokens) e sistema de OTP baseado em Redis para login sem senha.

---

## Arquivos a Criar

### Services

1. **`/packages/backend/src/services/auth.service.ts`**
   - Geração e verificação de OTP (6 dígitos)
   - Hash e verificação de senha (bcrypt)
   - Geração de access token (15 min)
   - Geração de refresh token (7 dias)
   - Validação de tokens

### Controllers

2. **`/packages/backend/src/controllers/auth.controller.ts`**
   - `POST /auth/login` - Login com email/senha
   - `POST /auth/request-otp` - Solicitar OTP
   - `POST /auth/verify-otp` - Verificar OTP e emitir tokens
   - `POST /auth/refresh` - Renovar access token
   - `POST /auth/logout` - Invalidar refresh token

### Middleware

3. **`/packages/backend/src/middleware/auth.ts`**
   - Verificação de JWT
   - Extração de usuário do token
   - Controle de acesso baseado em role (ADMIN/BARBER)
   - Decorator/helper para rotas protegidas

### Schemas (Zod)

4. **`/packages/backend/src/schemas/auth.schema.ts`**
   - Validação de request bodies
   - Schemas para login, OTP, refresh, etc.

---

## Implementação

### Auth Service

**Funcionalidades:**

1. **OTP Management:**
   - `generateOTP()`: Gera código de 6 dígitos
   - `storeOTP(email, otp)`: Armazena no Redis com TTL 5 minutos
   - `verifyOTP(email, otp)`: Verifica e remove do Redis
   - **CRÍTICO:** OTP NUNCA deve ser armazenado no PostgreSQL

2. **Password Management:**
   - `hashPassword(password)`: Hash com bcrypt
   - `verifyPassword(password, hash)`: Verifica senha

3. **Token Management:**
   - `generateAccessToken(user)`: JWT com expiração de 15 minutos
   - `generateRefreshToken(user)`: Token único armazenado no Redis (7 dias)
   - `verifyAccessToken(token)`: Valida e decodifica JWT
   - `revokeRefreshToken(token)`: Remove do Redis

### Auth Controller

**Endpoints:**

**POST /auth/login**

- Body: `{ email, password }`
- Valida credenciais
- Retorna access token + refresh token
- Status: 200 (sucesso) ou 401 (credenciais inválidas)

**POST /auth/request-otp**

- Body: `{ email }`
- Gera OTP e armazena no Redis
- Envia OTP (mock para desenvolvimento)
- Status: 200 (sempre retorna sucesso por segurança)

**POST /auth/verify-otp**

- Body: `{ email, otp }`
- Verifica OTP no Redis
- Se válido, retorna access token + refresh token
- Status: 200 (sucesso) ou 401 (OTP inválido/expirado)

**POST /auth/refresh**

- Body: `{ refreshToken }`
- Valida refresh token no Redis
- Gera novo access token
- Status: 200 (sucesso) ou 401 (token inválido)

**POST /auth/logout**

- Body: `{ refreshToken }`
- Remove refresh token do Redis
- Status: 200

### Auth Middleware

**Funcionalidades:**

1. **`authenticate`**: Verifica JWT e injeta usuário em `req.user`
2. **`requireRole(role)`**: Decorator para exigir role específica
3. **`requireAdmin`**: Helper para rotas apenas ADMIN
4. **`requireBarberOrAdmin`**: Helper para rotas BARBER ou ADMIN

---

## Configuração de Tokens

### Access Token (JWT)

- **Lifetime:** 15 minutos
- **Payload:** `{ userId, email, role, barbershopId }`
- **Storage:** Apenas no cliente (cookie ou localStorage)

### Refresh Token

- **Lifetime:** 7 dias
- **Format:** UUID único
- **Storage:** Redis com TTL de 7 dias
- **Key Pattern:** `refresh_token:{token}`

### OTP

- **Format:** 6 dígitos numéricos
- **Lifetime:** 5 minutos
- **Storage:** Redis com TTL de 5 minutos
- **Key Pattern:** `otp:{email}:{tenantSlug}`

---

## Dependências

Todas as dependências já estão instaladas:

- `@fastify/jwt`
- `bcryptjs`
- `zod`
- `@upstash/redis`

---

## Checklist de Testes

- [ ] OTP gerado e armazenado no Redis (NÃO PostgreSQL)
- [ ] OTP expira após 5 minutos
- [ ] Verificação de OTP funciona corretamente
- [ ] OTP inválido retorna erro 401
- [ ] Access token expira em 15 minutos
- [ ] Refresh token armazenado no Redis (7 dias)
- [ ] Refresh token funciona para renovar access token
- [ ] Logout invalida refresh token
- [ ] Rotas protegidas requerem autenticação
- [ ] Middleware de role funciona (ADMIN/BARBER)
- [ ] Hash de senha funciona corretamente
- [ ] Login com email/senha funciona
- [ ] Testes unitários para auth service passam
- [ ] Testes de integração para endpoints passam

---

## Observações Críticas

1. **OTP Storage:** OTP DEVE ser armazenado APENAS no Redis, nunca no PostgreSQL. Isso é crítico para segurança e performance.

2. **Token Security:** Refresh tokens devem ser únicos e armazenados no Redis para permitir revogação.

3. **Tenant Isolation:** Sempre validar que o usuário pertence ao tenant correto (`barbershopId`).

4. **Password Security:** Usar bcrypt com salt rounds adequado (10+).

5. **Rate Limiting:** Endpoints de autenticação devem ter rate limiting mais restritivo para prevenir brute force.

6. **Error Messages:** Não revelar se email existe ou não (por segurança).

---

## Próximos Passos

Após completar este milestone, o próximo será:

- **MILESTONE 4:** CRUD (Professionals, Clients, Services)
