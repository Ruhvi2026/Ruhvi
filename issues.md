# Admin Panel & Codebase Issues Report

*Date: August 26, 2026*

This is a fresh analysis of the Ruhvi codebase, including the Admin Panel (`src/app/admin/**` and `src/app/api/admin/**`).

**Summary:** All reported security, RLS, schema, compilation, and static mock UI issues across the Admin Panel have been resolved. Pages have been connected to real Supabase tables and queries with the modern luxury dark theme. A follow-up audit round fixed four additional consistency issues, and a final pass removed all silent demo-data fallbacks so real database failures are now surfaced visibly (see §3).

---

## 1. Resolved Issues (Fixed in Recent Updates)

The following critical issues from previous audits are **now completely resolved**:
- **Unauthenticated WhatsApp broadcast:** `src/app/api/admin/whatsapp/campaign/route.ts` now properly enforces role checks (`super_admin`, `admin`, `manager`, `staff`) and includes a robust rate-limiter and cooldown mechanism.
- **AI Settings & Credentials Security:** `/api/admin/ai/*` routes now properly use authenticated backend clients, and AI credentials use secure RLS policies (`0045_secure_ai_credentials_rls.sql`).
- **SSRF Vulnerabilities:** Testing endpoints (e.g., `test-connection`) now utilize the `safeFetch` wrapper to prevent Server-Side Request Forgery (`src/lib/security/ssrf.ts`).
- **Schema Mismatches:** Queries to non-existent tables or columns have been resolved. (e.g., `ai/simulate` properly reads from `settings`, and `refunds` correctly queries the `returns` table).
- **Users Page RLS & Syntax:** The Users page now correctly utilizes Supabase RPC functions (`admin_get_all_users`, `admin_update_user_role`) to bypass RLS issues for authorized staff (`0019_admin_users_rpc.sql`), and JSX hierarchy syntax errors have been patched.
- **Dashboard Mocks:** The main dashboard (`src/app/admin/dashboard/page.tsx`) now fetches real analytical data from Supabase instead of using hardcoded numbers.
- **Bulk Management Tool:** The CSV Bulk Upload and Export features hit the real backend endpoints (`/api/admin/bulk/import` and `/api/admin/export`).
- **Products Catalog List (`src/app/admin/products/page.tsx`):** Connected to real Supabase `products`, `categories`, and `product_images` tables. Real-time mutations for visibility (Active/Hidden) and Out of Stock toggles.
- **Sales Analytics (`src/app/admin/reports/sales/page.tsx`):** Aggregates live orders, calculates GMV, Average Order Value, prepaid/COD ratios, daily revenue breakdown, and supports instant CSV export.
- **Inventory Valuation (`src/app/admin/reports/inventory/page.tsx`):** Calculates live warehouse stock valuation, low-stock thresholds, and reorder warnings from the `products` table with CSV export.
- **Coupons & Referral Analytics (`src/app/admin/reports/coupons-referrals/page.tsx`):** Connected to `coupons` and `referrals` tables tracking redemption rules and reward coins awarded.
- **Abandoned Carts Recovery (`src/app/admin/reports/abandoned-carts/page.tsx`):** Fetches real pending items from `cart_items` with customer contact info and in-app nudge reminders.
- **Dynamic Imports & TypeScript Compilation:** Fixed dynamic import paths in `scripts/encrypt-credentials.ts` and validated the whole codebase with `npx tsc --noEmit` (currently passing clean).
- **PhonePe checkout flow finalized:** Webhook endpoint (`src/app/api/webhooks/phonepe/route.ts`) now cryptographically verifies callbacks and finalizes order creation via `src/lib/orders/finalize-phonepe-order.ts`; the checkout redirect path and DB UUID order routing were corrected (closes UI & UX audit items C2/C3).
- **AI settings route hardening:** `src/app/api/admin/ai/settings/route.ts` now enforces authenticated backend clients with strict role checks on top of the secure AI-credentials RLS policies.

---

## 2. Follow-up Audit (August 2026) — Resolved

A second verification pass of the codebase found and fixed the following remaining issues:

- **`super_admin` role excluded from Users RPCs:** `supabase/migrations/0019_admin_users_rpc.sql` now includes `super_admin` in the role checks of `admin_get_all_users`, `admin_update_user_role`, and `admin_update_user_balance`, so a `super_admin` user is no longer blocked from the Users page.
- **Users page stuck "Saving..." state:** `src/app/admin/users/page.tsx` `handleSaveBalance` now resets `isUpdatingBalance`, `walletAmount`, and `coinsAmount` on success instead of leaving the button disabled until the modal unmounts.
- **Users page role filter mismatch:** The "Admins" tab now matches all internal roles (`admin`, `manager`, `staff`, `super_admin`), consistent with the "Admins & Staff" stat card. A distinct `super_admin` badge was added, and the `UserRecord`/`selectedRole` types now include `super_admin`.
- **WhatsApp broadcast rate limiter was in-memory:** `src/app/api/admin/whatsapp/campaign/route.ts` replaced the module-scoped `Map` (which reset on serverless cold starts) with a DB-backed limiter that counts requests in the `audit_logs` table (`entity_type = 'whatsapp_broadcast'`), shared across all serverless instances. No migration required.

---

## 3. All Core Audits Cleared
All major frontend and backend modules are wired directly to the Supabase database.

### Known Open Item — Resolved
- **Silent demo-data fallbacks:** `products`, `reports/sales`, `reports/inventory`, `reports/abandoned-carts`, `reports/coupons-referrals`, and `seo` pages previously substituted hardcoded/mock data on any Supabase query error **or empty result**, which could mask real failures (e.g., a misconfigured RLS policy rendering plausible-looking fake data). All fallbacks have been removed:
  - Queries now surface a visible error banner (with a Retry button) when Supabase returns an error.
  - Empty results render explicit empty states instead of demo data.
  - Data lists are cleared on error so stale/mock rows are never shown alongside a failure.
  - Verified with `npx tsc --noEmit` (passing clean).

---

## 4. Verification Pass (2026-08-26) — All Confirmed Resolved

A fresh verification pass on **August 26, 2026** re-checked every fix in this report against the live codebase. All items remain fixed:

- **WhatsApp broadcast rate limiter (DB-backed):** confirmed — `src/app/api/admin/whatsapp/campaign/route.ts:99` counts requests in `audit_logs` and persists the 24h per-recipient cooldown (`:244`), so limits survive serverless cold starts and are shared across instances.
- **SSRF protection:** confirmed — `safeFetch` (`src/lib/security/ssrf.ts:316`) is used by `src/app/api/admin/ai/test-connection/route.ts:200` and `src/app/api/admin/ai/discover-models/route.ts:180`.
- **AI credentials security:** confirmed — `supabase/migrations/0045_secure_ai_credentials_rls.sql` exists and all `/api/admin/ai/*` routes use authenticated backend clients.
- **No silent demo-data fallbacks:** confirmed — query errors surface visible error banners with Retry, empty results render explicit empty states, and stale rows are cleared on error.
- **TypeScript compilation:** confirmed clean — `npx tsc --noEmit` exits with zero errors.

## 5. Status Summary

| Audit | Result |
|-------|--------|
| Security (auth, SSRF, credentials, rate limiting) | ✅ Resolved |
| Schema / RLS / Supabase wiring | ✅ Resolved |
| Dashboard & report demo-data fallbacks | ✅ Resolved |
| TypeScript compilation | ✅ Clean |
| PhonePe checkout flow (webhook + finalization) | ✅ Resolved |

**No open items remain.** All issues in this report are fully resolved and can be considered closed.
