# Ruhvi Jewels — CRM Integration Architecture

**Purpose:** Reference spec for the EspoCRM ↔ Supabase ↔ Dashboard integration. Captures the architecture decisions already made so the build can proceed without re-litigating them.

---

## 1. System Overview

| Component | Domain | Role |
|---|---|---|
| Dashboard | `support.ruhvi.in` | Custom Next.js app — the only interface staff use. Fully owned, fully customizable. |
| EspoCRM | `crm.support.ruhvi.in` | Master backend — owns all CRM logic and data (leads, contacts, cases/tickets, workflows, notes). |
| Supabase | — | Synced read copy of EspoCRM data for the dashboard; also the storefront's own database (products, orders, customers created at checkout). |

## 2. Why This Architecture

- Supabase alone isn't a CRM — no case management, lead workflow, or contact-relationship logic built in. Building that from scratch is out of scope.
- EspoCRM already provides a complete CRM engine (leads, contacts, cases, workflows, email sync) — reuse it rather than rebuild it.
- The team needs full design control over the day-to-day interface. EspoCRM's own UI isn't customizable enough for that, so it's never shown to staff — it runs purely as an API backend. The existing Next.js dashboard remains the only interface anyone uses.

## 3. Data & Control Flow

```
Dashboard (support.ruhvi.in)
   │
   ├── READS  ──────────────►  Supabase
   │
   └── WRITES ──────────────►  EspoCRM REST API  ──►  EspoCRM DB

Supabase  ──── new orders/customers ────►  EspoCRM DB
Supabase  ◄─── CRM data (cases, notes, status, etc.) ────  EspoCRM DB
   (both legs run in the same cron job on ruhvi-crm1, every 5–10 min)
```

- **Reads** — the dashboard queries Supabase directly. Fast, and puts no load on the CRM's small VM.
- **Writes** — every dashboard action (new note, status change, follow-up, assignment, etc.) calls the EspoCRM REST API. EspoCRM processes and stores it; it is the system of record.
- **Sync — Supabase → EspoCRM (new records)** — the cron job reads new/changed orders and customers from Supabase and pushes them into EspoCRM via the REST API.
- **Sync — EspoCRM → Supabase (CRM data)** — the same cron job pulls CRM-owned data (cases, notes, status changes, etc.) from the EspoCRM API and writes it into Supabase for the dashboard to read.
- **Both legs, one schedule** — a single cron job on the `ruhvi-crm1` VM handles both directions, every 5–10 minutes.
- **Conflict rule** — EspoCRM always wins. If a field has already been edited in EspoCRM (notes, status, a corrected phone number, etc.), the sync never overwrites it with an older Supabase value. Supabase's role in the sync is to create *new* EspoCRM records on first sight — not to overwrite fields an agent has already touched.
- **Why periodic, not live:** the EspoCRM VM has 1GB RAM. Real-time polling on every dashboard page load — especially with multiple agents active — risks timeouts and instability. A few minutes of staleness is fine for CRM data; ticket status and notes don't need sub-minute freshness.

## 4. Component Responsibilities

**EspoCRM**
- System of record for: leads, contacts, cases (support tickets), notes, workflows, assignment rules.
- Exposes a REST API via an API user + key (already created in EspoCRM admin settings).
- Own web UI is not used by anyone — API-only.

**Supabase**
- Read-optimized synced copy of EspoCRM's CRM data.
- Remains the master database for the storefront itself (orders and customers created at checkout) — synced into EspoCRM via the same cron job (§3).

**Dashboard (Next.js, support.ruhvi.in)**
- Sole UI for staff (and possibly customers).
- Reads: Supabase only.
- Writes: EspoCRM API only — never writes CRM data to Supabase directly.
- Currently partially built; this integration layers onto the existing app incrementally — no rebuild needed.

## 5. Infrastructure — Already Live

- **VM:** Google Compute Engine instance `ruhvi-crm1`, 1GB RAM, external IP `34.28.51.59`
- **Domain:** `crm.support.ruhvi.in` → A record → `34.28.51.59` (Cloudflare proxy off — DNS only)
- **SSL:** Let's Encrypt via Certbot, auto-renews, current cert expires 2026-11-25
- **Web server:** Nginx (`server_name crm.support.ruhvi.in`)
- **Database:** MariaDB 10.11.14, tuned for the 1GB VM —
  `innodb_buffer_pool_size=256M`, `innodb_log_file_size=64M`, `innodb_flush_log_at_trx_commit=2`, `max_connections=20`
- **PHP:** 8.3-FPM, tuned —
  `pm=ondemand`, `pm.max_children=4`, `pm.process_idle_timeout=10s`, `pm.max_requests=300`
- **Note:** `support.ruhvi.in` (no `crm.` prefix) is a separate, pre-existing CNAME → Vercel. That's the Next.js dashboard itself — not part of the CRM infrastructure, and nothing here should route through or replace it.

## 6. Status

All architecture decisions are resolved — ready to build. EspoCRM API credentials (user + key) have already been created in the admin panel. Store the key as an environment variable on both the `ruhvi-crm1` cron job and the Next.js app — do not commit it to the repo.

## 7. Constraints

- Never call the EspoCRM API on every dashboard page load — batch/periodic only (§3).
- Never expose EspoCRM's own web UI to staff or customers.
- Don't route `support.ruhvi.in` (root) through anything new — it stays exactly as it is architecturally; it *is* the dashboard.
