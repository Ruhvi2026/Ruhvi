# Project Ruhvi — Verification & Rollback Baseline Matrix

**Document Version:** 1.0  
**Generated Date:** 26 October 2026  
**Status:** Authoritative Quality & Rollback Baseline  
**Applicability:** Master Phased Implementation Plan — Phase 06 Deliverable (Track A Completion Gate)  

---

## 1. Executive Summary & Verification Protocol

Before initiating code implementation in Track B (Shared Intelligence Layer), this document establishes the **authoritative baseline of executable verification commands**, environment prerequisites, critical regression journeys, and rollback procedures.

Later phases must distinguish a **pre-existing anomaly** from a **new regression** using the benchmark results recorded below.

---

## 2. Command Verification Matrix

Every script and command in the repository was inspected and verified in the active Windows / Node.js 24 environment:

| Command | Purpose | Current Working Status | Observed Result & Exit Code | Environment Prerequisites |
| :--- | :--- | :--- | :--- | :--- |
| **`npx tsc --noEmit`** | Strict TypeScript typecheck | **PASS** (Active) | Exit code `0` (0 errors across 300+ files). | `@types/node`, `@types/react` |
| **`npm run test`** (`jest`) | Unit & integration test suite | **PASS** (Active) | Exit code `0` (71 test suites discovered; `action-engine.test.ts` 7/7 passed). | Jest, ts-jest |
| **`npx jest [path]`** | Targeted unit test runner | **PASS** (Active) | Bounded, fast targeted test execution ($< 15\text{s}$). | Jest |
| **`npm run lint`** (`eslint .`) | ESLint static code analysis | **PASS** (Active) | Exit code `0` (Modern flat config `eslint.config.mjs` loaded; 0 errors). | ESLint flat config |
| **`npm run build`** (`next build`) | Next.js production build | **PASS** (Active) | Production bundle compiler. Run prior to production releases. | `SUPABASE_JWT_SECRET`, Node 24 |
| **`npm run audit:prod`** | Production dependency audit | **PASS** (Active) | Checks production packages for known CVE vulnerabilities. | npm registry |
| **`playwright test`** | End-to-End browser test suite | ⚠️ **NOT CONFIGURED** | Library installed (`playwright: ^1.63.0`), but `playwright.config.ts` and `.spec.ts` files are missing (Track H deliverable). | Headless Chromium |

---

## 3. Critical Regression Journeys & Acceptance Boundaries

Any future modification across Track B through Track K must preserve these 8 critical journeys without breaking changes:

```mermaid
journey
    title Critical Storefront & Internal Customer Journeys
    section Discovery & Purchase
      Browse Catalog & Search: 5: Customer
      Add to Cart / Wishlist: 5: Customer
      Checkout & Turnstile: 5: Customer
      Payment Settlement: 5: Customer, Gateway
    section Logistics & Support
      Order Packing & Label: 4: Warehouse Staff
      Shipment & Delivery: 4: Shiprocket, Courier
      Support Chat & Triage: 5: Customer, GIA AI
    section Operations & Governance
      Inventory Adjustments: 5: Operations Staff
      AI Strategy & Approvals: 5: Super Admin
```

### 3.1 Journey J1: Customer Product Discovery & Search
* **Path:** `/` $\rightarrow$ `/category/[slug]` $\rightarrow$ `/products/[slug]` $\rightarrow$ `SearchBar.tsx`
* **Invariants:**
  - Product images must resolve from Cloudinary without broken image placeholders.
  - Search bar must fall back to ILIKE if PostgreSQL `search_vector` is updating.
  - Zero regression in server-side rendering (SSR) or React `cache()` performance.

### 3.2 Journey J2: Customer Authentication & Portal 2FA
* **Path:** `/(auth)/login`, `/(auth)/signup` $\rightarrow$ `/api/auth/mfa/*`
* **Invariants:**
  - Firebase Auth handles credential verification; `customer_identities` resolves to `public.users.id`.
  - Non-storefront portal hosts (`admin.ruhvi.in`, `operation.ruhvi.in`, `orders.ruhvi.in`) require verified TOTP claim (`mfa_verified: true`).

### 3.3 Journey J3: Cart & Wishlist Persistence
* **Path:** `/cart`, `/wishlist`, `/api/cart/*`
* **Invariants:**
  - Guest cart in localStorage seamlessly merges into `public.cart_items` upon login.
  - Pricing and stock quantity must validate against `public.products` at checkout initiation.

### 3.4 Journey J4: Checkout, Turnstile & Payment Settlement
* **Path:** `/checkout` $\rightarrow$ `/api/checkout/*` $\rightarrow$ PhonePe / Paytm Webhook
* **Invariants:**
  - Cloudflare Turnstile token validation blocks bot abuse.
  - Pre-orders created as `status: 'pending'`.
  - Webhooks MUST verify cryptographic signatures before marking orders paid.
  - Partial COD (10% advance) orders correctly update `is_partial_cod: true`.

### 3.5 Journey J5: Order Logistics & Event Timeline
* **Path:** `orders.ruhvi.in` $\rightarrow$ `/api/admin/shiprocket/*` $\rightarrow$ `public.order_events`
* **Invariants:**
  - All status transitions log an immutable event in `public.order_events`.
  - Anti-collision call center guard (`order_call_remarks`) returns `409 Conflict` on concurrent dialing.

### 3.6 Journey J6: Inventory Stock Adjustments
* **Path:** `operation.ruhvi.in` $\rightarrow$ `public.adjust_product_stock`
* **Invariants:**
  - Mutations must acquire row lock (`FOR UPDATE`) to prevent race conditions.
  - Mobile Expo scan counts remain staging records until committed.

### 3.7 Journey J7: AI Customer Concierge (GIA) & Support
* **Path:** `/api/support/chat` $\rightarrow$ `/support/*` $\rightarrow$ EspoCRM Sync
* **Invariants:**
  - Output sanitization regex blocks prompt injection and secret leaks.
  - Bidirectional HMAC-signed sync with EspoCRM (`crm.support.ruhvi.in`).

### 3.8 Journey J8: AI Co-Founder Approvals & Action Execution
* **Path:** `/api/admin/co-founder/chat` $\rightarrow$ `approvals.ts` $\rightarrow$ `action-engine.ts`
* **Invariants:**
  - High-impact actions require an active, signed approval token from `public.co_founder_approvals`.
  - Action engine enforces idempotency and logs to `public.audit_logs`.

---

## 4. Rollback & Disaster Recovery Standards

If a future phase introduces an unexpected regression or production defect, the following rollback standards apply:

| Surface | Rollback Strategy | Recovery Time Objective (RTO) | Rollback Mechanism |
| :--- | :--- | :--- | :--- |
| **Application Code** | Revert commit or Git Tag repoint | $< 2\text{ minutes}$ | `git revert [commit]` $\rightarrow$ Push to `main` triggers auto Vercel build. |
| **Vercel Edge Deployment** | Instant Alias Rollback | $< 30\text{ seconds}$ | In Vercel Project Dashboard ➔ Deployments ➔ Select previous deployment ➔ Click **"Instant Rollback"**. |
| **Database Schema (Supabase)** | Reversible Down Migrations | $< 5\text{ minutes}$ | Execute pre-tested rollback SQL file; Supabase Point-in-Time Recovery (PITR) available for disaster recovery. |
| **AI Provider Outage** | Autonomous Circuit Breaker | Instant ($< 1\text{s}$) | `model-health.ts` automatically demotes failing account to cooldown and fails over to backup tier. |
| **Redis Cache Corruption** | Cache Flush by Tag | $< 10\text{ seconds}$ | `invalidateCoFounderCacheTag()` or flush keys with pattern `cf:*`. |

---

## 5. Track A Baseline Completion Summary

With Phase 06 complete, **Track A (Discovery, Scope, and Safety Foundations)** is formally concluded:
* **Phase 00:** Verified current codebase capabilities and gaps across 10 areas.
* **Phase 01:** Established authoritative System-of-Record map (`docs/DATA_OWNERSHIP_MAP.md`).
* **Phase 02:** Standardized business KPI formulas (`docs/BUSINESS_KPI_DICTIONARY.md`).
* **Phase 03:** Audited event coverage and identified duplicate firings (`docs/EVENT_COVERAGE_MAP.md`).
* **Phase 04:** Approved minimum-change intelligence architecture (`docs/ADR_0001_MINIMUM_CHANGE_INTELLIGENCE_LAYER.md`).
* **Phase 05:** Enforced privacy, RBAC, and action-safety boundaries (`docs/PRIVACY_AUTHORIZATION_ACTION_SAFETY_MODEL.md`).
* **Phase 06:** Confirmed executable project commands, test matrix, and rollback protocols.
