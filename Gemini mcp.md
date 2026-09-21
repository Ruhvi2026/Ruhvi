# Ruhvi Codebase Inspection Summary

### 1. Database Schemas / Column Names

Database migrations are located under `supabase/migrations/`. Below are the column definitions for the specified tables:

#### Table: `coupons`
* **Source:** `0001_phase0_foundation.sql`, `0005_phase4_money_features.sql`, `0041_coupons_is_public.sql`
```sql
id                    uuid PRIMARY KEY DEFAULT gen_random_uuid()
code                  text UNIQUE NOT NULL
discount_type         text NOT NULL ('percentage' | 'fixed' | 'flat')
discount_value        numeric(12,2) NOT NULL
min_order_value       numeric(12,2) DEFAULT 0.00
min_order_amount      numeric(12,2) -- Used in MCP & API queries
usage_limit_total     integer
usage_limit_per_user  integer DEFAULT 1
usage_count           integer DEFAULT 0
applicable_to         text DEFAULT 'all'
expiry_date           timestamptz
expires_at            timestamptz
cod_charge_waiver     boolean NOT NULL DEFAULT false
active                boolean NOT NULL DEFAULT true
is_active             boolean DEFAULT true
is_public             boolean DEFAULT true
created_at            timestamptz NOT NULL DEFAULT now()
```

#### Table: `orders`
* **Source:** `0001_phase0_foundation.sql`, `0064_support_system_v2.sql`, `src/types/database.ts`
```sql
id                             uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id                        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
customer_email                 text
order_number                   text UNIQUE NOT NULL
status                         order_status NOT NULL DEFAULT 'pending'
subtotal                       numeric(12,2) NOT NULL
shipping_charge                numeric(12,2) NOT NULL DEFAULT 0.00
cod_charge                     numeric(12,2) NOT NULL DEFAULT 0.00
coupon_discount                numeric(12,2) NOT NULL DEFAULT 0.00
wallet_used                    numeric(12,2) NOT NULL DEFAULT 0.00
coins_redeemed                 integer NOT NULL DEFAULT 0
gst_amount                     numeric(12,2) NOT NULL DEFAULT 0.00
total / total_amount           numeric(12,2) NOT NULL
currency                       text DEFAULT 'INR'
payment_method                 payment_method NOT NULL DEFAULT 'phonepe'
payment_status                 payment_status NOT NULL DEFAULT 'pending'
gift_wrap                      boolean NOT NULL DEFAULT false
gift_message                   text
shipping_address_id            uuid REFERENCES public.addresses(id) ON DELETE SET NULL
shiprocket_order_id            text
shiprocket_shipment_id         text
awb_code                       text
courier_name                   text
confirmed_at / shipped_at...   timestamptz
created_at                     timestamptz NOT NULL DEFAULT now()
updated_at                     timestamptz NOT NULL DEFAULT now()
```

#### Table: `support_tickets`
* **Source:** `0032_support_ticket_system.sql`, `0033_guest_tickets_and_secure_view.sql`, `0064_support_system_v2.sql`
```sql
id                            uuid PRIMARY KEY DEFAULT gen_random_uuid()
ticket_number                 text UNIQUE NOT NULL DEFAULT public.generate_ticket_number()
customer_id                   uuid REFERENCES public.users(id) ON DELETE CASCADE
customer_email                text
guest_email                   text
guest_phone                   text
guest_name                    text
order_id                      uuid REFERENCES public.orders(id) ON DELETE SET NULL
product_id                    uuid REFERENCES public.products(id) ON DELETE SET NULL
category_id                   uuid REFERENCES public.support_categories(id) ON DELETE SET NULL
subcategory_id                uuid REFERENCES public.support_categories(id) ON DELETE SET NULL
subject / title               text NOT NULL
description                   text NOT NULL
ai_summary                    text
priority                      text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
status                        text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'open', 'in_progress', 'waiting_for_customer', 'waiting_for_team', 'resolved', 'closed', 'reopened', 'rejected', 'duplicate'))
source                        text NOT NULL DEFAULT 'ai_chat' CHECK (source IN ('ai_chat', 'manual', 'email'))
assigned_to                   uuid REFERENCES public.users(id) ON DELETE SET NULL
close_reason                  text CHECK (close_reason IN ('resolved', 'auto_closed_no_reply', 'rejected', 'duplicate', 'closed_by_staff'))
resolution_note               text
pending_customer_reply_since  timestamptz
auto_close_eligible_until     timestamptz
created_at                    timestamptz NOT NULL DEFAULT now()
updated_at                    timestamptz NOT NULL DEFAULT now()
first_response_at             timestamptz
resolved_at                   timestamptz
closed_at                     timestamptz
sla_due_at                    timestamptz DEFAULT (now() + interval '24 hours')
sla_breached                  boolean NOT NULL DEFAULT false
ai_created                    boolean NOT NULL DEFAULT false
ai_conversation_id            text
```

#### Table: `users` (Customers)
* **Source:** `0001_phase0_foundation.sql`, `0005_phase4_money_features.sql`, `0064_support_system_v2.sql`, `0080_customer_tags_segments.sql`
```sql
id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
full_name       text
email           text
phone           text
role            user_role NOT NULL DEFAULT 'customer' ('customer' | 'staff' | 'manager' | 'admin')
wallet_balance  numeric(12,2) NOT NULL DEFAULT 0.00
reward_coins    integer NOT NULL DEFAULT 0
referral_code   text UNIQUE
firebase_uid    text
espo_contact_id text
espo_user_id    text
team            text
tags            text[] DEFAULT '{}'
segment         text
created_at      timestamptz NOT NULL DEFAULT now()
updated_at      timestamptz NOT NULL DEFAULT now()
```

#### Tables: `wallets` and `rewards`
Balances are maintained directly on `users` (`wallet_balance` and `reward_coins`), and transaction ledgers track historical changes:

* **`wallet_ledger`**
  ```sql
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
  order_id    uuid REFERENCES public.orders(id) ON DELETE SET NULL
  amount      numeric(12,2) NOT NULL
  type        wallet_ledger_type NOT NULL ('credit', 'debit', 'cashback')
  created_at  timestamptz NOT NULL DEFAULT now()
  ```
* **`reward_coin_ledger`**
  ```sql
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
  order_id     uuid REFERENCES public.orders(id) ON DELETE SET NULL
  amount       integer NOT NULL
  type         coin_ledger_type NOT NULL ('earned', 'redeemed', 'expired', 'cashback')
  expiry_date  timestamptz
  created_at   timestamptz NOT NULL DEFAULT now()
  ```

---

### 2. MCP Server Implementation

* **MCP Tool Definitions & Handlers:** `src/lib/ai/mcp-tools.ts`
* **MCP Auth & Scope Guard:** `src/lib/ai/mcp-auth.ts`
* **MCP API Endpoint Route:** `src/app/api/mcp/route.ts`
* **Brevo MCP Helper:** `src/lib/brevo/mcp.ts`

#### Exact ORM / SQL Queries in `mcp-tools.ts`:

##### 1. `get_coupons` (Lines 615–633 in `mcp-tools.ts`)
```typescript
const supabase = getServiceClient();
const now = new Date().toISOString();

let query = supabase
  .from('coupons')
  .select(
    'id, code, discount_type, discount_value, min_order_amount, usage_count, usage_limit, expires_at, is_active'
  )
  .order('created_at', { ascending: false })
  .limit(limit);

if (active_only) {
  query = query
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`);
}

const { data, error } = await query;
```

##### 2. `get_orders` (Lines 269–287 in `mcp-tools.ts`)
```typescript
const supabase = getServiceClient();
const offset = (page - 1) * limit;

let query = supabase
  .from('orders')
  .select(
    'id, order_number, status, total_amount, currency, customer_email, created_at, updated_at',
    { count: 'exact' }
  )
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);

if (status) query = query.eq('status', status);
if (customer_email) query = query.eq('customer_email', customer_email);
if (date_from) query = query.gte('created_at', `${date_from}T00:00:00Z`);
if (date_to) query = query.lte('created_at', `${date_to}T23:59:59Z`);

const { data, error, count } = await query;
```

##### 3. `get_support_tickets` (Lines 474–490 in `mcp-tools.ts`)
```typescript
const supabase = getServiceClient();
const offset = (page - 1) * limit;

let query = supabase
  .from('support_tickets')
  .select(
    'id, ticket_number, subject, status, priority, customer_email, created_at, updated_at',
    { count: 'exact' }
  )
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);

if (status) query = query.eq('status', status);

const { data, error, count } = await query;
```

---

### 3. Messaging Services (WhatsApp & Push Notifications)

Both services are implemented in the codebase:

#### WhatsApp Integration
* **Core Helper / Client:** `src/lib/whatsapp.ts` (Calls Meta Graph API v19.0 with sandbox fallback logging when credentials are absent)
* **Webhooks & APIs:**
  * Incoming Webhook: `src/app/api/webhooks/whatsapp/route.ts`
  * Admin Campaign API: `src/app/api/admin/whatsapp/campaign/route.ts`
  * External API Endpoint: `src/app/api/external/whatsapp/route.ts`
* **UI Channel Page:** `src/app/marketing/channels/whatsapp/page.tsx`

#### Push Notifications Integration
* **Core Admin SDK Helper:** `src/lib/fcm-admin.ts` (Implements Firebase Cloud Messaging HTTP v1 token generation and notification dispatching)
* **Token Registration API:** `src/app/api/push/register/route.ts`
* **Push Token DB Schema:** `supabase/migrations/0070_user_push_tokens.sql`

---

### 4. External API Permission Audit

* **Centralized Auth Middleware:** Implemented `getAuthenticatedKey` checking `hasPermission` against `api_keys` table using `getServiceClient()`.
* **Resource Mapping Verification:** Fully audited all 20 external API routes (`src/app/api/external/[module]/route.ts`):
  * `blog`, `campaigns`, `category`, `coupons`, `customer`, `inventory`, `offers`, `orders`, `payment`, `products`, `push`, `reports`, `rewards-coin`, `roles`, `support-ticket`, `teams`, `users`, `wallet`, `website`, `whatsapp`.
* **Integrity:** Every single endpoint correctly enforces granular scope constraints (HTTP verbs accurately mapped to `read`, `write`, or `admin` scopes).
* **Type-Safety:** The entire codebase was validated to compile completely error-free (`tsc --noEmit`).

