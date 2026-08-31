# Ruhvi Performance Optimization — Implementation Plan

**Project:** Ruhvi E-Commerce (Next.js 15, App Router, Supabase, Firebase Auth)
**Status:** Pre-launch, 2-3 internal test accounts, no live customer traffic yet
**Compiled from:** Ruhvi Performance Audit + Technology & Platform Inventory (both revised 30 Aug 2026), plus planning decisions made in conversation on 30 Aug 2026
**Audience:** An AI coding agent (Antigravity) executing this plan directly against the codebase

## If you are the AI agent executing this plan

Treat this document as your full task specification. Every fix below is written to be unambiguous — if something in the actual code doesn't match a "Current behavior" description, **stop and report what you found instead of improvising.** Do not take shortcuts to mark something "done" faster. Read [Section 0](#0--ground-rules--read-before-starting-any-fix) before touching any code.

---

## 0 — Ground Rules (Read Before Starting Any Fix)

1. **One fix at a time.** Fully complete, test, and commit each fix before starting the next. Never combine two fixes into one commit.
2. **Never guess at business logic.** If instructions are ambiguous, or the real code doesn't match what's described here, stop and ask rather than inventing behavior.
3. **These are optimizations, not feature changes.** The end user must not see or experience any difference in what the site *does* — only how fast it is and how it's built. The only two exceptions, where something is actually being removed, are Fix 12 (OneSignal) and part of Fix 13 (Google Analytics + Clarity) — both are called out explicitly below.
4. **No shortcuts.** If a fix needs a real database migration, write it — don't fake it with hardcoded data. If a fix needs a shared utility, actually share it — don't copy-paste logic into two places to save time.
5. **Establish the baseline below before touching anything**, and re-run it after *every single fix*, not just at the end.
6. **One git branch/commit per fix**, named after the fix number (e.g. `fix-01-remove-headers-root-layout`) — this makes it trivial to isolate and roll back exactly one change if something breaks.
7. **Run `npm run build` and `npm test` after every fix**, before moving to the next. Do not proceed on a broken build.
8. **Before touching a shared file** (`middleware.ts`, `layout.tsx`, `AuthContext.tsx`, `CartContext.tsx`), search the whole codebase for every place that imports or depends on it. These files are used everywhere — an unnoticed usage is how a "small" fix breaks an unrelated page.

## Pre-Flight Checklist (once, before Fix 1)

Manually verify and note that all of the following currently work, so regressions are obvious later:

- [ ] Homepage loads and shows categories, collections
- [ ] Product catalog loads and every filter/sort option works
- [ ] Product detail page loads, correct title/meta tags, related products shown
- [ ] Search bar returns relevant results while typing
- [ ] Add to cart, view cart, remove from cart
- [ ] Sign up / log in via whichever of the four methods (email+password, phone OTP, Google, Facebook) are actually live
- [ ] Wallet balance displays correctly for a test account
- [ ] `/admin` is reachable when logged in as admin, blocked otherwise
- [ ] Support/portal routes are auth-gated correctly
- [ ] The Gia support chat widget opens and responds
- [ ] `npm run build` completes with no errors
- [ ] `npm test` passes

Keep this checklist open and re-run it after each fix below.

---

## PHASE 1 — Foundational Infrastructure

### Fix 1: Remove `headers()` from the Root Layout
**File:** `src/app/layout.tsx` (~line 147) · **Severity:** High (Audit ref: H-1.1) · **Regression risk:** Low if verified correctly

**Current behavior:** The root layout calls `await headers()` to detect the subdomain. Calling `headers()` anywhere in a server component marks that entire route tree dynamic — no page on the site can be statically generated or edge-cached, even pages with zero subdomain logic.

**Required change:**
1. Confirm `src/middleware.ts` already computes the subdomain (the audit says it does — verify, don't assume).
2. Have the middleware set the detected subdomain as a request header (e.g. `x-ruhvi-host`) via `NextResponse.next({ request: { headers } })`, or as a cookie.
3. Remove the `headers()` call from `layout.tsx`.

**Verification — do not skip this:** Reading a header/cookie value inside the layout via `headers()`/`cookies()` can *itself* still force dynamic rendering, even if the value now comes from middleware. After the change, run `npm run build` and check the route summary — routes that should now be static must show `○ (Static)` or use ISR. If routes are still dynamic, the fix isn't done: the subdomain logic needs to move fully into middleware-based rewrites instead of being read in the layout at all. Report back rather than marking this complete.

**Must still work:** Subdomain-based routing (portal/admin/support subdomains) behaves identically to before.

---

### Fix 2: Narrow the Middleware Matcher to Internal Routes Only
**File:** `src/middleware.ts` · **Severity:** High (Audit ref: H-5.1) · **Regression risk:** Medium — get the path list exactly right

**Current behavior:** The middleware matches all non-static paths. On *every* request — including the public homepage — it sets security headers, does subdomain routing, creates a Supabase server client with the **service-role key**, verifies the session cookie, and queries `users` for `role`, `account_status`, `allowed_portals`.

**Required change:**
1. Scope the auth + RBAC block to run only for these path prefixes: `/admin`, `/support`, `/operations`, `/marketing`, `/portal-orders` — search the codebase for all actual routes under these prefixes first, including nested sub-routes.
2. All other paths skip the auth/RBAC block entirely. Security headers (`X-Content-Type-Options`, `X-Frame-Options`, HSTS) still apply to every response.
3. Keep the existing fail-closed behavior (redirect to login on verification failure) fully intact for internal routes.

**Explicitly do NOT:** weaken the fail-closed redirect. Under-match and accidentally leave a nested admin sub-route unprotected — test every known admin/support/portal sub-route individually, not just top-level paths.

**Verification:** Unauthenticated request to `/admin` still redirects to login. Authenticated non-admin user still blocked from admin routes per RBAC. A public page loads with **zero** Supabase auth query firing — confirm via server logs or Supabase's query log.

---

### Fix 3: ISR / Caching for the Homepage
**File:** `src/app/page.tsx` (~lines 64-79) · **Severity:** High (Audit ref: H-4.4) · **Regression risk:** Low
**Depends on:** Fix 1 (root layout must no longer be forced-dynamic)

**Current behavior:** Three Supabase queries (categories, collections, settings) run on every request, even though this data only changes on admin edits.

**Required change:**
1. Wrap these queries in `unstable_cache`, or set `export const revalidate = <seconds>` at the page level (e.g. 3600).
2. If using `unstable_cache`, tag entries (`categories`, `collections`, `settings`) so admin save actions can call `revalidateTag()` for immediate updates instead of waiting on the timer.

**Must still work:** Editing a category/collection/setting in admin shows up on the homepage within the chosen window (or immediately, if using tags) — verify by actually editing one and checking.

---

### Fix 4: Cache-Control Headers on Public Pages
**Severity:** High (Audit ref: H-5.2) · **Regression risk:** Low

**Current behavior:** No `Cache-Control` / `CDN-Cache-Control` / `Surrogate-Control` anywhere. `vercel.json` only has the cron job. Nothing is cached at the edge.

**Required change:** Add headers like `Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800` to public, non-personalized pages via `next.config.js` or `vercel.json`. **Do not** apply this to authenticated/personalized routes (account, admin, checkout, cart).

**Must still work:** Logged-in users still see their own personalized data — confirm no cached/stale personalized content leaks between users.

---

### Fix 5: Remove Hardcoded Supabase Fallback Credentials
**Files:** `src/lib/supabase/server.ts` (~lines 7-8), `src/lib/supabase/client.ts` (~lines 13-17) · **Severity:** Medium, security-adjacent (Audit ref: M-5.1) · **Regression risk:** High if done out of order

**Current behavior:** Hardcoded fallback values for `NEXT_PUBLIC_SUPABASE_URL` and the anon key are used if the env var isn't set — meaning a misconfigured environment silently falls back to a hardcoded database.

**Required change — order matters:**
1. **First**, confirm in Vercel project settings that both env vars are correctly set for **all three** environments (Production, Preview, Development). Do not proceed until confirmed.
2. Only then remove the hardcoded fallbacks and throw a clear startup error if the var is missing — verify `src/lib/env.ts`'s Zod schema already covers these two variables.

**Must still work:** App builds and runs identically in all three environments. A missing var should now surface as an immediate build/deploy failure, not a silent wrong-database bug — that's the intended outcome.

---

## PHASE 2 — Data Fetching & Caching

### Fix 6: Actually Wire Up the Existing Upstash Redis Cache
**Severity:** High (audit gap — confirmed missing during planning, not in original numbered list)

**Current behavior:** Upstash Redis is already integrated with `cacheGet`/`cacheSet`/`cacheWrap` helpers already written, and rate limiting already uses it. **None of the actual data-fetching hot paths (homepage, catalog, search) call these helpers** — every request still hits Supabase directly.

**Required change:**
1. Locate the existing cache helper module (search the codebase — find it, don't assume a path).
2. Wrap the homepage queries (Fix 3), catalog query (Fix 7), and search query (Fix 9) with `cacheWrap`, keyed by the relevant filters/pagination/search term, with a short TTL (60-300s).
3. Invalidate relevant cache keys on admin writes, or rely on the short TTL alone as an acceptable first version.

**Must still work:** Data is never stale longer than the TTL; admin edits show up within that window — test by editing a product and checking the catalog.

---

### Fix 7: Server-Side Catalog Fetching with Streaming
**File:** `src/app/products/ProductsCatalogClient.tsx` (~lines 52-69) · **Severity:** High (Audit ref: H-4.1) · **Regression risk:** Medium

**Current behavior:** Fully client-rendered — spinner, then JS download, then hydration, then a client Supabase query with a heavy relational join (`images`, `category`) plus `count: 'exact'` (full table scan) on every pagination page. Filtering/sorting happen in the browser.

**Required change:**
1. Move the initial fetch to the server (Server Component / route handler) with React Suspense streaming.
2. Push filtering, sorting, and pagination into the Supabase query itself instead of the browser.
3. Remove `count: 'exact'` — use an approximate count, or compute exact count once and cache it (Fix 6).
4. Use `useInfiniteQuery` (or equivalent) client-side for subsequent pages, with caching.

**Explicitly do NOT** change what filters exist or how they behave — this only moves *where* the work happens. Enumerate every current filter/sort option first and confirm each has a server-side equivalent before removing the client-side version.

**Must still work:** Every filter/sort combination returns the same results as before — test each individually and in combination.

---

### Fix 8: Consolidate AuthContext's 4 Sequential Queries into 1
**File:** `src/context/AuthContext.tsx` (~lines 54-110) · **Severity:** High (Audit ref: H-4.2) · **Regression risk:** Medium — precedence order must match exactly

**Current behavior:** Up to four sequential lookups (by `id`, then Firebase UID via RPC, then phone, then email) run one after another on every page load for a logged-in user.

**Required change:**
1. Write one Postgres RPC accepting all four identifiers as optional params, returning the first match **using the exact same precedence order as today: `id` → `firebase_uid` → `phone` → `email`.** Do not change this order — it may reflect an intentional trust hierarchy.

   Adapt to the real schema before using verbatim:
   ```sql
   CREATE OR REPLACE FUNCTION get_user_profile(
     p_id uuid DEFAULT NULL,
     p_firebase_uid text DEFAULT NULL,
     p_phone text DEFAULT NULL,
     p_email text DEFAULT NULL
   ) RETURNS SETOF users AS $$
     SELECT * FROM users
     WHERE (p_id IS NOT NULL AND id = p_id)
        OR (p_firebase_uid IS NOT NULL AND firebase_uid = p_firebase_uid)
        OR (p_phone IS NOT NULL AND phone = p_phone)
        OR (p_email IS NOT NULL AND email = p_email)
     ORDER BY
       CASE
         WHEN p_id IS NOT NULL AND id = p_id THEN 0
         WHEN p_firebase_uid IS NOT NULL AND firebase_uid = p_firebase_uid THEN 1
         WHEN p_phone IS NOT NULL AND phone = p_phone THEN 2
         WHEN p_email IS NOT NULL AND email = p_email THEN 3
       END
     LIMIT 1;
   $$ LANGUAGE sql STABLE;
   ```
2. Replace the four sequential calls in `AuthContext.tsx` with one call to this RPC.
3. Add **separate single-column indexes** on `firebase_uid`, `email`, and `phone` (in addition to the existing PK on `id`) — for this OR-based lookup, separate indexes generally serve better than one combined composite index. Confirm with `EXPLAIN ANALYZE` that indexes are actually being used.

**Must still work:** For every existing test account, the RPC must return the exact same profile the old 4-step logic would have. This fix is the most likely to subtly change *which* user gets matched if precedence is off — explicitly test all current test accounts.

---

### Fix 9: Full-Text Search Instead of Per-Keystroke ILIKE
**File:** `src/components/search/SearchBar.tsx` (~lines 75-108) · **Severity:** High (Audit ref: H-4.3) · **Regression risk:** Medium — search *quality*, not just speed, needs re-validation

**Decision made:** Postgres full-text search (built into Supabase, free) — not an external service like Meilisearch/Typesense — given current catalog size and free-tier infrastructure. Revisit only if the catalog grows to tens of thousands of products or typo-tolerant search becomes a hard requirement.

**Current behavior:** Every keystroke (300ms debounce) fires an `ilike` query against `products`, joined with `product_images` and `categories`. `ilike` can't use a standard index efficiently.

**Required change:**
1. Add a generated column + GIN index (confirm actual column names first):
   ```sql
   ALTER TABLE products ADD COLUMN search_vector tsvector
     GENERATED ALWAYS AS (
       setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
       setweight(to_tsvector('english', coalesce(sku, '')), 'B')
     ) STORED;

   CREATE INDEX products_search_idx ON products USING GIN (search_vector);
   ```
2. Replace `.ilike()` with `.textSearch('search_vector', query, { type: 'websearch', config: 'english' })`.
3. **Test for a real behavioral difference:** full-text search matches whole lexemes, not arbitrary substrings — "ring" won't necessarily match "earring" the way `ilike` did. Decide whether prefix matching (`'ring:*'`) is needed to preserve substring-like behavior. Build a list of 10-15 real search terms and compare before/after results — this is a quality check, not just a speed check.

**Must still work:** Every search term that currently returns results returns equivalent (or better) results.

---

### Fix 10: Share the Product-Detail Fetch Between Page and Metadata
**File:** `src/app/products/[slug]/page.tsx` (~lines 88-103) · **Severity:** Medium (Audit ref: M-4.1) · **Regression risk:** Low

**Current behavior:** Both the page and `generateMetadata` independently query by slug, then by ID on failure — fetching the same product twice per request.

**Required change:** Wrap the slug/ID lookup in `React.cache()` (or `unstable_cache`) so both call sites reuse one result per request. Add a DB index on `slug` if missing.

**Must still work:** Page titles, meta descriptions, and Open Graph tags are byte-for-byte identical to before — compare rendered `<head>` tags for a few products.

---

### Fix 11: Slim Down Cart Data in localStorage
**File:** `src/context/CartContext.tsx` (~lines 43-47) · **Severity:** Medium (Audit ref: M-4.2) · **Regression risk:** Medium — this is a stored-data shape change

**Current behavior:** The entire `Product` object (images, category, full description) is serialized into `localStorage` under `ruhvi_cart_v1` per cart line item.

**Required change:**
1. Store only `product_id`, `quantity`, `price_at_add` per line item.
2. Fetch full product details (image, name, current price) from the existing product cache/API using `product_id` wherever the cart is displayed.
3. **Critical migration step:** existing test users may have a cart saved in the old full-object format. On load, detect the old shape (or a failed parse against the new shape) and either best-effort migrate (extract `id`/`quantity`/`price`) or clear gracefully — do not let the app crash on a malformed read.

**Must still work:** Cart display looks identical. Test by adding items under the OLD code, then deploying the NEW code without clearing localStorage, and confirming the cart still loads.

---

## PHASE 3 — Bundle Size & Third-Party Consolidation

### Fix 12: Remove OneSignal, Keep Firebase Auth + FCM
**Severity:** High (Audit ref: H-3.2) · **Regression risk:** Low (pre-launch, minimal subscribers) — **this is an actual removal, not just an optimization**

**Decision made:** Firebase stays (already the auth provider); OneSignal is fully removed since FCM already covers push, and running both was pure duplication.

**Required change:**
1. Remove the `OneSignalInit` component and its usage in the root layout.
2. Remove `react-onesignal` from `package.json`, update the lockfile.
3. Delete `public/OneSignalSDKWorker.js`.
4. Search the codebase for every `OneSignal`/`onesignal` reference (including any admin campaign features and Vercel env vars) and remove them all.
5. **Before deleting anything**, confirm Firebase FCM (`FcmInit`, `public/firebase-messaging-sw.js`) works end-to-end on its own — test an actual push notification, foreground and background.

**Confirm with the user before executing:** no current marketing workflow depends on OneSignal-specific dashboard/segmentation features, since those don't carry over to FCM automatically.

**Must still work:** Push permission prompts and actual delivery work via FCM alone, foreground and background.

---

### Fix 13: Consolidate Analytics — PostHog as Primary
**Severity:** High (Audit ref: H-3.1) · **Regression risk:** Low technically, but has a business/marketing tradeoff

**Decision made:**
- **Keep and expand PostHog** as primary — its free tier covers product analytics, session recording, and heatmaps, replacing both GA4 and Microsoft Clarity.
- **Remove Google Analytics (GA4) and Microsoft Clarity** entirely.
- **Keep Meta Pixel, scoped to checkout and product-detail pages only** (the only tool doing ad attribution).
- **Keep Vercel Speed Insights as-is** (performance monitoring, not user analytics, not part of this problem).

**Flag before executing:** removing GA4/Clarity loses historical dashboard continuity from the cutover date forward; scoping Meta Pixel down loses `PageView`/`ViewContent` events on non-checkout/non-product pages, which can shrink ad-retargeting audiences. Low-stakes pre-launch with no live campaigns — confirm this is still fine if ad campaigns have started by execution time.

**Required change:**
1. Remove GA4 (`gtag.js`, `GoogleAnalytics` component) and Microsoft Clarity from the root layout.
2. Move the Meta Pixel script from the root layout into only the checkout flow and product-detail components.
3. Verify the server-side Meta Conversions API (`/api/capi`) still fires correctly from the scoped-down pages.
4. In PostHog, confirm equivalent custom events exist for GA4's e-commerce tracking (`add_to_cart`, `purchase`, `view_item`, etc.) — add any missing ones so this is a consolidation, not a data loss.

**Must still work:** All e-commerce funnel events are tracked somewhere (now PostHog). Meta ad conversion tracking still works on checkout/product pages.

---

### Fix 14: Lazy-Load the Gia Support Chat Widget
**File:** `src/components/CustomerSupportChat.tsx` (629 lines), mounted in `src/app/layout.tsx` (~line 255) · **Severity:** High (Audit ref: H-1.3) · **Regression risk:** Low

**Current behavior:** The full widget (drag-and-drop, resize, AI integration, typewriter effect) loads on every public page regardless of use, adding ~30kB to the critical path.

**Required change:**
1. Render only a small mascot icon/button on initial load — not the full component.
2. Load the full `CustomerSupportChat` via `next/dynamic` with `ssr: false`, triggered only on click.
3. Confirm the auto-ticket-creation feature still works once lazy-loaded (i.e. it still has access to any context providers it depends on, e.g. Auth).
4. While in there, verify the typewriter effect's interval doesn't run while the chat is closed — if it does, that's a small separate bug worth flagging.

**Must still work:** Clicking the mascot opens the full chat with no unreasonable delay; drag, resize, AI responses, and ticket creation all work identically once opened.

---

### Fix 15: Scope Three.js to Specific Product Pages Only
**Files:** `package.json` (`@react-three/fiber`, `@react-three/drei`, `three`); `HeroRingScene`, `Hero3D`, `Product360Viewer` · **Severity:** High (Audit ref: H-3.3) · **Regression risk:** Medium — leakage is easy to reintroduce accidentally

**Current behavior:** These libraries (~500kB+ gzipped) are leaking into shared bundles — `/account` (361kB) and `/admin/ai-settings` (345kB) have no reason to include 3D code at all.

**Required change:**
1. Audit every import of `three`, `@react-three/fiber`, `@react-three/drei`.
2. Ensure every consuming component loads via `next/dynamic` with `ssr: false`, and only appears on the specific pages that need it — never in a shared layout/component/context.
3. After the change, run a bundle analysis and confirm `/account` and `/admin/ai-settings` no longer include Three.js in First Load JS — this is the concrete success criterion.

**Must still work:** Homepage hero 3D scene and `Product360Viewer` render identically, without leaking into unrelated bundles.

---

## Appendix — Additional Audit Items (Not Covered in Detail During Planning)

Included for completeness so nothing from the audit is silently dropped. Review these with the same rigor before executing — a couple need human/design review rather than unsupervised agent execution.

- **Remove unused Google Fonts** (`layout.tsx:3-8`): keep Jost, Cormorant Garamond, Marcellus; remove Inter, Playfair Display if truly unused. Grep the whole codebase for each family name first.
- **Migrate dark mode to Tailwind's `dark:` prefix** (`globals.css`, ~250 lines of `!important`): **flag as needing visual/design QA — not safe for unsupervised agent execution.** Only a human comparing before/after screenshots can catch subtle visual regressions here.
- **Extract the repeated inline arrow SVG** on the homepage (7 occurrences) into a shared component.
- **Implement or remove `showParticles`/`showOrbs`** on `SpatialPage` — this is a design decision, not a pure performance fix. Confirm intent first.
- **Cloudinary width transforms** (`w_600`/`w_1200`/`w_1920` matched to `sizes`) in addition to existing `f_auto,q_auto`.
- **Compress/convert local images to WebP/AVIF** (`admin-login.png` 286kB, `logo.png` 253kB, category images) via `next/image`.
- **Use `loading="eager"` instead of `priority`** for the logo on client-side navigations.
- **Dynamic-import `ProductImageGallery`** so PhotoSwipe's CSS only loads when the lightbox is used.
- **Confirm `recharts` is scoped to admin routes only** via bundle analysis.
- **Remove `outputFileTracingRoot`** from `next.config.js` unless there's a specific reason tied to a Docker deployment.
- **Add cache/redirect rules to `vercel.json`** beyond the existing cron job.
- **Dynamic-import or remove `DEMO_PRODUCTS`** once live data is confirmed stable everywhere.
- **Add `@next/bundle-analyzer`** so future bundle regressions are caught in review.

---

## Progress Tracker

| # | Fix | Phase | Status |
|---|-----|-------|--------|
| 1 | Remove `headers()` from root layout | 1 | Done |
| 2 | Narrow middleware matcher | 1 | Done |
| 3 | ISR/caching on homepage | 1 | Done |
| 4 | Cache-Control headers | 1 | Done |
| 5 | Remove hardcoded Supabase fallback | 1 | Skipped — needs manual Vercel env verification |
| 6 | Wire up Upstash Redis caching | 2 | Done |
| 7 | Server-side catalog fetching | 2 | Done |
| 8 | Consolidate AuthContext queries | 2 | Done |
| 9 | Full-text search | 2 | Done |
| 10 | Share product-detail fetch | 2 | Done |
| 11 | Slim cart localStorage | 2 | Done |
| 12 | Remove OneSignal | 3 | Done |
| 13 | Consolidate analytics to PostHog | 3 | Not started |
| 14 | Lazy-load Gia chat widget | 3 | Not started |
| 15 | Scope Three.js to specific pages | 3 | Not started |

Don't mark a row "Done" until its full "Must still work" checklist has passed — not just when the code change is made.
