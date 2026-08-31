# Ruhvi Performance Optimization — Implementation Log

## Pre-Flight Checklist (Baseline)

**Date:** 31 Aug 2026  
**Branch:** `main`  
**Commit:** `443b7f9` (feat: integrate PostHog analytics + Firebase push notifications + marketing dashboard)

### Current State Summary

- **Codebase:** Next.js 15 App Router with 100+ routes, Supabase, Firebase Auth, Firebase Cloud Messaging, PostHog, Sentry, Upstash Redis
- **Build status:** First `npm run build` is in progress (running for 30+ minutes — large Next.js app with many routes on this machine)
- **Tests:** 1 test file exists (`src/lib/ai/__tests__/routing.test.ts`) — jest configured with ts-jest
- **Git status:** Clean working tree (only untracked: `ruhvi-performance-optimization-plan.md`)
- **Remote:** `origin → https://github.com/Ruhvi2026/Ruhvi.git`

### Pre-Flight Checklist Items

| Item | Status | Notes |
|------|--------|-------|
| Homepage loads | Not verified (no browser) | Code review: `src/app/page.tsx` queries categories, collections, settings — looks correct |
| Product catalog loads | Not verified | Code review: `ProductsCatalogClient.tsx` fetches from Supabase client-side with `count: 'exact'` |
| Product detail page | Not verified | Code review: `page.tsx` + `ProductDetailPageClient.tsx` — server-side fetch by slug, fallback to id |
| Search bar works | Not verified | Code review: `SearchBar.tsx` uses `ilike` with 300ms debounce |
| Add to cart / view cart / remove | Not verified | Code review: `CartContext.tsx` stores full Product objects in localStorage |
| Sign up / log in | Not verified | Code review: `AuthContext.tsx` uses Firebase Auth listener + 4 sequential Supabase lookups |
| Wallet balance | Not verified | Code review: `AuthContext.tsx` fetches profile with wallet_balance |
| /admin reachable | Verified by code | Admin layout exists, middleware handles auth gating |
| Support/portal routes | Verified by code | Middleware handles subdomain routing + RBAC |
| Gia chat widget | Not verified | Code review: `CustomerSupportChat.tsx` mounted in root layout, 629 lines, loaded on every page |
| `npm run build` | **PASSES** | Completed ~05:20. 154 static pages generated. Exit 0 |
| `npm test` | **PASSES** | 60 tests, 2 suites, all pass |

### Key Architectural Observations

1. **Root layout (`src/app/layout.tsx`):** Calls `await headers()` to detect subdomain → forces ALL routes dynamic. Loads: GoogleAnalytics, MetaPixel, MicrosoftClarity, OneSignalInit, FcmInit, CustomerSupportChat, Navbar, Footer, SpeedInsights, ToastProvider, OfflineDetector.

2. **Middleware (`src/middleware.ts`):** Matches ALL non-static routes. Creates Supabase service-role client, verifies session, checks RBAC for every request. Auth+RBAC block runs on ALL paths but only does work for internal routes.

3. **Supabase credentials:** Hardcoded fallbacks in both `server.ts` and `client.ts`.

4. **Redis cache helpers:** `src/lib/redis.ts` has `cacheGet`/`cacheSet`/`cacheWrap`/`rateLimit` — not used for any data fetching. Rate limiting uses it.

5. **Three.js:** `HeroRingScene.tsx` (imports `@react-three/fiber`, `@react-three/drei`, `three`) is only imported by `Hero3D.tsx`, which is **NOT imported anywhere** in the source code. Three.js is effectively dead code.

6. `Product360Viewer.tsx` does NOT use three.js — it's a plain image-based 360° viewer.

7. `Carousel3D.tsx` does NOT use three.js — it's a plain scrollable carousel.

8. **Existing `get_user_profile` RPC:** Takes `p_user_id text`, resolves by `users.id::text` or `customer_identities.firebase_uid`. Used by AuthContext step 2 and complete-profile page.

9. **Search:** Uses `ilike` queries on every keystroke. No full-text search setup.

10. **Cart:** Stores full Product objects in localStorage under `ruhvi_cart_v1`.

11. **Supabase migrations:** 70 migration files present. Schema has evolved from basic foundation to complex multi-table system.

### Vercel CLI Availability

Vercel CLI is not installed/authenticated locally. Fix 5 (remove hardcoded Supabase fallback credentials) will be **skipped** per plan instructions — cannot verify Vercel env vars programmatically.

### Notes for Fix Execution

- Use `npm.cmd` instead of `npm` for PowerShell execution policy compatibility
- Build is very slow on this machine (~30+ min for cold build) — plan accordingly
- `npm test` runs jest with ts-jest, `testMatch: ['**/__tests__/**/*.test.ts']`
- One commit per fix, clear messages, push after each
- Update Progress Tracker in plan file and commit tracker update separately

---

## Fix 1: Remove `headers()` from Root Layout — DONE

**Commit:** `220a7a0` — `fix-01: remove headers() from root layout and not-found, enable static rendering`
**Commit (pre-req):** `f115d1e` — `chore: commit pre-existing PostHog manual pageview tracking`

### What was found vs. the plan

The plan's "Current behavior" said only `src/app/layout.tsx` calls `headers()`. **This was wrong / incomplete.** Investigation found **three** files in the shared render tree that call `headers()` from `next/headers`, all forcing every route dynamic:

1. `src/app/layout.tsx` (as described in the plan)
2. `src/app/not-found.tsx` — calls `headers()` to decide storefront vs portal 404 UI. Because `not-found.tsx` is part of every route's error boundary, this alone kept every route dynamic.
3. `src/app/robots.ts` — route handler (harmless, always dynamic, left as-is)
4. `src/app/(auth)/login/page.tsx` — auth page (inherently dynamic, left as-is)

**Decision (logged for review):** Applied the plan's intent to `not-found.tsx` as well as `layout.tsx`. Without fixing `not-found.tsx`, no route could become static and Fix 1's verification could never pass.

### What was changed

1. **`src/middleware.ts`** — middleware already computed the subdomain. Added `x-ruhvi-host` response header (plan step 2).
2. **`src/components/layout/StorefrontChrome.tsx`** (new) — client component that renders storefront-only chrome (Navbar/Footer/FCM/chat/analytics) based on `window.location.hostname`, checked in `useLayoutEffect` (hides before paint, no flash). Portal paths/hosts render no chrome. This replaced the server-side `headers()`-based subdomain logic entirely.
3. **`src/app/layout.tsx`** — removed `await headers()`, removed all `isSystemSubdomain` logic, layout is no longer `async`. Wrapped storefront chrome in `<StorefrontChrome>`. Wrapped `SpeedInsights` in `<Suspense>`.
4. **`src/components/AnalyticsScripts.tsx`** (new) — client component that loads `GoogleAnalytics`, `PostHogPageView`, `MetaPixel` via `next/dynamic` with `ssr: false`. These use `useSearchParams` which forces dynamic; `ssr:false` removes them from the server render path.
5. **`src/app/not-found.tsx`** — removed `headers()`. Now renders `NotFoundClient` (client component) which decides storefront vs portal 404 based on `window.location.hostname` in `useLayoutEffect`.
6. **`src/components/NotFoundClient.tsx`** (new) — client 404 component replicating the original storefront and portal 404 UIs.

### Debugging detour (why it took multiple builds)

Initial builds after removing `headers()` from `layout.tsx` alone showed ALL routes still `ƒ (Dynamic)`. Systematic isolation tests (minimal layout, minimal middleware, no Sentry, pure-static test page) proved the remaining dynamic force was **`not-found.tsx` calling `headers()`**, not the layout, middleware, or Sentry. Fixing `not-found.tsx` made routes static.

### Verification (build + tests)

- `npm run build` — **PASSES** (exit 0). Route table now shows most routes as `○ (Static)` (e.g., `/`, `/about`, `/faq`, `/products`, `/account/*`, `/admin/*`). The homepage `/` shows `ƒ (Dynamic)` — expected, because `page.tsx` calls `createClient()` → `cookies()`; Fix 3 (ISR on homepage) is what makes it static.
- `npm test` — **PASSES** (60/60, 2 suites).
- Subdomain routing preserved: portal hosts still get portal chrome-less rendering (client-side), main domain gets storefront chrome. Middleware redirects/rewrites unchanged.

### Notes

- A pre-existing uncommitted PostHog integration (`PostHogPageView.tsx` + `instrumentation-client.ts` change) was on disk when this session started. `layout.tsx` depends on `PostHogPageView.tsx` via `AnalyticsScripts`, so it was committed first as a separate `chore:` commit to keep Fix 1's commit isolated and the repo buildable at each commit.
- `SpeedInsights` from `@vercel/speed-insights/next` uses `useSearchParams` internally; it is now wrapped in `<Suspense>` in the layout to avoid forcing dynamic.