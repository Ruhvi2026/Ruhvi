# Ruhvi Jewels — Orders Dashboard Implementation Plan

## 0. Context

Unlike the Operations Dashboard, **checkout is already live** at `ruhvi.vercel.app/checkout` — address form, gift packaging option, and three payment methods (Ruhvi Wallet, PhonePe Gateway, Cash on Delivery) are already built and functional. This means **order-related tables/code likely already exist in some form.** Phase 0 here is more critical than it was for operations — do not assume a blank slate.

This dashboard is the internal, staff-facing order management system: tracking orders through fulfillment, handling returns, and giving operations/finance visibility into cost and margin per order. It is separate from (but must read from) the Operations Dashboard already built (`products`, `product_variants`, `inventory_movements` tables — see `operations.md`).

Shipping is **India-only**. Courier partner is **not fixed** — Shiprocket is active today, but the system must be able to switch to Delhivery, ExpressBees, or any other provider without a rebuild. Design a provider-agnostic abstraction, not a Shiprocket-specific integration.

---

## 1. How the agent should use this document

1. Read this fully before writing code, and also re-read `operations.md` — several tables here reference it directly.
2. **Phase 0 first, always.** Report findings, wait for "next" before Phase 1.
3. Work Phases 1 → 8 in order, one at a time, reporting after each and waiting for confirmation.
4. If Phase 0 finds an existing `orders` table (likely, since checkout is live) with a different structure than Section 4 below, **stop and report the actual structure** — we will decide together whether to migrate/extend it rather than you guessing.
5. Do not touch the courier's actual API integration credentials/logic without confirming which courier account/keys are already configured (Phase 0 should check this).
6. **NON-NEGOTIABLE: Preserve every existing working checkout/order/payment/wallet/customer-facing function.** Do not remove, rename, bypass, replace, or change an existing route, API contract, calculation, UI action, or business rule unless Phase 0 proves it is broken and an explicit change is approved.
7. Prefer **additive changes, adapters, migrations, and compatibility layers** over rewrites. Existing live behaviour is the baseline.
8. Before any migration or code change, identify the affected files, tables, routes, API endpoints, triggers, RPCs, env vars, and UI flows. No destructive migration without explicit confirmation.
9. After each phase, run the relevant existing tests/build/lint checks plus focused regression checks for checkout, payment, wallet, order creation, and customer order viewing before asking for confirmation.

---

## 2. Policies to encode exactly (current live site + Shipping & Delivery Policy, effective July 1, 2026)

**Source-of-truth rule:** The current production checkout and the current Shipping & Delivery Policy are the baseline. Do not introduce a new calculation or workflow that changes existing customer-visible behaviour. During Phase 0, verify the live implementation and preserve it unless an explicit decision is made to change it.

**Shipping fee:**
- Free if cart value/subtotal is **above ₹500**.
- ₹49 flat if cart value/subtotal is **₹500 or below**.
- Shipping eligibility is determined from the cart value **before adding shipping and COD convenience charges**.
- The implementation must preserve the existing checkout calculation exactly.

**COD charge:** additional **₹49 convenience charge**, always, regardless of cart value. This stacks with the shipping fee above.
- Example: ₹400 COD order → ₹49 shipping + ₹49 COD charge = ₹98 extra.

**COD deposit rule:** 10% of the order value is paid online upfront at checkout. The remaining 90% + the ₹49 COD convenience charge is collected on delivery.
- The live checkout screenshot shows a ₹21,000 order asking for ₹2,100 upfront, then ₹18,900 + ₹49 on delivery. **Preserve that existing calculation behaviour.**
- The implementation must not silently change whether shipping/COD charges are included in the deposit base. Phase 0 must inspect the current code and document the exact formula before modifying it.

**Processing time:** 1–2 business days from order confirmation to dispatch.

**Delivery time:** standard 3–7 business days depending on pincode; remote locations may take up to 10 business days. These are estimates and may be affected by weather/public holidays.

**Delivery attempts:** courier partners typically make up to 3 delivery attempts. If delivery fails after the allowed attempts, package returns to the warehouse (RTO).

**Failed delivery outcomes:**
- **Prepaid/RTO:** after the item/package is returned to and received by the warehouse, refund is initiated. Refund may go to **original payment method or Ruhvi Wallet**. The staff UI should preselect original payment method but allow wallet override. Shipping charge, when applicable, is excluded according to the current policy.
- **COD:** track refused/uncollected COD deliveries per customer. COD may be disabled after repeated refusals/uncollected orders. **The current public policy says "multiple"; it does not publicly specify the number.** Keep the threshold configurable. A default operational threshold of 2 may be used only as a configurable system setting, not as a hard-coded public-policy fact.

**Order/address changes:** Customers may contact `support@ruhvi.in` to request delivery-address changes **before shipment**. Once shipped, address changes must be locked unless a future courier-supported exception is explicitly implemented. Every permitted address change must be audited.

**Tracking:** On shipment, AWB number + tracking link/status must be sent by **email and WhatsApp**. Customer can also see order status in **My Orders**. Phase 0 must determine whether My Orders already exists and preserve it.

## 3. Order status model

Two separate fields — don't conflate them, since COD's split payment makes a single status insufficient:

**`status`** (fulfillment lifecycle):
`pending_payment` → `confirmed` → `processing` → `shipped` → `out_for_delivery` → `delivered`
Side branches: `delivery_failed`, `rto_initiated`, `rto_received`, `cancelled`, `return_requested`, `return_approved`, `return_rejected`, `refunded`

**`payment_status`**:
- Prepaid: `paid` → (`refund_pending` → `refunded`, if applicable)
- COD: `deposit_paid` → `balance_pending` → `balance_collected`

Every status change must be logged (Section 4, `order_status_history`) — this is what "professional order tracking" requires: a full audit trail, not just a current-state field.

### 3A. Non-negotiable state/data integrity rules

- `status` and `payment_status` remain separate. Never infer one solely from the other.
- Valid state transitions must be enforced server-side, not only in the UI.
- Monetary calculations must be authoritative on the server. **Never trust customer-submitted totals, discounts, shipping fees, COD fees, deposit amounts, or refund amounts from the browser.**
- Use a consistent currency/rounding policy and preserve the current checkout's rupee-level results. Any rounding rule discovered in Phase 0 becomes part of the compatibility contract.
- Every payment, refund, shipment creation, shipment cancellation, inventory movement, wallet mutation, and status change must be idempotent. Retried callbacks/events must not create duplicate financial or inventory effects.
- Existing customer-facing routes, APIs, checkout behaviour, wallet behaviour, and UI actions are compatibility-sensitive and must not be broken by dashboard work.

---

## 4. Database schema (Supabase / Postgres)

Confirm in Phase 0 whether any of this already exists before running. If `orders` already exists with a working checkout writing to it, **extend it to match this shape rather than replacing it** — report the gap and we'll decide the migration together.

```sql
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,       -- human-readable, e.g. RUV-2026-000123
  customer_id uuid,                        -- references your customer/auth table
  status text not null default 'pending_payment',
  payment_method text not null,            -- wallet | phonepe | cod
  payment_status text not null default 'pending',

  subtotal numeric not null,
  shipping_fee numeric not null default 0,
  cod_charge numeric not null default 0,
  discount_amount numeric not null default 0,
  total_payable numeric not null,

  cod_deposit_amount numeric,              -- 10% paid upfront, COD orders only
  cod_balance_amount numeric,              -- remaining 90% + cod_charge, collected on delivery

  shipping_address jsonb,                  -- or FK to a separate addresses table if one exists
  gift_wrap boolean default false,
  gift_message text,
  promo_code text,

  created_at timestamptz default now(),
  confirmed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),        -- from operations.md
  variant_id uuid not null references product_variants(id), -- from operations.md
  quantity integer not null,
  unit_price numeric not null,        -- snapshot at time of order (price may change later)
  unit_cost_price numeric not null,   -- snapshot of cost at time of order, for margin calc
  line_total numeric not null
);

create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  changed_by uuid,          -- staff id, null if system-triggered
  notes text,
  changed_at timestamptz default now()
);

create table shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  courier_provider text not null,      -- 'shiprocket' | 'delhivery' | 'expressbees' | etc — plain text, not enum, for extensibility
  awb_number text,
  tracking_url text,
  shipped_at timestamptz,
  estimated_delivery_date date,
  delivered_at timestamptz,
  delivery_attempts integer default 0,
  last_attempt_at timestamptz,
  last_attempt_result text        -- delivered | customer_unavailable | refused | address_issue | other
);

create table returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  order_item_id uuid references order_items(id),
  reason text,
  status text not null default 'requested',  -- requested | approved | rejected | received | refunded
  requested_at timestamptz default now(),
  resolved_at timestamptz,
  refund_amount numeric,
  refund_method text    -- original_payment | wallet
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  payment_method text not null,
  amount numeric not null,
  gateway_reference text,   -- PhonePe transaction id, etc.
  status text not null default 'pending',  -- pending | success | failed | refunded
  paid_at timestamptz
);

-- Implementation note: payment callbacks must be idempotent.
-- If the existing PhonePe integration already has a transaction/event identifier,
-- reuse it rather than introducing a second competing payment identity.

create table wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  order_id uuid references orders(id),
  type text not null,        -- credit | debit | cashback | refund
  amount numeric not null,
  balance_after numeric not null,
  created_at timestamptz default now()
);

-- Powers the auto-disable-COD-on-repeated-refusal rule
create table cod_eligibility (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid unique not null,
  cod_disabled boolean not null default false,
  cod_refusal_count integer not null default 0,
  last_refusal_at timestamptz,
  notes text
);

-- Config table so switching active courier is a settings change, not a code change
create table courier_providers (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,       -- shiprocket | delhivery | expressbees
  is_active boolean not null default false,
  priority integer default 0,
  notes text
);
```

---

## 5. Phase 0 — Audit (mandatory, do this first)

**No schema/code changes before Phase 0 is reported and approved.**

1. Check whether `orders`, `order_items`, `payments`, `shipments`, or `wallet_transactions` (or similarly-named tables) already exist. **Given checkout is live, expect to find at least a basic `orders` table.** Report exact columns, indexes, foreign keys, triggers, RLS policies, views, RPCs, and representative relationships where relevant.
2. Find and read the current checkout code (likely `src/app/checkout/...` and its API routes) — document exactly what it currently writes to Supabase when an order is placed.
3. Document the current checkout calculation pipeline: cart subtotal, discount, shipping fee, COD charge, total payable, COD deposit, COD balance, wallet deductions/cashback, and payment selection. **Use the live checkout as a compatibility baseline.**
4. Find the current PhonePe integration code — confirm how payment initiation, `gateway_reference`/transaction ID, success/failure/pending states, callback/webhook verification, and retry handling currently work. Do not replace working logic.
5. Check for any existing Ruhvi Wallet balance/cashback logic — where the `₹50.00` balance and **5% cashback message/logic** shown in the current checkout are stored/calculated. Confirm debit, cashback, refund-to-wallet, and balance-after-transaction handling.
6. Confirm `products` and `product_variants` tables exist (from `operations.md`) and note exact column names, constraints, stock fields, and existing inventory movement behaviour, since `order_items` references them directly.
7. Check if any courier (Shiprocket) API integration/credentials exist in code or env vars. Identify the exact provider, account/configuration source, endpoints, webhook handling, and whether credentials are used by checkout, API routes, background jobs, or server actions. Do not modify secrets.
8. Check whether customer-facing **My Orders** / tracking already exists. Map its routes, components, API calls, data source, and current status labels. Preserve existing functionality.
9. Check address storage and address-change functionality. Confirm how checkout stores the shipping address and whether customers/staff can edit it before shipment.
10. Check all existing order-related APIs/server actions/RPCs/triggers/edge functions/background jobs and identify which ones must remain untouched for compatibility.
11. Check existing email/WhatsApp notification implementation, especially shipment/AWB notifications, and reuse it where possible rather than creating duplicate notification systems.
12. Check existing authentication, staff roles, and Supabase RLS policies relevant to orders/payments/wallet/inventory.
13. Check existing tests/build/lint/type-check setup and identify the minimum regression suite that can prove checkout and order flows were not broken.

### Phase 0 output format (mandatory)

Report the findings in this exact structure before any implementation: 

```text
EXISTS
- Current tables/schema
- Current checkout flow
- Current payment flow
- Current wallet flow
- Current inventory flow
- Current courier flow
- Current My Orders flow
- Current notifications

MODIFY
- Existing files/tables/routes that need extension

CREATE
- New tables/files/endpoints/components required

DO NOT TOUCH
- Existing working functions and compatibility-sensitive code

RISKS / GAPS
- Schema conflicts
- RLS/security gaps
- Idempotency gaps
- Data migration risks
- Payment/courier integration risks

MIGRATION PLAN
- Non-destructive DB changes
- Data backfill/compatibility steps
- Rollback plan

REGRESSION PLAN
- Checkout
- PhonePe
- Wallet
- COD
- Order creation
- My Orders
```

Report all of this before writing any schema or code and wait for **`next`**.

---

## 6. Phase 1 — Schema & Safe Migration (reconciled with Phase 0 findings)

- If `orders` already exists: **extend/alter it non-destructively**. Do not drop/recreate it and do not create a duplicate order system.
- Preserve existing columns/data/API expectations. Add new fields only when necessary.
- If old data needs migration, backfill it safely and verify row counts and financial totals before/after.
- If it doesn't exist yet in a working form: create fresh per Section 4, adapting foreign keys to the actual existing customer/auth and operations schema discovered in Phase 0.
- Reconcile `order_items` with the actual product/variant schema before adding foreign keys.
- Seed `courier_providers` with Shiprocket as active **only if Phase 0 confirms Shiprocket is the currently configured production provider**; otherwise preserve the actual current provider.
- Add/update Supabase RLS policies so customers can read only their own permitted order/customer data, while internal staff roles have appropriate operational access. Internal cost/margin fields and sensitive payment/wallet data must not be exposed to ordinary customers.
- Prefer database constraints, server-side functions, and transaction boundaries for financial/inventory integrity.
- Add appropriate indexes for order number, customer ID, status, payment status, creation date, AWB, and other high-frequency lookups after inspecting the current data volume.
- Do not change existing checkout write paths until the new schema has been proven compatible.
- Before applying migrations, capture a rollback strategy and validate against a safe environment or migration preview where available.

---

## 7. Phase 2 — Order status engine

- Implement status transitions per Section 3.
- Every transition writes a row to `order_status_history` (who/what triggered it, when, notes).
- Enforce valid transitions server-side only; UI restrictions are not sufficient.
- Make status updates idempotent so retries cannot create duplicate history or duplicate downstream actions.
- Define explicit rules for `pending_payment`, `confirmed`, `processing`, `shipped`, `out_for_delivery`, `delivered`, `delivery_failed`, `rto_initiated`, `rto_received`, `cancelled`, `return_requested`, `return_approved`, `return_rejected`, and `refunded`.
- `delivered` orders cannot jump back to `processing`; returns must use the return branches.
- Do not automatically mark an order `delivered` from a client request; delivery state must come from authorized staff/provider events.
- Timestamp lifecycle fields (`confirmed_at`, `shipped_at`, `delivered_at`, etc.) must remain consistent with transitions.

---

## 8. Phase 3 — Courier abstraction layer

Build a common interface, not a Shiprocket-specific integration:

```
interface ShippingProvider {
  createShipment(order): { awb_number, tracking_url }
  getTrackingStatus(awb_number): { status, last_attempt_result }
  cancelShipment(awb_number): boolean
}
```

Implement `ShiprocketProvider` first **only after Phase 0 confirms the existing Shiprocket account/configuration and current integration path**. Reuse existing working API/auth logic where possible.

Requirements:
- Normalize provider-specific statuses/attempt results into Ruhvi's internal status model.
- Provider webhooks/callbacks must be authenticated/verified and idempotent.
- Duplicate provider events must not duplicate status history, RTO events, inventory changes, refunds, or notifications.
- Preserve provider credentials in the existing secure env/secret mechanism; never hard-code or expose them.
- The active provider is read from `courier_providers.is_active` (or the current production configuration discovered in Phase 0). Switching later should require adding a provider adapter/configuration, not rewriting order logic.

---

## 9. Phase 4 — COD rules engine

- **Preserve the live checkout calculation.** First document the current formula discovered in Phase 0; do not change customer-visible amounts during this implementation.
- Shipping: cart value > ₹500 → ₹0; cart value ≤ ₹500 → ₹49.
- COD convenience charge: always ₹49, stacked on top of shipping.
- COD deposit: 10% of the current checkout's order-value/deposit base **before the COD convenience charge**, matching the live screenshot behaviour where ₹21,000 → ₹2,100 upfront and ₹18,900 + ₹49 on delivery. If Phase 0 finds a different implementation detail, stop and report it before changing anything.
- COD balance: remaining 90% + ₹49 COD convenience charge, collected on delivery.
- Persist a snapshot of the amounts used to create the order so later product/discount changes do not alter historical totals.
- On a delivery attempt failure for a COD order, record the actual failure reason. Do not treat every delivery failure as a customer refusal; count only refusal/uncollected outcomes toward COD refusal eligibility.
- Increment `cod_eligibility.cod_refusal_count` only for qualifying refusal/uncollected events and do so idempotently.
- When the configurable threshold is reached, set `cod_eligibility.cod_disabled = true`.
- Checkout must check the effective COD eligibility before presenting COD. Preserve the existing checkout UI/logic and add the check without breaking other payment methods.
- Public policy says repeated/multiple refusals, not a fixed number. Keep the threshold configurable; an operational default of 2 is allowed only as a setting.
- Staff must be able to see refusal history/count and the current COD eligibility state.

---

## 10. Phase 5 — Returns, RTO, refunds & inventory reconciliation

### Customer return flow
- Customer/staff creates a `returns` row, status `requested`.
- Approval/rejection is permission-controlled and audited.
- On approval + item received back: set return status `received`, then write the appropriate `stock_in` row to `inventory_movements` for the returned variant — **this is the link between Orders and Operations inventory.**
- Do not change stock merely because a return request was created or approved; stock increases only when the physical return is received/verified according to the current operations process.
- Current scope remains single full-item returns; broader partial-quantity returns can remain deferred.

### Failed-delivery / RTO flow
- Record up to the provider-supported delivery attempts and the result of each attempt.
- After the allowed attempts are exhausted, transition to `rto_initiated`.
- When the package physically returns to the warehouse and is confirmed received, transition to `rto_received`.
- **Prepaid RTO:** only after warehouse receipt, initiate refund according to the current Shipping & Delivery Policy; exclude applicable shipping charge when required by policy.
- Refund destination: `original_payment` or `wallet`, with original payment preselected in staff UI.
- **COD RTO/refusal:** record the refusal/uncollected outcome and update customer COD eligibility only when the event qualifies under the configured refusal rules.

### Refund flow
- Refund must be its own auditable/idempotent operation. Repeated clicks/callbacks must not create duplicate refunds.
- Staff selects `refund_method` (`original_payment` or `wallet`); default UI to `original_payment`, allow override to wallet.
- Before refund execution, verify refundable amount against payments/order financial records. Never trust a browser-supplied amount.
- On refund completion: write/update `payments` to `refunded` as appropriate and, if wallet chosen, write a `wallet_transactions` row (`type = refund`).
- Keep refund state distinct from order status where necessary so a refund in progress cannot be mistaken for completed.

### Address changes
- Before shipment: support/staff may update delivery address according to policy and existing checkout/account capabilities.
- After shipment: lock address edits unless the courier provider explicitly supports a controlled exception implemented later.
- Every address change must capture who changed it, when, and the previous/new values in an audit-safe mechanism.

---

## 11. Phase 6 — Orders dashboard UI

**Compatibility rule:** The dashboard is an internal staff surface. It must not replace or break the existing customer checkout or My Orders experience.

**Real-time section:** today's new orders, orders pending dispatch, failed-delivery alerts, COD orders awaiting balance collection, RTO awaiting warehouse receipt, returns awaiting action, and refunds pending.

**Lazy-loaded section:** courier performance comparison (delivery success rate, avg. delivery time per provider), return-rate reports, refund history, COD refusal reports, historical order trends.

**Order detail view:** show full timeline/status history, payment history, shipment/AWB information, delivery attempts, address, notes, return/refund information, and audit information appropriate to staff role.

**Cross-department view (per order / order item)** — pull directly from `operations.md` tables:
- Current stock level of the ordered variant (`product_variants.stock_quantity`)
- Cost/sourcing price (`order_items.unit_cost_price`, snapshotted at order time)
- Selling price (`order_items.unit_price`)
- Margin per line item and per order (`unit_price − unit_cost_price`, summed)

**Role/security rules:**
- Customers must not access the internal dashboard.
- Staff/manager/admin visibility must follow the existing role model and RLS policies discovered in Phase 0.
- Customer-facing data must never expose internal cost, margin, courier secrets, payment credentials, or other staff-only information.

---


## 12. Phase 7 — Customer-facing tracking & notifications

Check Phase 0 findings first — a `My Orders` page may already exist.

- If yes: **preserve its existing UI, routes, actions, and functionality**, then reconcile its data source/status mapping with the final schema. Do not rebuild it unnecessarily.
- If no: build a simple order status + AWB tracking view using the existing customer account/auth architecture.
- On `shipped` status change, trigger the existing/reused **email + WhatsApp** shipment notification flow with AWB and tracking link.
- Notification delivery should be idempotent and retry-safe. Notification failure must not roll back a successfully created shipment/order.
- Do not expose internal order notes, costs, margins, refusal counters, or staff-only audit information to customers.
- Ensure customer status labels are understandable while mapping correctly to the internal canonical statuses.
- Address-change support before shipment should be exposed through the existing support/account flow without changing unrelated checkout/account functionality.

---

## 13. Phase 8 — Security, Idempotency, QA & Production Validation (mandatory before completion)

### Security / RLS
- Validate Supabase RLS for orders, order items, payments, shipments, returns, wallet transactions, and related customer data.
- Customer can access only their own permitted records.
- Internal cost/margin fields are staff-only.
- Staff role permissions must follow the existing application role model.
- Server/service-role credentials remain server-side only.

### Idempotency / concurrency
- PhonePe callbacks/retries must not duplicate payment records or order confirmation.
- Courier webhooks/retries must not duplicate shipments, attempts, status transitions, or notifications.
- Refund retries must not double-refund.
- Wallet credits/debits/refunds must be transactional and idempotent.
- Inventory stock-in for returns must not be applied twice.
- Concurrent actions (e.g. two staff users dispatching the same order) must be guarded by server-side state checks/transactions.

### Financial integrity
- Server recalculates and validates subtotal, discount, shipping, COD charge, total payable, COD deposit, COD balance, payment received, and refundable amount.
- Existing live checkout results remain the compatibility baseline.
- Historical orders retain snapshot values even if product prices/costs change later.

### Mandatory regression matrix

At minimum test:

```text
PREPAID
- Cart ₹499
- Cart ₹500
- Cart ₹501
- Discounted cart
- Wallet payment
- PhonePe success
- PhonePe failure
- PhonePe pending/retry

COD
- Cart ₹499 + COD
- Cart ₹500 + COD
- Cart ₹501 + COD
- Deposit amount
- Remaining balance + ₹49 COD charge
- Refused delivery
- Uncollected delivery
- Repeated refusals and configurable COD disable threshold

ORDER LIFECYCLE
- pending_payment → confirmed → processing → shipped → out_for_delivery → delivered
- delivery_failed → rto_initiated → rto_received
- cancellation at allowed stages
- valid/invalid status transitions

RETURNS / REFUNDS
- Return request
- Approve/reject
- Warehouse receipt
- Inventory stock-in exactly once
- Refund to original payment
- Refund to wallet
- Duplicate refund attempt

SHIPMENT
- Create shipment
- AWB/tracking link
- Courier webhook retry
- Delivery attempt count
- Address change before shipment
- Address change blocked after shipment

SECURITY
- Customer cannot read another customer's order
- Customer cannot see cost/margin/payment internals
- Staff role restrictions

REGRESSION
- Existing checkout UI and actions
- Existing wallet UI/balance/cashback
- Existing PhonePe flow
- Existing My Orders page
- Existing product/inventory operations
```

### Production gate

Do not declare the implementation complete until:
1. Existing functionality passes regression tests.
2. Database migration is verified and reversible.
3. RLS/security checks pass.
4. Idempotency checks pass.
5. Payment/courier/wallet integrations pass focused tests.
6. Customer checkout and My Orders remain functional.
7. The final report lists changed files, migrations, new APIs, risks, and test results.

---

## 14. Explicitly deferred

- International shipping (India-only per current scope)
- Automatic courier selection by rate-shopping across providers (manual/priority-based selection for now — the abstraction in Phase 3 makes this addable later without a rewrite)
- Partial refunds / partial returns beyond per-line-item (single full-item returns only for now)
- Advanced courier exception handling beyond the provider abstraction and normalized statuses required for current operations
- Customer self-service post-shipment address changes
- Multi-package / split-shipment orchestration unless the existing checkout/courier implementation already requires it
- Automated refund routing optimization

## 15. Final Non-Negotiable Compatibility Contract

This implementation is an **extension of the existing Ruhvi system, not a replacement of it**.

The agent MUST NOT, without explicit approval:
- Replace the existing checkout flow.
- Remove or rename existing checkout buttons/actions/routes.
- Change PhonePe integration behaviour that is currently working.
- Change existing Ruhvi Wallet balance/cashback behaviour.
- Change existing shipping/COD amounts visible to customers.
- Remove or rewrite the existing My Orders/customer tracking experience if it already works.
- Drop/recreate production order/payment/wallet tables containing live data.
- Expose internal cost/margin/payment secrets to customers.
- Introduce destructive database migrations as a shortcut.
- Count every failed delivery as a COD refusal; only qualifying refused/uncollected outcomes affect COD eligibility.

Preferred implementation strategy:

```text
AUDIT
  ↓
UNDERSTAND CURRENT LIVE SYSTEM
  ↓
RECONCILE / GAP ANALYSIS
  ↓
NON-DESTRUCTIVE MIGRATION
  ↓
ADDITIVE ORDER ENGINE
  ↓
COURIER ADAPTER
  ↓
COD / RTO / RETURN / REFUND
  ↓
STAFF DASHBOARD
  ↓
CUSTOMER TRACKING
  ↓
SECURITY + IDEMPOTENCY + REGRESSION TESTS
  ↓
PRODUCTION VALIDATION
```

When the existing implementation and this plan appear to conflict, **the existing working customer-facing behaviour wins until the conflict is reported and explicitly resolved**.
