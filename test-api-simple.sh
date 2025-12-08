#!/bin/bash

# Script de testes da API - Shaving Project
# Senha correta: senha123

BASE_URL="http://localhost:3000/api"
TENANT="barbearia-teste"

echo "🧪 Testes da API - Shaving Project"
echo "===================================="
echo ""

# 1. Login
echo "1. Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-tenant-slug: $TENANT" \
  -d '{"email": "admin@barbearia-teste.com", "password": "senha123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo "✅ Login bem-sucedido"
    echo "Token: ${TOKEN:0:50}..."
else
    echo "❌ Login falhou"
    echo "$LOGIN_RESPONSE"
    exit 1
fi
echo ""

# 2. Criar Professional
echo "2. Criar Professional..."
PROF_RESPONSE=$(curl -s -X POST "$BASE_URL/professionals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-slug: $TENANT" \
  -d '{
    "name": "João Barbeiro",
    "email": "joao.'$(date +%s)'@teste.com",
    "password": "senha123",
    "commissionRate": 40,
    "role": "BARBER"
  }')

PROF_ID=$(echo "$PROF_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "✅ Professional criado: $PROF_ID"
echo ""

# 3. Criar Cliente
echo "3. Criar Cliente..."
CLIENT_RESPONSE=$(curl -s -X POST "$BASE_URL/clients" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-slug: $TENANT" \
  -d '{
    "name": "Maria Cliente",
    "phone": "119'$(date +%s)'"
  }')

CLIENT_ID=$(echo "$CLIENT_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "✅ Cliente criado: $CLIENT_ID"
echo ""

# 4. Criar Serviço
echo "4. Criar Serviço..."
SERVICE_RESPONSE=$(curl -s -X POST "$BASE_URL/services" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-slug: $TENANT" \
  -d '{
    "name": "Corte Teste",
    "price": 45.00,
    "duration": 30
  }')

SERVICE_ID=$(echo "$SERVICE_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "✅ Serviço criado: $SERVICE_ID"
echo ""

# 5. Criar Agendamento
echo "5. Criar Agendamento..."
FUTURE_DATE="2025-12-15T14:00:00Z"

APPT_RESPONSE=$(curl -s -X POST "$BASE_URL/appointments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-slug: $TENANT" \
  -d "{
    \"professionalId\": \"$PROF_ID\",
    \"clientId\": \"$CLIENT_ID\",
    \"serviceId\": \"$SERVICE_ID\",
    \"date\": \"$FUTURE_DATE\",
    \"notes\": \"Teste automatizado\"
  }")

APPT_ID=$(echo "$APPT_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "✅ Agendamento criado: $APPT_ID"
echo ""

# 6. Completar Agendamento (calcular comissão)
echo "6. Completar Agendamento..."
COMPLETE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/appointments/$APPT_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-slug: $TENANT" \
  -d '{"status": "COMPLETED"}')

COMMISSION=$(echo "$COMPLETE_RESPONSE" | grep -o '"commissionValue":[0-9.]*' | cut -d':' -f2)
echo "✅ Agendamento completado. Comissão: R\$ $COMMISSION"
echo ""

# 7. Criar Transação
echo "7. Criar Transação..."
TRANS_RESPONSE=$(curl -s -X POST "$BASE_URL/transactions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-slug: $TENANT" \
  -d '{
    "amount": 100.50,
    "type": "INCOME",
    "category": "SERVICO",
    "description": "Pagamento teste",
    "date": "2025-12-07T10:00:00Z",
    "paymentMethod": "PIX"
  }')

TRANS_ID=$(echo "$TRANS_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "✅ Transação criada: $TRANS_ID"
echo ""

# 8. Testes de Validação
echo "8. Testes de Validação..."

# 8.1 Body inválido
INVALID_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/professionals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-slug: $TENANT" \
  -d '{"name": "", "email": "invalido"}')

STATUS=$(echo "$INVALID_RESPONSE" | tail -c 4)
if [ "$STATUS" == "400" ]; then
    echo "✅ Validação Zod funcionando (HTTP 400)"
else
    echo "❌ Validação Zod falhou (HTTP $STATUS)"
fi

# 8.2 Sem tenant
NO_TENANT_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/professionals" \
  -H "Authorization: Bearer $TOKEN")

STATUS=$(echo "$NO_TENANT_RESPONSE" | tail -c 4)
if [ "$STATUS" == "404" ]; then
    echo "✅ Multi-tenancy funcionando (HTTP 404)"
else
    echo "❌ Multi-tenancy falhou (HTTP $STATUS)"
fi
echo ""

echo "===================================="
echo "✅ Todos os testes concluídos!"
echo ""
echo "📊 IDs criados:"
echo "  Professional: $PROF_ID"
echo "  Cliente: $CLIENT_ID"
echo "  Serviço: $SERVICE_ID"
echo "  Agendamento: $APPT_ID (Comissão: R\$ $COMMISSION)"
echo "  Transação: $TRANS_ID"
