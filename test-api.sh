#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuração
BASE_URL="http://localhost:3000/api"
TENANT_SLUG="barbearia-teste"

echo "🧪 Executando Testes da API - Shaving Project"
echo "=============================================="
echo ""

# Variáveis globais para armazenar tokens e IDs
ACCESS_TOKEN=""
REFRESH_TOKEN=""
PROFESSIONAL_ID=""
CLIENT_ID=""
SERVICE_ID=""
APPOINTMENT_ID=""
TRANSACTION_ID=""

# Função para testar endpoint
test_endpoint() {
    local test_name="$1"
    local expected_status="$2"
    local response="$3"
    local actual_status=$(echo "$response" | tail -n1)
    
    if [ "$actual_status" == "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} $test_name (HTTP $actual_status)"
        return 0
    else
        echo -e "${RED}✗${NC} $test_name (Expected: $expected_status, Got: $actual_status)"
        echo "Response: $response"
        return 1
    fi
}

echo "1️⃣  Teste: Health Check"
echo "------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/health)
test_endpoint "Health check" "200" "$RESPONSE"
echo ""

echo "2️⃣  Testes de Autenticação"
echo "------------------------"

# 2.1 Login válido
echo "2.1 Login com credenciais válidas..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-tenant-slug: $TENANT_SLUG" \
  -d '{
    "email": "admin@barbearia-teste.com",
    "password": "admin123"
  }')

STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$STATUS" == "200" ]; then
    ACCESS_TOKEN=$(echo "$BODY" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$BODY" | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✓${NC} Login bem-sucedido"
    echo "  Access Token: ${ACCESS_TOKEN:0:50}..."
else
    echo -e "${RED}✗${NC} Login falhou (HTTP $STATUS)"
    echo "$BODY"
fi
echo ""

# 2.2 Login inválido
echo "2.2 Login com senha incorreta..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-tenant-slug: $TENANT_SLUG" \
  -d '{
    "email": "admin@barbearia-teste.com",
    "password": "senhaerrada"
  }')
test_endpoint "Login com senha incorreta" "401" "$RESPONSE"
echo ""

# 2.3 Refresh token
if [ -n "$REFRESH_TOKEN" ]; then
    echo "2.3 Refresh token..."
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/refresh" \
      -H "Content-Type: application/json" \
      -H "x-tenant-slug: $TENANT_SLUG" \
      -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")
    test_endpoint "Refresh token" "200" "$RESPONSE"
    echo ""
fi

echo "3️⃣  Testes de Professionals"
echo "------------------------"

# 3.1 Listar professionals
echo "3.1 Listar professionals..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/professionals?page=1&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-slug: $TENANT_SLUG")
test_endpoint "Listar professionals" "200" "$RESPONSE"
echo ""

# 3.2 Criar professional
echo "3.2 Criar novo professional..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/professionals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-slug: $TENANT_SLUG" \
  -d '{
    "name": "João Barbeiro Teste",
    "email": "joao.teste@barbearia.com",
    "password": "senha123",
    "commissionRate": 40,
    "role": "BARBER"
  }')

STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$STATUS" == "201" ]; then
    PROFESSIONAL_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)
    echo -e "${GREEN}✓${NC} Professional criado (ID: $PROFESSIONAL_ID)"
else
    echo -e "${RED}✗${NC} Falha ao criar professional (HTTP $STATUS)"
fi
echo ""

echo "4️⃣  Testes de Clients"
echo "------------------------"

# 4.1 Criar cliente
echo "4.1 Criar novo cliente..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/clients" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-slug: $TENANT_SLUG" \
  -d '{
    "name": "Maria Cliente Teste",
    "phone": "11999888777"
  }')

STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$STATUS" == "201" ]; then
    CLIENT_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)
    echo -e "${GREEN}✓${NC} Cliente criado (ID: $CLIENT_ID)"
else
    echo -e "${RED}✗${NC} Falha ao criar cliente (HTTP $STATUS)"
fi
echo ""

# 4.2 Tentar criar cliente com telefone duplicado
echo "4.2 Tentar criar cliente com telefone duplicado..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/clients" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-slug: $TENANT_SLUG" \
  -d '{
    "name": "Outro Cliente",
    "phone": "11999888777"
  }')
test_endpoint "Rejeitar telefone duplicado" "409" "$RESPONSE"
echo ""

echo "5️⃣  Testes de Services"
echo "------------------------"

# 5.1 Criar serviço
echo "5.1 Criar novo serviço..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/services" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-slug: $TENANT_SLUG" \
  -d '{
    "name": "Corte Masculino Teste",
    "price": 45.00,
    "duration": 30
  }')

STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$STATUS" == "201" ]; then
    SERVICE_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)
    echo -e "${GREEN}✓${NC} Serviço criado (ID: $SERVICE_ID)"
else
    echo -e "${RED}✗${NC} Falha ao criar serviço (HTTP $STATUS)"
fi
echo ""

echo "6️⃣  Testes de Appointments"
echo "------------------------"

# 6.1 Criar agendamento
if [ -n "$PROFESSIONAL_ID" ] && [ -n "$CLIENT_ID" ] && [ -n "$SERVICE_ID" ]; then
    echo "6.1 Criar novo agendamento..."
    FUTURE_DATE=$(date -u -v+2d +"%Y-%m-%dT14:00:00Z" 2>/dev/null || date -u -d "+2 days" +"%Y-%m-%dT14:00:00Z")
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/appointments" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "x-tenant-slug: $TENANT_SLUG" \
      -d "{
        \"professionalId\": \"$PROFESSIONAL_ID\",
        \"clientId\": \"$CLIENT_ID\",
        \"serviceId\": \"$SERVICE_ID\",
        \"date\": \"$FUTURE_DATE\",
        \"notes\": \"Teste automatizado\"
      }")

    STATUS=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$STATUS" == "201" ]; then
        APPOINTMENT_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)
        echo -e "${GREEN}✓${NC} Agendamento criado (ID: $APPOINTMENT_ID)"
    else
        echo -e "${RED}✗${NC} Falha ao criar agendamento (HTTP $STATUS)"
        echo "$BODY"
    fi
    echo ""
    
    # 6.2 Atualizar status para COMPLETED
    if [ -n "$APPOINTMENT_ID" ]; then
        echo "6.2 Atualizar status para COMPLETED (calcular comissão)..."
        RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/appointments/$APPOINTMENT_ID/status" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $ACCESS_TOKEN" \
          -H "x-tenant-slug: $TENANT_SLUG" \
          -d '{"status": "COMPLETED"}')
        
        STATUS=$(echo "$RESPONSE" | tail -n1)
        BODY=$(echo "$RESPONSE" | head -n-1)
        
        if [ "$STATUS" == "200" ]; then
            COMMISSION=$(echo "$BODY" | grep -o '"commissionValue":[0-9.]*' | cut -d':' -f2)
            echo -e "${GREEN}✓${NC} Status atualizado (Comissão calculada: R\$ $COMMISSION)"
        else
            echo -e "${RED}✗${NC} Falha ao atualizar status (HTTP $STATUS)"
        fi
        echo ""
    fi
else
    echo -e "${YELLOW}⊘${NC} Pulando testes de appointments (faltam IDs necessários)"
    echo ""
fi

echo "7️⃣  Testes de Transactions"
echo "------------------------"

# 7.1 Criar transação
echo "7.1 Criar nova transação..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/transactions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-slug: $TENANT_SLUG" \
  -d '{
    "amount": 100.50,
    "type": "INCOME",
    "category": "SERVICO",
    "description": "Pagamento teste",
    "date": "2025-12-07T10:00:00Z",
    "paymentMethod": "PIX"
  }')

STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$STATUS" == "201" ]; then
    TRANSACTION_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)
    echo -e "${GREEN}✓${NC} Transação criada (ID: $TRANSACTION_ID)"
else
    echo -e "${RED}✗${NC} Falha ao criar transação (HTTP $STATUS)"
fi
echo ""

echo "8️⃣  Testes de Validação"
echo "------------------------"

# 8.1 Body inválido
echo "8.1 Validação Zod - body inválido..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/professionals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-slug: $TENANT_SLUG" \
  -d '{
    "name": "",
    "email": "email_invalido"
  }')
test_endpoint "Rejeitar body inválido" "400" "$RESPONSE"
echo ""

# 8.2 Sem tenant header
echo "8.2 Requisição sem tenant header..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/professionals" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
test_endpoint "Rejeitar sem tenant" "404" "$RESPONSE"
echo ""

echo "9️⃣  Teste de Barbershop"
echo "------------------------"

# 9.1 Obter dados da barbearia
echo "9.1 Obter dados da barbearia..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/barbershop" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-slug: $TENANT_SLUG")
test_endpoint "Obter barbershop" "200" "$RESPONSE"
echo ""

echo "=============================================="
echo "✅ Testes concluídos!"
echo ""
echo "📊 Resumo de IDs criados:"
echo "  Professional: $PROFESSIONAL_ID"
echo "  Cliente: $CLIENT_ID"
echo "  Serviço: $SERVICE_ID"
echo "  Agendamento: $APPOINTMENT_ID"
echo "  Transação: $TRANSACTION_ID"
