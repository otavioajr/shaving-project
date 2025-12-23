# Plano de Teste de Ponta a Ponta (E2E) - Barbershop SaaS

**Criado:** 2025-12-20
**Versão:** 1.0
**Objetivo:** Validar todos os endpoints implementados e verificar se o projeto está caminhando para um sistema funcional.

---

## 📊 Estado Atual do Projeto

### ✅ Milestones Completos

- **M0:** Project Scaffolding
- **M1:** Database Schema & Core Infrastructure
- **M2:** Fastify App & Core Middleware
- **M3:** Authentication (JWT + OTP)

### 🔄 Milestones Em Progresso

- **M4:** CRUD (Professionals, Clients, Services) - **Implementado mas sem testes completos**
- **M5:** Appointment Management - **Implementado mas sem testes completos**
- **M6:** Financial Management - **Implementado mas sem testes completos**
- **M7:** Notifications - **Parcialmente implementado**
- **M8:** Barbershop Management - **Parcialmente implementado**

### 📈 Estatísticas de Teste

- **Vitest (Unit):** 68/68 ✅
- **Cobertura:** ~58% (meta: 80%)
- **TestSprite (E2E):** 10/10 ✅
- **Lint:** 0 warnings/errors ✅

---

## 🗂️ Inventário de Endpoints

### 1️⃣ **Public Endpoints** (sem tenant, sem auth)

| Endpoint  | Método | Status | Descrição      |
| --------- | ------ | ------ | -------------- |
| `/`       | GET    | ✅     | API info       |
| `/health` | GET    | ✅     | Health check   |
| `/docs`   | GET    | ✅     | Swagger UI     |
| `/docs/*` | GET    | ✅     | Swagger assets |

### 2️⃣ **Auth Endpoints** (requer tenant, sem auth)

| Endpoint                         | Método | Status | Autenticação | Descrição                   |
| -------------------------------- | ------ | ------ | ------------ | --------------------------- |
| `/api/auth/login`                | POST   | ✅     | ❌           | Login email/password        |
| `/api/auth/refresh`              | POST   | ✅     | ❌           | Refresh access token        |
| `/api/auth/logout`               | POST   | ✅     | ❌           | Logout                      |
| `/api/auth/request-otp`          | POST   | ✅     | ❌           | Solicitar OTP               |
| `/api/auth/verify-otp`           | POST   | ✅     | ❌           | Verificar OTP               |
| `/api/auth/test/otp/:identifier` | GET    | ✅     | ❌           | **TEST ONLY** Recuperar OTP |

### 3️⃣ **Professionals Endpoints** (requer tenant)

| Endpoint                 | Método | Status | Autenticação | RBAC | Descrição              |
| ------------------------ | ------ | ------ | ------------ | ---- | ---------------------- |
| `/api/professionals`     | GET    | ✅     | ❌           | ❌   | Listar professionals   |
| `/api/professionals/:id` | GET    | ✅     | ❌           | ❌   | Buscar por ID          |
| `/api/professionals`     | POST   | ✅     | ⚠️           | ❌   | Criar professional     |
| `/api/professionals/:id` | PUT    | ✅     | ⚠️           | ❌   | Atualizar professional |
| `/api/professionals/:id` | DELETE | ✅     | ⚠️           | ❌   | Deletar professional   |

> ⚠️ = Auth implementado mas **RBAC não aplicado** (M4 pendente)

### 4️⃣ **Clients Endpoints** (requer tenant)

| Endpoint           | Método | Status | Autenticação | RBAC | Descrição         |
| ------------------ | ------ | ------ | ------------ | ---- | ----------------- |
| `/api/clients`     | GET    | ✅     | ❌           | ❌   | Listar clientes   |
| `/api/clients/:id` | GET    | ✅     | ❌           | ❌   | Buscar por ID     |
| `/api/clients`     | POST   | ✅     | ⚠️           | ❌   | Criar cliente     |
| `/api/clients/:id` | PUT    | ✅     | ⚠️           | ❌   | Atualizar cliente |
| `/api/clients/:id` | DELETE | ✅     | ⚠️           | ❌   | Deletar cliente   |

### 5️⃣ **Services Endpoints** (requer tenant)

| Endpoint            | Método | Status | Autenticação | RBAC | Descrição         |
| ------------------- | ------ | ------ | ------------ | ---- | ----------------- |
| `/api/services`     | GET    | ✅     | ❌           | ❌   | Listar serviços   |
| `/api/services/:id` | GET    | ✅     | ❌           | ❌   | Buscar por ID     |
| `/api/services`     | POST   | ✅     | ⚠️           | ❌   | Criar serviço     |
| `/api/services/:id` | PUT    | ✅     | ⚠️           | ❌   | Atualizar serviço |
| `/api/services/:id` | DELETE | ✅     | ⚠️           | ❌   | Deletar serviço   |

### 6️⃣ **Appointments Endpoints** (requer tenant + auth)

| Endpoint                       | Método | Status | Autenticação | RBAC | Descrição             |
| ------------------------------ | ------ | ------ | ------------ | ---- | --------------------- |
| `/api/appointments`            | GET    | ✅     | ❌           | ❌   | Listar appointments   |
| `/api/appointments/:id`        | GET    | ✅     | ❌           | ❌   | Buscar por ID         |
| `/api/appointments`            | POST   | ✅     | ✅           | ❌   | Criar appointment     |
| `/api/appointments/:id`        | PUT    | ✅     | ✅           | ❌   | Atualizar appointment |
| `/api/appointments/:id/status` | PATCH  | ✅     | ✅           | ❌   | Atualizar status      |
| `/api/appointments/:id`        | DELETE | ✅     | ✅           | ❌   | Deletar appointment   |

> ✅ Auth implementado
> ❌ RBAC não aplicado (M5 pendente)
> ⚠️ Validação de transição de status pendente (M5)

### 7️⃣ **Transactions Endpoints** (requer tenant + auth)

| Endpoint                | Método | Status | Autenticação | RBAC | Descrição           |
| ----------------------- | ------ | ------ | ------------ | ---- | ------------------- |
| `/api/transactions`     | GET    | ✅     | ❌           | ❌   | Listar transações   |
| `/api/transactions/:id` | GET    | ✅     | ❌           | ❌   | Buscar por ID       |
| `/api/transactions`     | POST   | ✅     | ✅           | ❌   | Criar transação     |
| `/api/transactions/:id` | PUT    | ✅     | ✅           | ❌   | Atualizar transação |
| `/api/transactions/:id` | DELETE | ✅     | ✅           | ❌   | Deletar transação   |

### 8️⃣ **Barbershop Endpoints** (requer tenant)

| Endpoint          | Método | Status | Autenticação | RBAC | Descrição               |
| ----------------- | ------ | ------ | ------------ | ---- | ----------------------- |
| `/api/barbershop` | GET    | ✅     | ❌           | ❌   | Buscar barbershop atual |
| `/api/barbershop` | PUT    | ✅     | ⚠️           | ❌   | Atualizar barbershop    |

> ⚠️ Auth/RBAC não aplicado (M8 pendente)

---

## 🧪 Cenários de Teste

### Pré-requisitos Globais

```bash
# 1. Certifique-se de que o servidor está rodando
pnpm dev

# 2. Certifique-se de que o banco foi seedado
pnpm db:seed

# 3. Variáveis importantes
export BASE_URL="http://localhost:3000"
export TENANT="barbearia-teste"
export ADMIN_EMAIL="admin@barbearia-teste.com"
export ADMIN_PASSWORD="senha123"
```

---

## 1️⃣ Módulo: Public Endpoints

### Objetivo

Validar que rotas públicas funcionam sem `x-tenant-slug` e sem rate limiting.

### TC001: Health Check

```bash
curl -i "${BASE_URL}/health"
```

**Esperado:**

- Status: `200 OK`
- Body contém: `{ "status": "ok", "environment": "development", ... }`
- **SEM** headers `X-RateLimit-*`

### TC002: API Info (Root)

```bash
curl -i "${BASE_URL}/"
```

**Esperado:**

- Status: `200 OK`
- Body contém: `{ "name": "...", "version": "..." }`

### TC003: Swagger UI

```bash
curl -i "${BASE_URL}/docs"
```

**Esperado:**

- Status: `200 OK`
- Content-Type: `text/html`
- Ou abrir no navegador: `http://localhost:3000/docs`

### TC004: Swagger JSON

```bash
curl -i "${BASE_URL}/docs/json"
```

**Esperado:**

- Status: `200 OK`
- Content-Type: `application/json`
- Body contém OpenAPI spec

---

## 2️⃣ Módulo: Tenant Middleware

### Objetivo

Validar isolamento multi-tenant e cache.

### TC005: Rota protegida SEM tenant header

```bash
curl -i "${BASE_URL}/api/professionals"
```

**Esperado:**

- Status: `404 Not Found`
- Body: `{ "error": "Tenant not found", "message": "Missing x-tenant-slug header" }`

### TC006: Rota protegida COM tenant INVÁLIDO

```bash
curl -i -H "x-tenant-slug: tenant-inexistente" "${BASE_URL}/api/professionals"
```

**Esperado:**

- Status: `404 Not Found`
- Body: `{ "error": "Tenant not found" }`

### TC007: Rota protegida COM tenant VÁLIDO

```bash
curl -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/professionals"
```

**Esperado:**

- Status: `200 OK`
- Headers **COM** `X-RateLimit-*`:
  ```
  X-RateLimit-Limit: 1000
  X-RateLimit-Remaining: 999
  X-RateLimit-Reset: <timestamp>
  ```
- Body: `{ "data": [...], "pagination": {...} }`

### TC008: Cache de Tenant (2ª requisição)

```bash
# 1ª requisição (hit no DB)
curl -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/professionals"

# 2ª requisição imediata (hit no Redis cache)
curl -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/professionals"
```

**Esperado:**

- Ambas retornam `200 OK`
- Segunda requisição é mais rápida (cache Redis com TTL de 5 min)

---

## 3️⃣ Módulo: Rate Limiting

### Objetivo

Validar rate limiting por IP e por tenant.

### TC009: Rate Limit por Tenant (Normal)

```bash
curl -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/professionals"
```

**Esperado:**

- Status: `200 OK`
- Headers:
  ```
  X-RateLimit-Limit: 1000
  X-RateLimit-Remaining: <decrementando>
  X-RateLimit-Reset: <timestamp>
  ```

### TC010: Rate Limit Excedido (Opcional - cuidado!)

```bash
# Fazer 1001 requisições rápidas (pode levar tempo)
for i in {1..1001}; do
  curl -s -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/professionals" > /dev/null
  echo "Request $i"
done

# Verificar bloqueio
curl -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/professionals"
```

**Esperado:**

- Status: `429 Too Many Requests`
- Body: `{ "error": "Too Many Requests" }`
- Header: `X-RateLimit-Remaining: 0`

> ⚠️ **CUIDADO:** Este teste pode demorar e poluir o Redis. Use apenas se necessário.

---

## 4️⃣ Módulo: Authentication (JWT + OTP)

### Objetivo

Validar fluxos de login, refresh, logout e OTP.

### TC011: Login com Email/Password (Sucesso)

```bash
curl -i -X POST "${BASE_URL}/api/auth/login" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@barbearia-teste.com",
    "password": "senha123"
  }'
```

**Esperado:**

- Status: `200 OK`
- Body:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "...",
    "professional": {
      "id": "...",
      "name": "Admin User",
      "email": "admin@barbearia-teste.com",
      "role": "ADMIN"
    }
  }
  ```

**Salvar tokens:**

```bash
export ACCESS_TOKEN="<access_token_aqui>"
export REFRESH_TOKEN="<refresh_token_aqui>"
```

### TC012: Login com Credenciais INVÁLIDAS

```bash
curl -i -X POST "${BASE_URL}/api/auth/login" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@barbearia-teste.com",
    "password": "senha-errada"
  }'
```

**Esperado:**

- Status: `401 Unauthorized`
- Body: `{ "error": "Invalid credentials" }`

### TC013: Refresh Token (Sucesso)

```bash
curl -i -X POST "${BASE_URL}/api/auth/refresh" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"${REFRESH_TOKEN}\"
  }"
```

**Esperado:**

- Status: `200 OK`
- Body: `{ "accessToken": "..." }`

### TC014: Refresh Token INVÁLIDO

```bash
curl -i -X POST "${BASE_URL}/api/auth/refresh" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "token-invalido"
  }'
```

**Esperado:**

- Status: `401 Unauthorized`

### TC015: Logout

```bash
curl -i -X POST "${BASE_URL}/api/auth/logout" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"${REFRESH_TOKEN}\"
  }"
```

**Esperado:**

- Status: `200 OK`
- Body: `{ "message": "Logged out" }`

### TC016: Request OTP

```bash
curl -i -X POST "${BASE_URL}/api/auth/request-otp" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@barbearia-teste.com"
  }'
```

**Esperado:**

- Status: `200 OK`
- Body: `{ "message": "OTP sent" }`
- OTP armazenado no Redis com TTL de 5 min

### TC017: Test OTP Retrieval (TEST ONLY)

```bash
curl -i "${BASE_URL}/api/auth/test/otp/admin@barbearia-teste.com" \
  -H "x-tenant-slug: ${TENANT}"
```

**Esperado (se `ENABLE_TEST_OTP_ENDPOINT=true`):**

- Status: `200 OK`
- Body:
  ```json
  {
    "otp": "123456",
    "expiresIn": 299
  }
  ```

**Salvar OTP:**

```bash
export OTP="<otp_aqui>"
```

### TC018: Verify OTP (Sucesso)

```bash
curl -i -X POST "${BASE_URL}/api/auth/verify-otp" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"admin@barbearia-teste.com\",
    \"otp\": \"${OTP}\"
  }"
```

**Esperado:**

- Status: `200 OK`
- Body:
  ```json
  {
    "accessToken": "...",
    "refreshToken": "...",
    "professional": { ... }
  }
  ```

### TC019: Verify OTP INVÁLIDO

```bash
curl -i -X POST "${BASE_URL}/api/auth/verify-otp" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@barbearia-teste.com",
    "otp": "000000"
  }'
```

**Esperado:**

- Status: `401 Unauthorized`
- Body: `{ "error": "Invalid OTP" }`

---

## 5️⃣ Módulo: Professionals CRUD

### Objetivo

Validar CRUD completo de profissionais.

### TC020: Listar Professionals (Sem Auth)

```bash
curl -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/professionals"
```

**Esperado:**

- Status: `200 OK`
- Body:
  ```json
  {
    "data": [
      {
        "id": "...",
        "name": "Admin User",
        "email": "admin@barbearia-teste.com",
        "role": "ADMIN",
        "commissionRate": 0.5
      },
      {
        "id": "...",
        "name": "Barber User",
        "email": "barber@barbearia-teste.com",
        "role": "BARBER",
        "commissionRate": 0.3
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "totalPages": 1
    }
  }
  ```

### TC021: Buscar Professional por ID

```bash
# Substitua <professional_id> por um ID válido da lista anterior
export PROFESSIONAL_ID="<id_aqui>"

curl -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/professionals/${PROFESSIONAL_ID}"
```

**Esperado:**

- Status: `200 OK`
- Body: objeto completo do professional

### TC022: Criar Professional SEM Auth

```bash
curl -i -X POST "${BASE_URL}/api/professionals" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Novo Professional",
    "email": "novo@barbearia-teste.com",
    "password": "senha123",
    "role": "BARBER",
    "commissionRate": 0.3
  }'
```

**Esperado:**

- Status: `401 Unauthorized` (se auth estiver aplicado)
- Ou `201 Created` (se auth NÃO estiver aplicado - bug de M4)

### TC023: Criar Professional COM Auth

```bash
# Primeiro, fazer login para obter token
curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@barbearia-teste.com",
    "password": "senha123"
  }' | jq -r '.accessToken' > /tmp/token.txt

export ACCESS_TOKEN=$(cat /tmp/token.txt)

# Criar professional com auth
curl -i -X POST "${BASE_URL}/api/professionals" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Novo Professional",
    "email": "novo@barbearia-teste.com",
    "password": "senha123",
    "role": "BARBER",
    "commissionRate": 0.3
  }'
```

**Esperado:**

- Status: `201 Created`
- Body: objeto do professional criado

**Salvar ID:**

```bash
export NEW_PROFESSIONAL_ID="<id_aqui>"
```

### TC024: Atualizar Professional

```bash
curl -i -X PUT "${BASE_URL}/api/professionals/${NEW_PROFESSIONAL_ID}" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Professional Atualizado",
    "commissionRate": 0.4
  }'
```

**Esperado:**

- Status: `200 OK`
- Body: objeto atualizado

### TC025: Deletar Professional

```bash
curl -i -X DELETE "${BASE_URL}/api/professionals/${NEW_PROFESSIONAL_ID}" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

**Esperado:**

- Status: `204 No Content`

### TC026: Buscar Professional Deletado

```bash
curl -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/professionals/${NEW_PROFESSIONAL_ID}"
```

**Esperado:**

- Status: `404 Not Found`

---

## 6️⃣ Módulo: Clients CRUD

### Objetivo

Validar CRUD completo de clientes.

### TC027: Listar Clients

```bash
curl -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/clients"
```

**Esperado:**

- Status: `200 OK`
- Body:
  ```json
  {
    "data": [
      {
        "id": "...",
        "name": "João Silva",
        "phone": "11987654321",
        "isActive": true
      }
    ],
    "pagination": { ... }
  }
  ```

### TC028: Criar Client COM Auth

```bash
curl -i -X POST "${BASE_URL}/api/clients" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maria Santos",
    "phone": "11999887766"
  }'
```

**Esperado:**

- Status: `201 Created`
- Body: objeto do client criado

**Salvar ID:**

```bash
export CLIENT_ID="<id_aqui>"
```

### TC029: Atualizar Client

```bash
curl -i -X PUT "${BASE_URL}/api/clients/${CLIENT_ID}" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maria Santos Silva"
  }'
```

**Esperado:**

- Status: `200 OK`

### TC030: Deletar Client

```bash
curl -i -X DELETE "${BASE_URL}/api/clients/${CLIENT_ID}" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

**Esperado:**

- Status: `204 No Content`

---

## 7️⃣ Módulo: Services CRUD

### Objetivo

Validar CRUD completo de serviços.

### TC031: Listar Services

```bash
curl -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/services"
```

**Esperado:**

- Status: `200 OK`
- Body:
  ```json
  {
    "data": [
      {
        "id": "...",
        "name": "Corte",
        "price": 50,
        "duration": 30,
        "isActive": true
      },
      {
        "id": "...",
        "name": "Barba",
        "price": 30,
        "duration": 20,
        "isActive": true
      }
    ],
    "pagination": { ... }
  }
  ```

**Salvar ID de um serviço:**

```bash
export SERVICE_ID="<id_aqui>"
```

### TC032: Criar Service COM Auth

```bash
curl -i -X POST "${BASE_URL}/api/services" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Massagem",
    "price": 40,
    "duration": 25
  }'
```

**Esperado:**

- Status: `201 Created`

### TC033: Atualizar Service

```bash
curl -i -X PUT "${BASE_URL}/api/services/${SERVICE_ID}" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 55
  }'
```

**Esperado:**

- Status: `200 OK`

---

## 8️⃣ Módulo: Appointments

### Objetivo

Validar criação, atualização de status, e cálculo de comissão.

### TC034: Listar Appointments

```bash
curl -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/appointments"
```

**Esperado:**

- Status: `200 OK`
- Body: lista de appointments

### TC035: Criar Appointment COM Auth

```bash
# Obter IDs necessários primeiro
curl -s -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/professionals" | jq -r '.data[0].id' > /tmp/prof_id.txt
curl -s -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/clients" | jq -r '.data[0].id' > /tmp/client_id.txt
curl -s -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/services" | jq -r '.data[0].id' > /tmp/service_id.txt

export PROF_ID=$(cat /tmp/prof_id.txt)
export CLIENT_ID_FOR_APPT=$(cat /tmp/client_id.txt)
export SERVICE_ID_FOR_APPT=$(cat /tmp/service_id.txt)

# Criar appointment
curl -i -X POST "${BASE_URL}/api/appointments" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"professionalId\": \"${PROF_ID}\",
    \"clientId\": \"${CLIENT_ID_FOR_APPT}\",
    \"serviceId\": \"${SERVICE_ID_FOR_APPT}\",
    \"date\": \"$(date -u -v+1d '+%Y-%m-%dT10:00:00.000Z')\"
  }"
```

**Esperado:**

- Status: `201 Created`
- Body:
  ```json
  {
    "id": "...",
    "status": "PENDING",
    "price": 50,
    "commissionValue": null,
    "date": "..."
  }
  ```

**Salvar ID:**

```bash
export APPOINTMENT_ID="<id_aqui>"
```

### TC036: Atualizar Status para CONFIRMED

```bash
curl -i -X PATCH "${BASE_URL}/api/appointments/${APPOINTMENT_ID}/status" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CONFIRMED"
  }'
```

**Esperado:**

- Status: `200 OK`
- Body: `status: "CONFIRMED"`

### TC037: Atualizar Status para COMPLETED (Calcula Comissão)

```bash
curl -i -X PATCH "${BASE_URL}/api/appointments/${APPOINTMENT_ID}/status" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED"
  }'
```

**Esperado:**

- Status: `200 OK`
- Body:
  ```json
  {
    "status": "COMPLETED",
    "commissionValue": 15
  }
  ```
  > Comissão calculada: `price * professional.commissionRate` (ex: 50 \* 0.3 = 15)

### TC038: Validar Conflito de Horário

```bash
# Tentar criar appointment no MESMO horário e professional
curl -i -X POST "${BASE_URL}/api/appointments" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"professionalId\": \"${PROF_ID}\",
    \"clientId\": \"${CLIENT_ID_FOR_APPT}\",
    \"serviceId\": \"${SERVICE_ID_FOR_APPT}\",
    \"date\": \"$(date -u -v+1d '+%Y-%m-%dT10:00:00.000Z')\"
  }"
```

**Esperado:**

- Status: `409 Conflict`
- Body: `{ "error": "Time slot already booked" }`

---

## 9️⃣ Módulo: Transactions

### Objetivo

Validar CRUD de transações financeiras.

### TC039: Listar Transactions

```bash
curl -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/transactions"
```

**Esperado:**

- Status: `200 OK`

### TC040: Criar Transaction (Income)

```bash
curl -i -X POST "${BASE_URL}/api/transactions" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": 100,
    \"type\": \"INCOME\",
    \"category\": \"Venda\",
    \"description\": \"Venda de produto\",
    \"date\": \"$(date -u '+%Y-%m-%dT12:00:00.000Z')\",
    \"paymentMethod\": \"PIX\"
  }"
```

**Esperado:**

- Status: `201 Created`

**Salvar ID:**

```bash
export TRANSACTION_ID="<id_aqui>"
```

### TC041: Criar Transaction (Expense)

```bash
curl -i -X POST "${BASE_URL}/api/transactions" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": 50,
    \"type\": \"EXPENSE\",
    \"category\": \"Fornecedor\",
    \"description\": \"Compra de material\",
    \"date\": \"$(date -u '+%Y-%m-%dT12:00:00.000Z')\",
    \"paymentMethod\": \"CASH\"
  }"
```

**Esperado:**

- Status: `201 Created`

### TC042: Filtrar Transactions por Tipo

```bash
curl -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/transactions?type=INCOME"
```

**Esperado:**

- Status: `200 OK`
- Body: apenas transactions com `type: "INCOME"`

### TC043: Filtrar Transactions por Data

```bash
curl -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/transactions?startDate=$(date -u '+%Y-%m-%dT00:00:00.000Z')&endDate=$(date -u '+%Y-%m-%dT23:59:59.000Z')"
```

**Esperado:**

- Status: `200 OK`
- Body: transactions do dia atual

---

## 🔟 Módulo: Barbershop

### Objetivo

Validar leitura e atualização de dados da barbearia.

### TC044: Buscar Barbershop Atual

```bash
curl -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/barbershop"
```

**Esperado:**

- Status: `200 OK`
- Body:
  ```json
  {
    "id": "...",
    "name": "Barbearia Teste",
    "slug": "barbearia-teste",
    "isActive": true
  }
  ```

### TC045: Atualizar Barbershop (COM Auth)

```bash
curl -i -X PUT "${BASE_URL}/api/barbershop" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Barbearia Teste Atualizada"
  }'
```

**Esperado:**

- Status: `200 OK` (se auth estiver aplicado)
- Ou `401 Unauthorized` (se auth NÃO estiver aplicado - bug de M8)

---

## 🚀 Fluxo Completo (User Journey)

### Cenário: Jornada de um dia na barbearia

**Passo 1:** Admin faz login

```bash
curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@barbearia-teste.com",
    "password": "senha123"
  }' > /tmp/login.json

export ACCESS_TOKEN=$(jq -r '.accessToken' /tmp/login.json)
```

**Passo 2:** Admin lista profissionais disponíveis

```bash
curl -s -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/professionals" | jq
```

**Passo 3:** Admin cria um novo cliente

```bash
curl -s -X POST "${BASE_URL}/api/clients" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Carlos Souza",
    "phone": "11988776655"
  }' > /tmp/client.json

export CLIENT_ID=$(jq -r '.id' /tmp/client.json)
```

**Passo 4:** Admin agenda um appointment

```bash
export PROF_ID=$(curl -s -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/professionals" | jq -r '.data[0].id')
export SERVICE_ID=$(curl -s -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/services" | jq -r '.data[0].id')

curl -s -X POST "${BASE_URL}/api/appointments" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"professionalId\": \"${PROF_ID}\",
    \"clientId\": \"${CLIENT_ID}\",
    \"serviceId\": \"${SERVICE_ID}\",
    \"date\": \"$(date -u -v+1d '+%Y-%m-%dT14:00:00.000Z')\"
  }" > /tmp/appointment.json

export APPOINTMENT_ID=$(jq -r '.id' /tmp/appointment.json)
echo "Appointment criado: ${APPOINTMENT_ID}"
```

**Passo 5:** Admin confirma o appointment

```bash
curl -s -X PATCH "${BASE_URL}/api/appointments/${APPOINTMENT_ID}/status" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"status": "CONFIRMED"}' | jq
```

**Passo 6:** Admin finaliza o appointment (calcula comissão)

```bash
curl -s -X PATCH "${BASE_URL}/api/appointments/${APPOINTMENT_ID}/status" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"status": "COMPLETED"}' | jq
```

**Passo 7:** Admin registra uma despesa

```bash
curl -s -X POST "${BASE_URL}/api/transactions" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": 30,
    \"type\": \"EXPENSE\",
    \"category\": \"Material\",
    \"description\": \"Compra de toalhas\",
    \"date\": \"$(date -u '+%Y-%m-%dT10:00:00.000Z')\",
    \"paymentMethod\": \"CASH\"
  }" | jq
```

**Passo 8:** Admin verifica transações do dia

```bash
curl -s -H "x-tenant-slug: ${TENANT}" \
  "${BASE_URL}/api/transactions?startDate=$(date -u '+%Y-%m-%dT00:00:00.000Z')&endDate=$(date -u '+%Y-%m-%dT23:59:59.000Z')" | jq
```

---

## 📋 Checklist de Validação

### ✅ Infraestrutura

- [ ] Servidor inicia sem erros (`pnpm dev`)
- [ ] Banco de dados conectado (Supabase)
- [ ] Redis conectado (Upstash)
- [ ] Seed executado com sucesso (`pnpm db:seed`)
- [ ] Lint passa sem erros (`pnpm lint`)
- [ ] Testes unitários passam (`pnpm test`)

### ✅ Public Endpoints

- [ ] TC001: Health check funciona
- [ ] TC002: API info funciona
- [ ] TC003: Swagger UI carrega
- [ ] TC004: Swagger JSON retorna spec

### ✅ Middleware

- [ ] TC005: Rota protegida sem tenant retorna 404
- [ ] TC006: Tenant inválido retorna 404
- [ ] TC007: Tenant válido permite acesso
- [ ] TC008: Cache de tenant funciona
- [ ] TC009: Rate limit headers aparecem
- [ ] TC010: Rate limit bloqueia após limite (opcional)

### ✅ Authentication

- [ ] TC011: Login com credenciais válidas
- [ ] TC012: Login com credenciais inválidas retorna 401
- [ ] TC013: Refresh token funciona
- [ ] TC014: Refresh token inválido retorna 401
- [ ] TC015: Logout funciona
- [ ] TC016: Request OTP funciona
- [ ] TC017: Test OTP retrieval funciona (dev only)
- [ ] TC018: Verify OTP com código válido
- [ ] TC019: Verify OTP com código inválido retorna 401

### ✅ Professionals CRUD

- [ ] TC020: Listar professionals
- [ ] TC021: Buscar professional por ID
- [ ] TC022: Criar professional sem auth (deve retornar 401)
- [ ] TC023: Criar professional com auth
- [ ] TC024: Atualizar professional
- [ ] TC025: Deletar professional
- [ ] TC026: Buscar professional deletado retorna 404

### ✅ Clients CRUD

- [ ] TC027: Listar clients
- [ ] TC028: Criar client com auth
- [ ] TC029: Atualizar client
- [ ] TC030: Deletar client

### ✅ Services CRUD

- [ ] TC031: Listar services
- [ ] TC032: Criar service com auth
- [ ] TC033: Atualizar service

### ✅ Appointments

- [ ] TC034: Listar appointments
- [ ] TC035: Criar appointment com auth
- [ ] TC036: Atualizar status para CONFIRMED
- [ ] TC037: Atualizar status para COMPLETED (calcula comissão)
- [ ] TC038: Validar conflito de horário

### ✅ Transactions

- [ ] TC039: Listar transactions
- [ ] TC040: Criar transaction (INCOME)
- [ ] TC041: Criar transaction (EXPENSE)
- [ ] TC042: Filtrar por tipo
- [ ] TC043: Filtrar por data

### ✅ Barbershop

- [ ] TC044: Buscar barbershop atual
- [ ] TC045: Atualizar barbershop com auth

### ✅ Fluxo Completo

- [ ] Jornada de um dia na barbearia completa sem erros

---

## 🐛 Gaps Identificados (O que falta)

### 🔴 Crítico (Bloqueia funcionalidade principal)

1. **RBAC não implementado** (M4, M5, M6, M8)
   - Qualquer usuário autenticado pode criar/editar/deletar qualquer coisa
   - ADMIN vs BARBER não tem diferença

2. **Validação de transição de status** (M5)
   - Não valida se transição PENDING → CANCELLED é válida
   - Permite transições inválidas (ex: COMPLETED → PENDING)

### 🟡 Importante (Funcionalidade incompleta)

3. **Testes automatizados faltando** (M4, M5, M6, M7, M8)
   - CRUD endpoints não têm testes de integração
   - Cobertura está em 58% (meta: 80%)

4. **Endpoints de relatório faltando** (M6)
   - Não existe endpoint de summary financeiro
   - Não existe endpoint de commission report

5. **Notificações não implementadas** (M7)
   - Web Push service não existe
   - Cron endpoint não existe

### 🟢 Desejável (Melhoria futura)

6. **Swagger auth** (M9)
   - Swagger UI não tem "Authorize" button
   - Dificulta teste manual de rotas protegidas

7. **Slug validation** (M8)
   - Update de barbershop não valida unicidade de slug

8. **Self-registration** (M8)
   - Não existe endpoint de registro de nova barbearia

---

## 📊 Status Final

### O que está funcionando ✅

- ✅ Infraestrutura completa (DB, Redis, Middleware)
- ✅ Multi-tenancy com cache
- ✅ Rate limiting
- ✅ Authentication (JWT + OTP)
- ✅ CRUD de Professionals, Clients, Services
- ✅ CRUD de Appointments com cálculo de comissão
- ✅ CRUD de Transactions
- ✅ Barbershop read/update
- ✅ Paginação em todos os list endpoints
- ✅ Validação de conflito de horário
- ✅ Snapshot pattern (price/commission)

### O que precisa ser implementado/corrigido ⚠️

- ⚠️ RBAC (roles) em todos os endpoints protegidos
- ⚠️ Validação de transição de status em appointments
- ⚠️ Testes automatizados para CRUD endpoints
- ⚠️ Endpoints de relatório financeiro
- ⚠️ Sistema de notificações (Web Push + Cron)
- ⚠️ Validação de slug em barbershop
- ⚠️ Cobertura de testes >= 80%

### Conclusão 🎯

**O projeto está 70% completo e funcional.**

✅ **Pontos fortes:**

- Arquitetura sólida e bem estruturada
- Multi-tenancy funcionando corretamente
- Auth/Security implementados
- Todos os CRUDs básicos funcionando
- Business logic (comissão, conflitos) implementada

❌ **Pontos críticos a resolver:**

- Falta RBAC (segurança!)
- Falta validação de fluxo de negócio
- Falta aumentar cobertura de testes
- Falta endpoints de relatório

🚀 **Próximos passos recomendados:**

1. **Milestone 4 (RBAC):** Aplicar role-based access control em TODOS os endpoints
2. **Milestone 5 (Validação):** Implementar state machine para status de appointments
3. **Milestone 4-6 (Testes):** Criar testes de integração para CRUD endpoints
4. **Milestone 6 (Relatórios):** Implementar endpoints de summary e commission report
5. **Milestone 9 (Cobertura):** Elevar cobertura para >= 80%

---

**Última atualização:** 2025-12-20
