# EspoCRM Integration — Ruhvi Customer Support

**Hybrid architecture:** Supabase stays the single source of truth for customers,
orders, wallet, wishlist, etc. EspoCRM (deployed on the VPS at
`crm.support.ruhvi.in`) is used **only by support agents** as a ticket management
console. The existing customer-facing support portal at `support.ruhvi.in` is
unchanged.

## Architecture

```
┌─────────────────────────────────────┐          ┌──────────────────────────────────┐
│  support.ruhvi.in (Vercel/Next.js)  │          │ crm.support.ruhvi.in (VPS)       │
│                                     │  HTTPS   │                                  │
│  ┌───────────────────────────────┐  │  REST +  │  ┌──────────────────────────────┐ │
│  │ Supabase (Postgres)           │  │ Webhook  │  │ EspoCRM (Apache/PHP)         │ │
│  │  • customers (source of truth)│  │◄────────►│  │  • Cases (tickets)           │ │
│  │  • orders                     │  │ HMAC     │  │  • Notes (messages)          │ │
│  │  • wallet/rewards             │  │ signed   │  │  • Custom fields:            │ │
│  │  • support_tickets (synced)   │  │          │  │    ruhviTicketId_c           │ │
│  │  • support_messages (synced)  │  │          │  │    ruhviStatus_c             │ │
│  └───────────────────────────────┘  │          │  │    ruhviCustomerEmail_c      │ │
│                                     │          │  └──────────────────────────────┘ │
│  ┌───────────────────────────────┐  │          │  ┌──────────────────────────────┐ │
│  │ EspoCRM integration lib:      │  │          │  │ Custom extension (PHP):      │ │
│  │  src/lib/espo/                │──┼──────────┼─►│  • Hooks: Case/Note AfterSave│ │
│  │  • client.ts  (REST API)      │  │          │  │  → POST to Ruhvi webhook     │ │
│  │  • sync.ts   (orchestrator)   │──┼──────────┼─►│  • Controller: RuhviContext   │ │
│  │  • crypto.ts (HMAC signing)   │  │          │  │  → proxies context API       │ │
│  │  • mapping.ts(stat/priority)  │  │          │  │  • Panel: ruhvi-context       │ │
│  └───────────────────────────────┘  │          │  │  → shows customer/orders     │ │
│                                     │          │  └──────────────────────────────┘ │
│  ┌───────────────────────────────┐  │          │  ┌──────────────────────────────┐ │
│  │ Integration API routes:       │  │          │  │ MariaDB (MySQL)              │ │
│  │  /api/integrations/espo/      │  │          │  │  • Cases, Notes, Users       │ │
│  │  • context   (GET, read)      │◄─┼──────────┼──│  • Links via ruhviTicketId_c │ │
│  │  • webhook   (POST, inbound)  │──┼──────────┼─►│  (no customer/order dup)     │ │
│  │  • health    (GET, status)    │  │          │  └──────────────────────────────┘ │
│  └───────────────────────────────┘  │          │  ┌──────────────────────────────┐ │
│                                     │          │  │ Caddy (TLS reverse proxy)    │ │
│  Existing APIs (unchanged):         │          │  │  • Auto-TLS via Let's Encrypt│ │
│  • /api/support/tickets/*           │          │  │  • Port 80→443 redirect      │ │
│  • /api/support/chat/*              │          │  └──────────────────────────────┘ │
│  • /api/support/analytics           │          │  └──────────────────────────────────┘
└─────────────────────────────────────┘
```

## Data flow

### Outbound (Ruhvi → EspoCRM)

Non-blocking, fire-and-forget, gated by `ESPO_ENABLED=true`. Errors are logged
and swallowed; existing API flows never break.

| Trigger | Action | File |
|---------|--------|------|
| Ticket created (POST /api/support/tickets) | `syncTicketToEspo()` → create Case in EspoCRM, store `espo_case_id` | `src/app/api/support/tickets/route.ts` |
| Ticket created (AI chat) | `syncTicketToEspo()` → same | `src/app/api/support/chat/route.ts` |
| Ticket updated (PATCH /api/support/tickets/[id]) | `pushTicketUpdateToEspo()` → update Case status/priority | `src/app/api/support/tickets/[id]/route.ts` |
| Message added (POST /api/support/tickets/[id]/messages) | `pushMessageToEspo()` → add Note to Case | `src/app/api/support/tickets/[id]/messages/route.ts` |

### Inbound (EspoCRM → Ruhvi)

Agent updates a Case in EspoCRM → the custom PHP hook fires an HTTP POST to
`/api/integrations/espo/webhook` → the Supabase ticket is updated:

| Event | What gets updated in Supabase | File |
|-------|-------------------------------|------|
| Case.status changes | `support_tickets.status` (prefers `ruhviStatus_c` canonical field) | `src/app/api/integrations/espo/webhook/route.ts` |
| Case.priority changes | `support_tickets.priority` | same |
| Case.assignedUserId changes | `support_tickets.assigned_to` (mapped) | same |
| Note created on a Case | `support_messages` (internal note) | same |

### Context (read-only, EspoCRM → Ruhvi)

The Ruhvi context panel in the EspoCRM Case detail view calls the Ruhvi context
API (via the `RuhviContext` PHP controller which proxies to the Ruhvi Next.js
endpoint) to display live customer/order/wallet/rewards data. **No data is
duplicated in EspoCRM's MySQL database.** The API is secured by the shared
`ESPO_WEBHOOK_SECRET` (or `ESPO_API_KEY`).

## Files

### Next.js / Vercel (this repo)

```
src/lib/espo/
├── config.ts    — env var configuration (server-only)
├── types.ts     — integration types (EspoCasePayload, etc.)
├── crypto.ts    — HMAC sign/verify for webhook security
├── client.ts    — EspoCRM REST API client (Case create/update, Note add, find)
├── mapping.ts   — status/priority mapping (Ruhvi ↔ EspoCRM)
└── sync.ts      — outbound sync orchestrator (pushTicketToEspo, pushMessageToEspo, etc.)

src/app/api/integrations/espo/
├── context/route.ts   — GET: customer/order/wallet context (called by EspoCRM panel)
├── webhook/route.ts   — POST: inbound webhook (Case/Note events from EspoCRM)
└── health/route.ts    — GET: integration health check

supabase/migrations/0062_espo_integration.sql
  — adds espo_case_id, espo_synced_at, espo_last_sync_error to support_tickets
  — creates espo_sync_log table for audit
  — creates get_customer_context() RPC
```

### VPS (EspoCRM deployment)

```
deploy/esporcrm/
├── docker-compose.yml          — EspoCRM + MariaDB + Caddy
├── Caddyfile                   — TLS reverse proxy (crm.support.ruhvi.in)
├── .env.example                — env template (secrets)
├── setup.sh                    — one-shot bootstrap script
├── README.md                   — deployment instructions
├── extension/                  — EspoCRM backend extension
│   └── Espo/Custom/
│       ├── Hooks/Case/AfterSave.php    — sends Case events to Ruhvi webhook
│       ├── Hooks/Note/AfterSave.php    — sends Note events to Ruhvi webhook
│       ├── Controllers/RuhviContext.php — proxies context API (no auth leak)
│       └── Resources/metadata/
│           ├── entityDefs/Case.json   — custom fields (ruhviTicketId_c, etc.)
│           └── clientDefs/Case.json   — panel config (detail side panel)
└── client-custom/              — EspoCRM frontend
    ├── src/views/case/ruhvi-context.js   — Backbone view for context panel
    └── templates/case/ruhvi-context.tpl  — Handlebars template
```

## Environment Variables

### Vercel (Ruhvi Next.js)

| Variable | Default | Description |
|----------|---------|-------------|
| `ESPO_ENABLED` | `false` | Set to `true` to activate outbound sync |
| `ESPO_BASE_URL` | `https://crm.support.ruhvi.in` | EspoCRM instance URL |
| `ESPO_API_KEY` | — | API Key from Admin → API Credentials in EspoCRM |
| `ESPO_WEBHOOK_SECRET` | — | Shared HMAC secret (must match the VPS `.env`) |
| `RUHVI_BASE_URL` | `https://support.ruhvi.in` | Used by EspoCRM extension to call back |
| `ESPO_DEFAULT_ASSIGNEE_EMAIL` | — | Optional default EspoCRM user for ticket assignment |

### VPS (EspoCRM .env)

See `deploy/esporcrm/.env.example`.

## Setup Steps

1. **VPS:** run `deploy/esporcrm/setup.sh` on the VPS → Docker + docker-compose,
   generate secrets, start the stack.
2. **EspoCRM:** complete the web installer at `https://crm.support.ruhvi.in`.
3. **EspoCRM Admin → API Credentials:** create an API Key → set `ESPO_API_KEY` in
   `.env` and `docker compose up -d`.
4. **EspoCRM Admin → Entity Manager → Case:** verify the custom fields exist
   (provisioned by the extension metadata; run `php app.php rebuild` in the
   container if needed).
5. **EspoCRM Admin → Roles:** create a `Ruhvi Support` role with Case/Note access
   for agents only.
6. **EspoCRM:** ensure the `status` field options include: New, Assigned, In
   Process, Pending, On Hold, Closed, Reopened.
7. **Vercel:** add the env vars above to the Ruhvi project (Production +
   Preview).
8. **DNS:** ensure `crm.support.ruhvi.in` points to the VPS IP (A record) and
   `support.ruhvi.in` points to Vercel.
9. **Deploy:** push the updated code to Vercel (the migration is run via
   `supabase db push`).
10. **Test:** create a support ticket on `support.ruhvi.in` → verify it appears
    as a Case in `crm.support.ruhvi.in`.

## Security

- **API keys:** EspoCRM API key is generated in EspoCRM Admin and stored in the
  VPS `.env` and the Vercel project env (never in code).
- **Webhook HMAC:** every payload is signed with HMAC-SHA256 using the shared
  webhook secret. The receiving endpoint verifies the signature before processing.
- **Context API:** requires either `X-Api-Key` (matching `ESPO_API_KEY`) or a
  valid HMAC signature; a stale timestamp is rejected (max 5 minutes drift).
- **No data duplication:** the EspoCRM MySQL DB only stores Case/Note records.
  Customer/order/wallet data is fetched live from Supabase via the context API;
  the EspoCRM extension protects the API key by proxying through the server-side
  PHP controller.
- **RLS:** the `espo_sync_log` table has RLS policies (staff-only SELECT).
  Service-role code (webhook handler, context API) bypasses RLS with the
  service role key.