# Ruhvi — Fix Implementation Plan

**Created:** 2026-08-26
**Baseline health:** TypeScript ✅ clean · `next build` ✅ exit 0 · git ✅ clean tree, up to date with `origin/main`
**Scope:** Non-breaking hygiene + tooling fixes. Nothing here changes runtime behavior for customers. Each item is independently shippable and independently revertible.

Priority key: **P1** = correctness/deploy safety · **P2** = hygiene/DX · **P3** = optional/nice-to-have.

---

## Summary table

| # | Item | Priority | Files touched | Risk | Effort |
|---|------|----------|---------------|------|--------|
| 1 | Pin workspace root (kill build warning) | P1 | `next.config.js` | Very low | 2 min |
| 2 | Set up ESLint (modern flat config) | P1 | `eslint.config.mjs`, `package.json` | Low | 15 min |
| 3 | Env var cleanup (+ dead-code removal) | P1 | `.env.local`, `vercel.env`, 3 source files, Vercel dashboard | Low–med | 20 min |
| 4 | Strip `console.log` in production | P2 | `next.config.js` | Very low | 5 min |
| 5 | Resolve the one real TODO (FCM token) | P2 | `src/components/FcmInit.tsx` (+ maybe 1 API route, 1 migration) | Med | 1–2 h |
| 6 | Add a `README.md` | P2 | `README.md` | None | 20 min |
| 7 | Dependency refresh | P3 | `package.json`, lockfile | Low–med | 30 min |
| 8 | Grow test coverage | P3 | `package.json`, `src/**/__tests__` | Low | ongoing |

**Recommended first pass:** items **1–4 + 6** (≈1 hour, all low-risk). Items 5, 7, 8 are follow-ups.

---

## 1. Pin the workspace root — P1

**Problem.** The only warning emitted by `next build`:

> ⚠ Next.js inferred your workspace root, but it may not be correct. We detected multiple lockfiles and selected the directory of `C:\Users\INDIA\package-lock.json` as the root directory.

**Root cause.** A stray `package.json` + `package-lock.json` sit in the home folder (`C:\Users\INDIA\`). Next.js walks up looking for a lockfile and picks the **home directory** as the file-tracing root instead of the project. When file tracing roots at the wrong directory, Vercel serverless functions can bundle the wrong file set (missing files at runtime, or bloated bundles).

**Fix (in-project, definitive).** Pin `outputFileTracingRoot` to the project directory. Edit [`next.config.js`](next.config.js):

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the file-tracing root to THIS project so Next stops picking up the
  // stray lockfile in C:\Users\INDIA\. Fixes the "inferred workspace root" warning.
  outputFileTracingRoot: __dirname,

  images: {
    remotePatterns: [
      // ...unchanged...
    ],
  },
};
```

> `outputFileTracingRoot` is a top-level option in Next 15 (the warning text confirms the name). `__dirname` is available because this is a CommonJS config file. The Sentry `withSentryConfig(module.exports, …)` wrapper preserves it.

**Optional companion cleanup (outside the repo).** If `C:\Users\INDIA\package.json` and `C:\Users\INDIA\package-lock.json` were created by accident (e.g. an `npm install` run from the home folder), deleting them also silences the warning. Verify they aren't intentional first:

```bash
cat /c/Users/INDIA/package.json
```

Prefer the `next.config.js` fix regardless — it's version-controlled and travels with the repo, so it protects CI/Vercel too.

**Verify:** `npm run build` → the workspace-root warning is gone.
**Rollback:** remove the one line.

---

## 2. Set up ESLint — P1

**Problem.** No ESLint config exists (no `.eslintrc*`, no `eslint.config.*`, nothing in `package.json`). `next lint` currently drops into an interactive setup wizard, which means **linting is not running anywhere** — not locally, not in the Husky pre-commit hook, not in CI.

**Decision.** Do **not** use the legacy `next lint` wizard — it's deprecated and removed in Next 16 (you're on 15.5, one major away). Use the modern flat-config ESLint CLI with `eslint-config-next`.

**Steps.**

1. Install dev deps:

   ```bash
   npm i -D eslint eslint-config-next
   ```

2. Create `eslint.config.mjs` at the project root:

   ```js
   import next from 'eslint-config-next';

   export default [
     ...next(),
     {
       ignores: ['.next/**', 'node_modules/**', 'public/**', 'supabase/**'],
     },
     {
       rules: {
         // Start lenient so the first run isn't a wall of errors; tighten later.
         '@typescript-eslint/no-explicit-any': 'warn',
         'react-hooks/exhaustive-deps': 'warn',
       },
     },
   ];
   ```

3. Update the `lint` script in [`package.json`](package.json) (replace the deprecated `next lint`):

   ```json
   "lint": "eslint .",
   "lint:fix": "eslint . --fix"
   ```

4. Wire it into the existing Husky/lint-staged setup — add ESLint to the `*.{js,jsx,ts,tsx}` entry in `lint-staged` so staged files get linted on commit:

   ```json
   "lint-staged": {
     "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
     "*.{json,css,md}": ["prettier --write"]
   }
   ```

**Verify:** `npm run lint` runs to completion and reports findings (expect warnings, not a crash). Triage real errors; leave `warn`-level items for a follow-up sweep.
**Risk.** Low. First run may surface many warnings — that's data, not breakage. Keep noisy rules at `warn` initially.
**Rollback:** delete `eslint.config.mjs`, revert `package.json`.

---

## 3. Environment variable cleanup — P1

**Goal.** Retire the 4 dead env vars flagged in `PROJECT_INTEGRATIONS_AUDIT.md`. ⚠️ **Two of them are still referenced in code**, so this is *not* a pure env-file edit — the code references must be removed in the same change or the cleanup is incomplete/misleading.

### 3a. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — genuinely unused (0 code refs)

Safe to delete outright.
- Remove line 8 from [`.env.local`](.env.local) and line 8 from [`vercel.env`](vercel.env).
- Remove from the **Vercel project dashboard** (Settings → Environment Variables) — this is the one that actually affects production; the local files are just references.

### 3b. `VITE_CLOUDINARY_CLOUD_NAME` / `VITE_CLOUDINARY_UPLOAD_PRESET` — dead fallback branch

Referenced in [`src/services/cloudinaryService.ts:10-17`](src/services/cloudinaryService.ts) as a Vite-era fallback:

```js
const CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  process.env.VITE_CLOUDINARY_CLOUD_NAME ||   // ← dead: Vite vars aren't exposed by Next
  'tfelmupe';
```

Next.js never exposes `VITE_`-prefixed vars to the browser bundle, so this branch is always `undefined` at runtime — the real safety net is the hardcoded default. **Remove the env vars *and* the dead branch together:**

```js
const CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'tfelmupe';
const UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ruhvi_products';
```

Then delete lines 43–44 from `.env.local` and `vercel.env`.

> Note: the hardcoded defaults `'tfelmupe'` / `'ruhvi_products'` are your effective config today (client bundles need the value at build time). Confirm `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` and `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` are set in Vercel so you're not silently relying on the hardcoded fallback in production.

### 3c. `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` — unused (Firebase Storage not used), but referenced in init

Referenced in 2 files as part of the Firebase init object:
- [`src/lib/firebase.ts:10`](src/lib/firebase.ts) — `storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,`
- [`src/app/api/firebase-config/route.ts:8`](src/app/api/firebase-config/route.ts) — same line.

Firebase `initializeApp` tolerates `storageBucket: undefined` — it only matters if you use Firebase Storage, which the audit confirms you don't. **Safe to remove the env var + both config lines together.**

⚠️ **Caveat / gate:** if you ever enable Firebase Storage, you'll need this back. Only proceed if Firebase Storage is confirmed unused (audit says yes). If in doubt, leave 3c for last or skip it.

**Verify (all of 3):** `npx tsc --noEmit` (clean) → `npm run build` (exit 0) → smoke-test an image upload in the Operations product form and confirm Firebase auth/OTP still initializes.
**Rollback:** restore the env lines and the two code snippets. Keep a copy of removed values before deleting from the Vercel dashboard.

---

## 4. Strip `console.log` in production — P2

**Problem.** 38 `console.log` calls across `src` ship to the client/server bundles. Noise + minor info-leak risk.

**Fix (zero-touch, no need to edit 38 sites).** Add the Next.js compiler option to [`next.config.js`](next.config.js) inside `nextConfig`:

```js
const nextConfig = {
  outputFileTracingRoot: __dirname,
  compiler: {
    // Strip console.* in production builds but keep error/warn for observability.
    removeConsole:
      process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  images: { /* ... */ },
};
```

**Verify:** `npm run build`, then grep a built chunk to confirm `console.log` is gone while `console.error` remains. Dev logging is unaffected.
**Risk.** Very low. Keeps `error`/`warn` so Sentry breadcrumbs and diagnostics survive.

---

## 5. Resolve the one real TODO — FCM token persistence — P2

**Only actionable TODO in the codebase** — [`src/components/FcmInit.tsx:22`](src/components/FcmInit.tsx):

```
// TODO: Send token to your backend (e.g., Supabase table 'user_push_tokens')
```

(The other `XXXX` matches are input-placeholder strings / comment examples, not real TODOs.)

**Impact.** FCM device tokens are obtained on the client but never persisted, so targeted transactional push (order/shipping notifications) can't reach a specific user's device.

**Plan (larger — treat as its own task):**
1. Migration: create `public.user_push_tokens` (`user_id`, `token`, `platform`, `created_at`, `updated_at`; unique on `token`; RLS: user can upsert/read own rows) → `supabase/migrations/00XX_user_push_tokens.sql`.
2. API route `POST /api/push/register` — verify session (reuse `src/lib/auth/verify-session.ts`), upsert `{ user_id, token }`.
3. In `FcmInit.tsx`, `POST` the token to that route once retrieved; de-dupe so it only fires on token change.

**Verify:** log in on a device, confirm a row appears; send a test push and confirm delivery.
**Note.** Cross-cutting (DB + API + client). Do **not** bundle with items 1–4; ship separately.

---

## 6. Add a `README.md` — P2

No README exists. Add a concise one covering: stack (Next 15 / React 19 / Supabase / Firebase auth / Cloudinary), local setup (`npm i`, copy env, `npm run dev`), the subdomain map (storefront / operations / support / admin), where env vars are documented, and a pointer to `PROJECT_INTEGRATIONS_AUDIT.md` as the integration source of truth.

**Risk.** None (docs only).

---

## 7. Dependency refresh — P3 (optional)

**Safe in-range bumps** (`npm update` — stays within `^` ranges): `@sentry/nextjs`, `@supabase/supabase-js`, `firebase`, `firebase-admin`, `react-hook-form`, `resend`, `posthog-*`, `postcss`, `next` (15.5.22 → 15.5.24).

**Major bumps — do NOT auto-update; each needs its own branch + testing:**
- `next` 15 → **16** (breaking; also removes `next lint` — do item 2 first).
- `tailwindcss` 3 → **4** (new engine/config format).
- `@supabase/ssr` 0.5 → **0.12** (auth/cookie API changes — high-risk for your custom-JWT setup).
- `lucide-react`, `@types/node` 22 → 26, `typescript` 5 → 7.

**Recommendation:** run `npm update` for in-range only now; schedule majors individually later.
**Verify:** `npx tsc --noEmit` + `npm run build` after any bump.

---

## 8. Grow test coverage — P3 (optional, ongoing)

Currently 1 test file ([`src/lib/ai/__tests__/routing.test.ts`](src/lib/ai/__tests__/routing.test.ts)) for 305 source files, and **no `test` script** in `package.json` (Jest types are installed but unwired).

1. Add a runner (project already has `@types/jest`) + script:
   ```json
   "test": "jest",
   "test:watch": "jest --watch"
   ```
2. Prioritize the highest-risk pure logic first:
   - JWT lifecycle — `src/lib/auth/verify-session.ts`, `server.ts` (there's already a `scripts/test-jwt.mjs` to fold in).
   - Order-number generation & totals — `src/lib/orders/create-order.ts`.
   - AI credential failover — `src/lib/ai/credentials.ts`, `error-classifier.ts`.

**Risk.** Low (additive).

---

## Suggested execution order

1. **Branch:** `git checkout -b chore/health-fixes`
2. Item **1** (workspace root) + **4** (console strip) — same `next.config.js` edit → `npm run build`.
3. Item **2** (ESLint) → `npm run lint`, triage.
4. Item **3** (env cleanup) → `tsc` + `build` + smoke-test uploads/auth.
5. Item **6** (README).
6. Commit, PR, verify Vercel preview deploy is clean.
7. Items **5, 7, 8** as separate follow-up PRs.

**Global verification gate before merge:**
```bash
npx tsc --noEmit && npm run build && npm run lint
```
All three must pass. Confirm the Vercel preview deployment builds without the workspace-root warning.
