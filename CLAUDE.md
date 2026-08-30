# CLAUDE.md — Ruhvi

Project memory so a fresh session doesn't need to re-analyze the whole tree. Keep this high-signal.

> **📌 Maintenance policy (standing instruction).** After making any change that affects what's written here, **update this file in the same task** — before considering the work done. Update when you:
> - add/remove/change an **integration or dependency** (also update `PROJECT_INTEGRATIONS_AUDIT.md`),
> - add/rename/remove an **env var**, **script/command**, or **route/subdomain**,
> - resolve or introduce a **Known issue** (edit the list + the "as of" date below),
> - change **auth, DB, payments, or build** behavior.
>
> Keep edits terse and factual. Don't log trivial edits (typos, styling). Bump the date in **Known issues** when you touch that section.

## What this is
- **Ruhvi** — a production jewelry **e-commerce** app. `package.json` name: `ruhvi-ecommerce`, v0.1.0, private.
- **Stack:** Next.js 15.5 (App Router) · React 19 · TypeScript · Tailwind CSS 3. Runtime: Node 24. Host: Vercel.
- **Location:** this project lives in `C:\Users\INDIA\Desktop\Project Ruhvi`. The folder `C:\Users\INDIA\Desktop\claude` is just a **scratch folder** (`dino.html`, `heart.html`) — not part of this app.
- **Repo:** `origin → https://github.com/Ruhvi2026/Ruhvi.git`, default branch `main`.
- **Scale:** ~305 TS/TSX files, 103 pages, 57 API routes.

## Commands (verified 2026-08-26)
- `npm run dev` — dev server
- `npm run build` — production build. **Passes clean** (one benign warning, see Known issues #1).
- `npx tsc --noEmit` — typecheck. **Passes clean (0 errors).**
- `npm run lint` — ⚠️ **ESLint is NOT configured**; `next lint` currently drops into an interactive wizard. See Known issues #2.
- No `test` script yet; only 1 test file (`src/lib/ai/__tests__/routing.test.ts`). `@types/jest` is installed but unwired.
- **Pre-merge gate:** `npx tsc --noEmit && npm run build` must both pass.

## Architecture (the non-obvious parts)
- **Database:** Supabase (Postgres) is the source of truth. Client in `src/lib/supabase/{client,server}.ts`.
- **Auth:** **Firebase Auth is the sole auth provider** (email/password, phone OTP, Google, Facebook). **Supabase Auth is NOT used.** A **custom HS256 JWT** (signed with `SUPABASE_JWT_SECRET`) is minted for Supabase RLS. RLS keys off the JWT `sub` = `public.users.id` (decoupled from Firebase UID via the `customer_identities` junction table, migration `0030`).
  - Auth libs: `src/lib/auth/{verify-session,server,require-admin,require-admin-client,rbac}.ts`.
  - Firebase Admin uses the **Google Identity Toolkit REST API + `jose`** (not the heavy `firebase-admin`/`jwks-rsa` SDK) to avoid ESM bundler conflicts on Vercel. `jose` is pinned to `4.15.9` (see `overrides` in package.json — do not bump without testing).
- **Payments:** PhonePe (`src/app/api/checkout/phonepe`, webhook at `api/webhooks/phonepe`, order lifecycle in `src/lib/orders/`). Partial COD pre-payment (10% for COD > ₹2000) exists.
- **Logistics:** Shiprocket (`src/lib/shiprocket.ts`) — falls back to a mock token if creds absent.
- **Images:** Cloudinary (`src/services/cloudinaryService.ts`), unsigned upload preset from the client.
- **Email:** Resend (transactional) + Brevo (marketing, incl. Brevo MCP for AI tool-calling).
- **AI:** multi-provider failover engine in `src/lib/ai/` (credentials, error-classifier, model-health, diagnostics). Keys for multi-credential mode live in the `ai_provider_credentials` **DB table**, not env.
  - Support chat (`/api/support/chat`) injects a verified **CUSTOMER CONTEXT** (profile, orders+tracking, wallet ledger, reward ledger, returns, ticket statuses) and follows a **resolve-first escalation protocol**: answer from data first, only create a ticket when no definitive resolution is possible. It calls `generateAIContent(..., { skipPiiRedaction: true })` so the customer's own email/phone reach the model (global PII redaction otherwise strips them).
- **Push/analytics:** OneSignal (marketing push) + FCM (transactional push); PostHog, GA4, Meta Pixel/CAPI, Sentry, Vercel Speed Insights.
- **Support CRM (agents):** EspoCRM is self-hosted on a VPS at `crm.support.ruhvi.in` (`deploy/esporcrm/`), agents-only ticket console. Supabase stays the source of truth; bidirectional sync via HMAC-signed APIs/webhooks (`src/lib/espo/`, `/api/integrations/espo/{context,webhook,health}`). Gated by `ESPO_ENABLED`; the customer-facing `support.ruhvi.in` portal is unchanged. See `ESPOCRM_INTEGRATION.md`.

## Subdomain / portal routing
Routing is host-based in `src/middleware.ts`. Portal hosts (prod → `*.localhost` in dev):
- `admin.ruhvi.in` → admin panel (`/admin`)
- `operation.ruhvi.in` → `/operations/*` (root redirects to `/operations/dashboard`)
- `orders.ruhvi.in` → orders portal
- `support.ruhvi.in` → `/support/*` (root redirects to `/support/dashboard`)
- `crm.support.ruhvi.in` → **not** part of this app; points to the self-hosted EspoCRM VPS (agent console). EspoCRM syncs with this app via `src/lib/espo/` + `/api/integrations/espo/*`.
- `marketing.ruhvi.in` → `/marketing/*`
- `auth.ruhvi.in` → auth pages
- Root host (`ruhvi.in`) → customer storefront. Portal hosts get `X-Robots-Tag: noindex` and signup is blocked.

## Env & secrets
- Env files: `.env.local` (local) and `vercel.env` (mirror of Vercel dashboard). **Both are gitignored — never commit them.** Sentry config `.env.sentry-build-plugin` is also gitignored.
- Production env truth lives in the **Vercel dashboard**, not the local files.
- `next.config.js` is wrapped by `withSentryConfig(...)` — edits to `nextConfig` go in the object at the **top** of the file.

## Known issues / gotchas (as of 2026-08-26)
A full remediation plan with exact diffs is in **`fix.md`**. Summary:
1. **Workspace-root build warning** — a stray `C:\Users\INDIA\package.json` + lockfile in the home dir makes Next infer the wrong file-tracing root. Fix: add `outputFileTracingRoot: __dirname` to `next.config.js`.
2. **ESLint not configured** — no `eslint.config.*`, not in `package.json`; linting effectively runs nowhere (incl. the Husky pre-commit hook). Use modern flat config + `eslint-config-next`, not the deprecated `next lint`.
3. **Env cleanup pending** — 4 dead vars (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`). ⚠️ The `VITE_*` and `FIREBASE_STORAGE_BUCKET` ones are **still referenced in code** (fallbacks / Firebase init) — removing the env var alone is incomplete; the code branches must go too. Details in `fix.md` §3.
4. **38 `console.log`** in `src` ship to prod bundles (can be stripped via `compiler.removeConsole`).
5. **1 real TODO:** `src/components/FcmInit.tsx:22` — FCM device tokens are obtained but never persisted to a backend table. (Other `XXXX` grep hits are placeholder strings, not TODOs.)
6. Thin test coverage; no README.

## Source-of-truth docs (project root)
- `PROJECT_INTEGRATIONS_AUDIT.md` — **the integration register** (well-maintained; update when adding/removing services). Note: it lists a few vars as "unused" that are actually still referenced in code — verify against source before acting.
- `fix.md` — health-fix implementation plan.
- `ESPOCRM_INTEGRATION.md` — EspoCRM agent console integration (architecture, flows, setup).
- `SCHEMA.md` — DB schema. `Operations and Orders.md` — ops/orders flows. `ticket.md`, `issues.md`, `phase 17 implementation_plan.md`, UI/UX docs.
- DB migrations: `supabase/migrations/` (sequentially numbered, e.g. `0030_unified_customer_identity.sql`).
