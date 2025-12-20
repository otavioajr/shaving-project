# MILESTONE 7: Notifications (Web Push + Cron)

## Pré-Requisitos - Leitura Obrigatória

Antes de iniciar este milestone, LEIA os seguintes arquivos para contexto completo:

1. **[principal-plan.md](principal-plan.md)** - Visão geral do projeto, arquitetura, tech stack e regras críticas
2. **[DEVELOPMENT.md](../DEVELOPMENT.md)** - Status atual dos milestones e o que já foi implementado
3. **[CHANGELOG.md](../CHANGELOG.md)** - Histórico detalhado de todas as mudanças feitas no projeto

---

## Objetivo

Implementar sistema de notificações push usando Web Push API e endpoint de cron para enviar lembretes automáticos de agendamentos próximos.

---

## Arquivos a Criar

### Service
1. **`/packages/backend/src/services/notification.service.ts`**
   - Envio de push notifications
   - Gerenciamento de subscriptions
   - Validação de VAPID keys

### Controller
2. **`/packages/backend/src/controllers/notification.controller.ts`**
   - Endpoint para salvar push subscription

### Cron Endpoint
3. **`/packages/backend/api/cron/notify.ts`**
   - Endpoint protegido por CRON_SECRET
   - Busca appointments próximos
   - Envia notificações

### Schema
4. **`/packages/backend/src/schemas/notification.schema.ts`**
   - Validação Zod para subscription

---

## Web Push API

### VAPID Keys

**Variáveis de Ambiente:**
- `VAPID_PUBLIC_KEY`: Chave pública VAPID
- `VAPID_PRIVATE_KEY`: Chave privada VAPID
- `VAPID_SUBJECT`: Email ou URL do serviço (ex: `mailto:admin@example.com`)

**Geração:**
```bash
npx web-push generate-vapid-keys
```

### Push Subscription

**Armazenamento:**
- Campo `pushSubscription` no modelo `Client`
- Formato JSON string (Web Push subscription object)

**Estrutura:**
```typescript
{
  endpoint: string,
  keys: {
    p256dh: string,
    auth: string
  }
}
```

---

## Endpoints

### POST /clients/:id/push-subscription
- Params: `id` (client ID)
- Body: `{ subscription: PushSubscription }`
- Auth: Requerida
- Role: Qualquer
- Ação: Salva/atualiza push subscription do client
- Retorna: Client atualizado

**Nota:** Este endpoint pode ser adicionado ao controller de clients ou criar controller separado.

---

## Cron Endpoint

### POST /api/cron/notify
- Header: `x-cron-secret: ${CRON_SECRET}`
- Auth: NÃO requerida (protegido por secret)
- Ação: Envia lembretes de appointments próximos
- Retorna: `{ sent: number, errors: number }`

**Configuração Vercel (`vercel.json`):**
```json
{
  "crons": [
    {
      "path": "/api/cron/notify",
      "schedule": "* * * * *"
    }
  ]
}
```

**Schedule:** Executa a cada 1 minuto

---

## Implementação

### Notification Service

**Funcionalidades:**

1. **`sendNotification(subscription, payload, options?)`**
   - Envia push notification usando `web-push`
   - Trata erros (subscription inválida, expirada, etc.)

2. **`sendAppointmentReminder(client, appointment)`**
   - Envia lembrete de appointment próximo
   - Payload: título e mensagem formatada

3. **`validateSubscription(subscription)`**
   - Valida formato da subscription
   - Verifica campos obrigatórios

### Cron Logic

**Fluxo:**

1. Validar `CRON_SECRET` no header
2. Buscar appointments com:
   - `status = CONFIRMED`
   - `date` entre agora e 15 minutos no futuro
   - `client.pushSubscription IS NOT NULL`
3. Para cada appointment:
   - Buscar client com subscription
   - Enviar push notification
   - Registrar sucesso/erro
4. Retornar estatísticas

**Mensagem de Lembrete:**
```
Título: "Lembrete de Agendamento"
Mensagem: "Você tem um agendamento em 15 minutos com {professional.name} - {service.name}"
```

---

## Web Push Library

**Biblioteca:** `web-push`

**Configuração:**
```typescript
import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);
```

**Envio:**
```typescript
await webpush.sendNotification(
  subscription,
  JSON.stringify(payload)
);
```

---

## Tratamento de Erros

### Subscription Inválida
- Remover subscription do client
- Logar erro
- Continuar com próximos

### Erros Comuns
- `410 Gone`: Subscription expirada → remover
- `404 Not Found`: Subscription inválida → remover
- `429 Too Many Requests`: Rate limit → aguardar
- Outros: Logar e continuar

---

## Dependências

Todas as dependências já estão instaladas:
- `web-push`
- `@prisma/client`

---

## Checklist de Testes

- [ ] Push subscription salva corretamente no client
- [ ] Validação de subscription funciona
- [ ] Envio de push notification funciona
- [ ] VAPID keys configuradas corretamente
- [ ] Cron endpoint protegido por CRON_SECRET
- [ ] Cron sem secret retorna 401
- [ ] Cron busca appointments próximos corretamente
- [ ] Lembretes enviados para clients com subscription
- [ ] Subscription inválida removida automaticamente
- [ ] Erros tratados corretamente
- [ ] Estatísticas retornadas corretamente
- [ ] Testes unitários para notification service passam
- [ ] Testes de integração para cron passam

---

## Observações Críticas

1. **VAPID Keys:** Gerar keys únicas para cada ambiente (dev/prod). Nunca commitar keys privadas.

2. **Cron Secret:** `CRON_SECRET` deve ser forte e único. Vercel injeta automaticamente, mas validar no código.

3. **Subscription Management:** Subscriptions podem expirar. Sempre tratar erros 410/404 removendo subscription inválida.

4. **Rate Limiting:** Web Push providers têm rate limits. Implementar retry com backoff se necessário.

5. **Privacy:** Não enviar dados sensíveis em push notifications. Apenas informações básicas.

6. **Testing:** Em desenvolvimento, usar ferramentas como `web-push-testing` ou serviços de teste.

7. **Performance:** Cron executa a cada minuto. Garantir que processamento seja rápido (< 10s para evitar timeout Vercel).

---

## Configuração Vercel

**Atualizar `vercel.json`:**
```json
{
  "crons": [
    {
      "path": "/api/cron/notify",
      "schedule": "* * * * *"
    }
  ]
}
```

**Variáveis de Ambiente no Vercel:**
- `CRON_SECRET`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

---

## Próximos Passos

Após completar este milestone, o próximo será:
- **MILESTONE 8:** Barbershop Management
