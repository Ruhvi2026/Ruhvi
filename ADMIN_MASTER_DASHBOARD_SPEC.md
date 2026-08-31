# Ruhvi Jewels — Super Admin Master Dashboard: Implementation Spec

**Target:** `admin.ruhvi.in`
**Audience:** AI coding agent implementing this on the existing Ruhvi Jewels Next.js + Supabase codebase
**Status:** Admin console already exists with nominal/limited functionality. This spec describes how to modify/extend it into a full super-admin master control center.

---

## 0. Context (read first)

Ruhvi Jewels is a live e-commerce platform (gold-plated jewelry, India-only) running on Next.js 15 (App Router) + Supabase, with 7 portals/subdomains:

- `ruhvi.in` — Storefront
- `admin.ruhvi.in` — **Admin Console (this spec's target)**
- `operations.ruhvi.in` — Inventory, QC, suppliers, profit calc
- `orders.ruhvi.in` — Fulfillment, tracking, RTO
- `support.ruhvi.in` — Customer tickets, Gia chatbot
- `crm.support.ruhvi.in` — EspoCRM agent dashboard
- `marketing.ruhvi.in` — ROAS, campaigns, ad tracking

Checkout is **already live** — do not break existing checkout, PhonePe integration, wallet/cashback logic, or API contracts. All changes must be **additive**, not destructive (no schema drops/recreates).

**Before writing any code, run a Phase 0 audit**: inspect the existing `admin.ruhvi.in` codebase to see what already exists (auth, layout, any existing widgets/pages) so this is built as a modification, not a rewrite.

---

## 1. Goal

Turn the existing admin console into a **super admin master platform** with two pillars:

1. **A real-data monitoring & reporting dashboard** — the managing director should be able to see, at a glance and with filters, everything happening across the business: sales, operations, orders, support, marketing, and staff productivity.
2. **Unified operational access** — every function that already works on the individual portals (operations, orders, support, marketing) should also be usable from inside the admin portal, **without rebuilding those tools**. This is achieved via access/embedding/API reuse, not new feature development.

The super admin is the top of the permission hierarchy: full visibility, full control, across all portals.

---

## 2. Pillar 1 — Master Analytics & Reporting Dashboard

### 2.1 Data sources
Pull real (not mocked/sample) data from:
- **Supabase** (Postgres) — orders, inventory, users, wallet, support tickets, staff/agent activity, audit logs
- **PostHog** — e-commerce funnel events, session data, conversion metrics
- Other connected analytics (GA4 / Meta CAPI) if already wired up — surface at summary level only, don't rebuild their pipelines

### 2.2 Required views/widgets

**Business overview (top of dashboard)**
- Orders today / this week / this month (count + revenue)
- Conversion funnel snapshot (from PostHog: product_viewed → purchase_completed)
- RTO rate, return rate, refund rate
- Wallet/cashback outstanding liability

**Operations visibility**
- Orders processed per day/week, by status (confirmed → processing → shipped → delivered/rto)
- Inventory alerts surfaced here too (low stock, dead stock, high stock) — reuse operations.md thresholds, don't recompute new logic
- Profit/margin snapshot pulled from operations' profit calculator outputs

**Support visibility**
- Open vs. resolved ticket counts
- Tickets aging beyond SLA (flag as negligence/backlog)
- Gia AI resolve-first rate vs. escalation rate

**Staff / agent productivity (this is the core requirement — build this carefully)**
- Per-staff-member table, filterable by date range:
  - Orders handled / processed
  - Support tickets closed vs. still open vs. overdue
  - Response time (first response, resolution time)
  - Activity volume (actions logged in audit_logs / espo_sync_log attributable to that staff member)
- Sortable by "most productive" / "least productive" (based on whatever metrics are configured — see 2.3)
- Flag staff/tickets with no activity in X days (negligence indicator) — X configurable, not hardcoded

**Marketing visibility**
- ROAS, campaign spend vs. orders attributed (summary level, reuse marketing.ruhvi.in's own computed numbers rather than recomputing)

### 2.3 Filtering requirements
- All of the above must be filterable by date range (day/week/month/custom range)
- Staff productivity views filterable by individual staff member or team/role
- Filters should be URL-state-driven so views are shareable/bookmarkable

### 2.4 Implementation notes
- Do NOT duplicate data. Read live from Supabase (respecting RLS — super admin role should have a service-role or elevated-RLS read path) and query PostHog via its API rather than mirroring data into a new table.
- Cache/ISR where appropriate for performance, but staff/order counts should feel "real-time enough" (a few minutes of staleness is fine; don't over-engineer real-time sockets unless already in place elsewhere).
- Numeric thresholds (SLA days, negligence flags, productivity bands) must be **configurable**, not hardcoded — consistent with existing operations.md convention.

---

## 3. Pillar 2 — Unified Cross-Portal Access (no new tools)

The super admin should be able to perform the *same actions* that exist today on `operations.ruhvi.in`, `orders.ruhvi.in`, `support.ruhvi.in`, and `marketing.ruhvi.in` — from within `admin.ruhvi.in` — **without re-implementing those features**.

### 3.1 Approach
Pick the lowest-effort path that fits the existing architecture (audit first, then decide):
- **Preferred:** Reuse existing internal APIs/server actions from each portal, called from the admin portal's UI, gated by the super admin's elevated role. This is a UI/access layer on top of logic that already exists — not new business logic.
- **Alternative if APIs aren't cleanly separated:** Embed authenticated views of the sub-portals (iframe or micro-frontend style) inside the admin console shell, using shared auth (SSO/shared session token) so the super admin doesn't need to re-login per portal.
- Whichever approach: **do not fork or duplicate** the operations/orders/support/marketing logic. The goal is access, not reimplementation.

### 3.2 Access scope
Super admin (managing director role) gets:
- Full read access to everything (all reports, all records, across all portals)
- Full write/action access equivalent to what each portal's own admin/staff role can already do (e.g., can do anything an operations staff member can do in operations.ruhvi.in, anything a support agent can do in the CRM, etc.)
- This is a new top-level role (`super_admin`) that sits above existing per-portal roles in the permission model — extend RLS policies additively to grant this role access, don't rewrite existing role logic.

### 3.3 Auth
- Reuse the existing hybrid auth model (Firebase → Supabase RPC → JWT) described in the master doc — extend it with the new `super_admin` role/claim rather than building a separate auth system.

---

## 4. Non-negotiables (carry over from existing docs)

```
DO NOT CHANGE without explicit approval:
- Existing checkout flow
- PhonePe integration behavior
- Ruhvi Wallet balance/cashback logic
- Customer-visible shipping/COD amounts
- Production table schema (no drops/recreates)
- Existing API contracts of operations/orders/support/marketing portals

MUST:
- Additive changes only (new tables/columns/roles, not rewrites)
- Non-destructive extensions
- Server-side validation for anything financial
- Idempotent operations where actions can be retried
```

---

## 5. Suggested build order

1. **Phase 0 — Audit**: What does `admin.ruhvi.in` currently have? What auth/role model exists? What APIs already exist per portal that can be reused?
2. **Phase 1 — Super admin role**: Add `super_admin` role + RLS policies additively.
3. **Phase 2 — Master dashboard shell**: Build the overview + filtering UI, wire up Supabase reads first (orders, operations, support counts).
4. **Phase 3 — Staff productivity module**: The core ask — per-staff metrics, date-filterable, sortable, negligence flags.
5. **Phase 4 — PostHog integration**: Pull funnel/conversion data into the dashboard.
6. **Phase 5 — Cross-portal access**: Wire up reused APIs or embedded views for operations/orders/support/marketing actions.
7. **Phase 6 — QA**: Confirm no regression to checkout/payments/wallet; confirm RLS is correctly scoped (super admin sees all, but this new role doesn't accidentally leak access elsewhere).

---

## 6. Open questions for the agent to confirm with the team before/while building

- Exact metrics to weight "staff productivity" (orders handled, tickets closed, response time — confirm relative importance/weighting if a single productivity score is wanted, or keep as separate columns).
- Whether cross-portal access should be API-reuse or embedded-view — depends on how cleanly each portal's backend logic is already separated from its UI (determine in Phase 0 audit).
- SLA / negligence thresholds (e.g., "ticket not touched in X days") — get exact numbers from the managing director.
