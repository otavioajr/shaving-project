#!/bin/bash

# E2E Test Runner - Barbershop SaaS Platform
# Executa testes de ponta a ponta dos principais endpoints

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
TENANT="${TENANT:-barbearia-teste}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@barbearia-teste.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-senha123}"

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print test header
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Function to print test result
print_test() {
    local test_name="$1"
    local expected_status="$2"
    local actual_status="$3"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$expected_status" == "$actual_status" ]; then
        echo -e "${GREEN}✓ $test_name - PASSED${NC} (Status: $actual_status)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ $test_name - FAILED${NC} (Expected: $expected_status, Got: $actual_status)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to extract HTTP status code
get_status() {
    echo "$1" | head -n 1 | cut -d' ' -f2
}

# Check if server is running
print_header "PRÉ-REQUISITOS"
echo "Verificando se o servidor está rodando..."
if ! curl -s -f "${BASE_URL}/health" > /dev/null; then
    echo -e "${RED}✗ Servidor não está rodando em ${BASE_URL}${NC}"
    echo "Execute: pnpm dev"
    exit 1
fi
echo -e "${GREEN}✓ Servidor está rodando${NC}"

# ============================================
# PUBLIC ENDPOINTS
# ============================================
print_header "1. PUBLIC ENDPOINTS"

# TC001: Health Check
response=$(curl -s -i "${BASE_URL}/health")
status=$(get_status "$response")
print_test "TC001: Health Check" "200" "$status"

# TC002: API Info
response=$(curl -s -i "${BASE_URL}/")
status=$(get_status "$response")
print_test "TC002: API Info (Root)" "200" "$status"

# TC003: Swagger UI
response=$(curl -s -i "${BASE_URL}/docs")
status=$(get_status "$response")
print_test "TC003: Swagger UI" "200" "$status"

# TC004: Swagger JSON
response=$(curl -s -i "${BASE_URL}/docs/json")
status=$(get_status "$response")
print_test "TC004: Swagger JSON" "200" "$status"

# ============================================
# TENANT MIDDLEWARE
# ============================================
print_header "2. TENANT MIDDLEWARE"

# TC005: Rota protegida SEM tenant
response=$(curl -s -i "${BASE_URL}/api/professionals")
status=$(get_status "$response")
print_test "TC005: Rota protegida SEM tenant" "404" "$status"

# TC006: Tenant inválido
response=$(curl -s -i -H "x-tenant-slug: tenant-invalido" "${BASE_URL}/api/professionals")
status=$(get_status "$response")
print_test "TC006: Tenant INVÁLIDO" "404" "$status"

# TC007: Tenant válido
response=$(curl -s -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/professionals")
status=$(get_status "$response")
print_test "TC007: Tenant VÁLIDO" "200" "$status"

# ============================================
# AUTHENTICATION
# ============================================
print_header "3. AUTHENTICATION"

# TC011: Login com credenciais válidas
response=$(curl -s -i -X POST "${BASE_URL}/api/auth/login" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${ADMIN_EMAIL}\",
    \"password\": \"${ADMIN_PASSWORD}\"
  }")
status=$(get_status "$response")
print_test "TC011: Login com credenciais VÁLIDAS" "200" "$status"

# Extract access token
ACCESS_TOKEN=$(echo "$response" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo "$response" | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${YELLOW}⚠ Não foi possível extrair access token. Alguns testes serão pulados.${NC}"
fi

# TC012: Login com credenciais inválidas
response=$(curl -s -i -X POST "${BASE_URL}/api/auth/login" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${ADMIN_EMAIL}\",
    \"password\": \"senha-errada\"
  }")
status=$(get_status "$response")
print_test "TC012: Login com credenciais INVÁLIDAS" "401" "$status"

# TC013: Refresh token
if [ -n "$REFRESH_TOKEN" ]; then
    response=$(curl -s -i -X POST "${BASE_URL}/api/auth/refresh" \
      -H "x-tenant-slug: ${TENANT}" \
      -H "Content-Type: application/json" \
      -d "{\"refreshToken\": \"${REFRESH_TOKEN}\"}")
    status=$(get_status "$response")
    print_test "TC013: Refresh token" "200" "$status"
fi

# TC016: Request OTP
response=$(curl -s -i -X POST "${BASE_URL}/api/auth/request-otp" \
  -H "x-tenant-slug: ${TENANT}" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${ADMIN_EMAIL}\"}")
status=$(get_status "$response")
print_test "TC016: Request OTP" "200" "$status"

# ============================================
# PROFESSIONALS CRUD
# ============================================
print_header "4. PROFESSIONALS CRUD"

# TC020: Listar professionals
response=$(curl -s -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/professionals")
status=$(get_status "$response")
print_test "TC020: Listar professionals" "200" "$status"

# TC021: Buscar professional por ID (usar primeiro da lista)
PROF_ID=$(curl -s -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/professionals" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$PROF_ID" ]; then
    response=$(curl -s -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/professionals/${PROF_ID}")
    status=$(get_status "$response")
    print_test "TC021: Buscar professional por ID" "200" "$status"
fi

# TC023: Criar professional COM auth
if [ -n "$ACCESS_TOKEN" ]; then
    response=$(curl -s -i -X POST "${BASE_URL}/api/professionals" \
      -H "x-tenant-slug: ${TENANT}" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{
        \"name\": \"Test Professional $(date +%s)\",
        \"email\": \"test$(date +%s)@${TENANT}.com\",
        \"password\": \"senha123\",
        \"role\": \"BARBER\",
        \"commissionRate\": 0.3
      }")
    status=$(get_status "$response")
    print_test "TC023: Criar professional COM auth" "201" "$status"

    # Extract new professional ID
    NEW_PROF_ID=$(echo "$response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

    # TC024: Atualizar professional
    if [ -n "$NEW_PROF_ID" ]; then
        response=$(curl -s -i -X PUT "${BASE_URL}/api/professionals/${NEW_PROF_ID}" \
          -H "x-tenant-slug: ${TENANT}" \
          -H "Authorization: Bearer ${ACCESS_TOKEN}" \
          -H "Content-Type: application/json" \
          -d '{"name": "Professional Atualizado"}')
        status=$(get_status "$response")
        print_test "TC024: Atualizar professional" "200" "$status"

        # TC025: Deletar professional
        response=$(curl -s -i -X DELETE "${BASE_URL}/api/professionals/${NEW_PROF_ID}" \
          -H "x-tenant-slug: ${TENANT}" \
          -H "Authorization: Bearer ${ACCESS_TOKEN}")
        status=$(get_status "$response")
        print_test "TC025: Deletar professional" "204" "$status"

        # TC026: Buscar professional deletado
        response=$(curl -s -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/professionals/${NEW_PROF_ID}")
        status=$(get_status "$response")
        print_test "TC026: Buscar professional DELETADO" "404" "$status"
    fi
fi

# ============================================
# CLIENTS CRUD
# ============================================
print_header "5. CLIENTS CRUD"

# TC027: Listar clients
response=$(curl -s -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/clients")
status=$(get_status "$response")
print_test "TC027: Listar clients" "200" "$status"

# TC028: Criar client COM auth
if [ -n "$ACCESS_TOKEN" ]; then
    response=$(curl -s -i -X POST "${BASE_URL}/api/clients" \
      -H "x-tenant-slug: ${TENANT}" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{
        \"name\": \"Test Client $(date +%s)\",
        \"phone\": \"11$(date +%s | tail -c 10)\"
      }")
    status=$(get_status "$response")
    print_test "TC028: Criar client COM auth" "201" "$status"

    # Extract client ID
    CLIENT_ID=$(echo "$response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

    # TC029: Atualizar client
    if [ -n "$CLIENT_ID" ]; then
        response=$(curl -s -i -X PUT "${BASE_URL}/api/clients/${CLIENT_ID}" \
          -H "x-tenant-slug: ${TENANT}" \
          -H "Authorization: Bearer ${ACCESS_TOKEN}" \
          -H "Content-Type: application/json" \
          -d '{"name": "Client Atualizado"}')
        status=$(get_status "$response")
        print_test "TC029: Atualizar client" "200" "$status"

        # TC030: Deletar client
        response=$(curl -s -i -X DELETE "${BASE_URL}/api/clients/${CLIENT_ID}" \
          -H "x-tenant-slug: ${TENANT}" \
          -H "Authorization: Bearer ${ACCESS_TOKEN}")
        status=$(get_status "$response")
        print_test "TC030: Deletar client" "204" "$status"
    fi
fi

# ============================================
# SERVICES CRUD
# ============================================
print_header "6. SERVICES CRUD"

# TC031: Listar services
response=$(curl -s -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/services")
status=$(get_status "$response")
print_test "TC031: Listar services" "200" "$status"

# TC032: Criar service COM auth
if [ -n "$ACCESS_TOKEN" ]; then
    response=$(curl -s -i -X POST "${BASE_URL}/api/services" \
      -H "x-tenant-slug: ${TENANT}" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{
        \"name\": \"Test Service $(date +%s)\",
        \"price\": 50,
        \"duration\": 30
      }")
    status=$(get_status "$response")
    print_test "TC032: Criar service COM auth" "201" "$status"

    # Extract service ID
    SERVICE_ID=$(echo "$response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

    # TC033: Atualizar service
    if [ -n "$SERVICE_ID" ]; then
        response=$(curl -s -i -X PUT "${BASE_URL}/api/services/${SERVICE_ID}" \
          -H "x-tenant-slug: ${TENANT}" \
          -H "Authorization: Bearer ${ACCESS_TOKEN}" \
          -H "Content-Type: application/json" \
          -d '{"price": 60}')
        status=$(get_status "$response")
        print_test "TC033: Atualizar service" "200" "$status"
    fi
fi

# ============================================
# APPOINTMENTS
# ============================================
print_header "7. APPOINTMENTS"

# TC034: Listar appointments
response=$(curl -s -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/appointments")
status=$(get_status "$response")
print_test "TC034: Listar appointments" "200" "$status"

# TC035: Criar appointment COM auth
if [ -n "$ACCESS_TOKEN" ]; then
    # Get IDs from seed data
    PROF_ID=$(curl -s -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/professionals" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    CLIENT_ID_APPT=$(curl -s -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/clients" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    SERVICE_ID_APPT=$(curl -s -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/services" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

    if [ -n "$PROF_ID" ] && [ -n "$CLIENT_ID_APPT" ] && [ -n "$SERVICE_ID_APPT" ]; then
        # Create appointment for tomorrow at 10:00
        TOMORROW=$(date -u -v+1d '+%Y-%m-%dT10:00:00.000Z' 2>/dev/null || date -u -d '+1 day' '+%Y-%m-%dT10:00:00.000Z')

        response=$(curl -s -i -X POST "${BASE_URL}/api/appointments" \
          -H "x-tenant-slug: ${TENANT}" \
          -H "Authorization: Bearer ${ACCESS_TOKEN}" \
          -H "Content-Type: application/json" \
          -d "{
            \"professionalId\": \"${PROF_ID}\",
            \"clientId\": \"${CLIENT_ID_APPT}\",
            \"serviceId\": \"${SERVICE_ID_APPT}\",
            \"date\": \"${TOMORROW}\"
          }")
        status=$(get_status "$response")
        print_test "TC035: Criar appointment COM auth" "201" "$status"

        # Extract appointment ID
        APPOINTMENT_ID=$(echo "$response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

        # TC036: Atualizar status para CONFIRMED
        if [ -n "$APPOINTMENT_ID" ]; then
            response=$(curl -s -i -X PATCH "${BASE_URL}/api/appointments/${APPOINTMENT_ID}/status" \
              -H "x-tenant-slug: ${TENANT}" \
              -H "Authorization: Bearer ${ACCESS_TOKEN}" \
              -H "Content-Type: application/json" \
              -d '{"status": "CONFIRMED"}')
            status=$(get_status "$response")
            print_test "TC036: Atualizar status para CONFIRMED" "200" "$status"

            # TC037: Atualizar status para COMPLETED (calcula comissão)
            response=$(curl -s -i -X PATCH "${BASE_URL}/api/appointments/${APPOINTMENT_ID}/status" \
              -H "x-tenant-slug: ${TENANT}" \
              -H "Authorization: Bearer ${ACCESS_TOKEN}" \
              -H "Content-Type: application/json" \
              -d '{"status": "COMPLETED"}')
            status=$(get_status "$response")
            print_test "TC037: Atualizar status para COMPLETED" "200" "$status"
        fi
    fi
fi

# ============================================
# TRANSACTIONS
# ============================================
print_header "8. TRANSACTIONS"

# TC039: Listar transactions
response=$(curl -s -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/transactions")
status=$(get_status "$response")
print_test "TC039: Listar transactions" "200" "$status"

# TC040: Criar transaction (INCOME)
if [ -n "$ACCESS_TOKEN" ]; then
    TODAY=$(date -u '+%Y-%m-%dT12:00:00.000Z')

    response=$(curl -s -i -X POST "${BASE_URL}/api/transactions" \
      -H "x-tenant-slug: ${TENANT}" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{
        \"amount\": 100,
        \"type\": \"INCOME\",
        \"category\": \"Venda\",
        \"description\": \"Test transaction $(date +%s)\",
        \"date\": \"${TODAY}\",
        \"paymentMethod\": \"PIX\"
      }")
    status=$(get_status "$response")
    print_test "TC040: Criar transaction (INCOME)" "201" "$status"

    # TC041: Criar transaction (EXPENSE)
    response=$(curl -s -i -X POST "${BASE_URL}/api/transactions" \
      -H "x-tenant-slug: ${TENANT}" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{
        \"amount\": 50,
        \"type\": \"EXPENSE\",
        \"category\": \"Material\",
        \"description\": \"Test expense $(date +%s)\",
        \"date\": \"${TODAY}\",
        \"paymentMethod\": \"CASH\"
      }")
    status=$(get_status "$response")
    print_test "TC041: Criar transaction (EXPENSE)" "201" "$status"

    # TC042: Filtrar por tipo
    response=$(curl -s -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/transactions?type=INCOME")
    status=$(get_status "$response")
    print_test "TC042: Filtrar transactions por tipo" "200" "$status"
fi

# ============================================
# BARBERSHOP
# ============================================
print_header "9. BARBERSHOP"

# TC044: Buscar barbershop atual
response=$(curl -s -i -H "x-tenant-slug: ${TENANT}" "${BASE_URL}/api/barbershop")
status=$(get_status "$response")
print_test "TC044: Buscar barbershop atual" "200" "$status"

# TC045: Atualizar barbershop
if [ -n "$ACCESS_TOKEN" ]; then
    response=$(curl -s -i -X PUT "${BASE_URL}/api/barbershop" \
      -H "x-tenant-slug: ${TENANT}" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{"name": "Barbearia Teste"}')
    status=$(get_status "$response")
    print_test "TC045: Atualizar barbershop" "200" "$status"
fi

# ============================================
# SUMMARY
# ============================================
print_header "RESUMO DOS TESTES"
echo ""
echo -e "Total de testes: ${TOTAL_TESTS}"
echo -e "${GREEN}Testes passados: ${PASSED_TESTS}${NC}"
echo -e "${RED}Testes falhos: ${FAILED_TESTS}${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ TODOS OS TESTES PASSARAM!${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}✗ ALGUNS TESTES FALHARAM${NC}"
    echo ""
    exit 1
fi
