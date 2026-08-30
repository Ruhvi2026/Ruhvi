# PostHog Implementation Plan — Ruhvi Jewels

## Current State (read this first)

- PostHog project already exists: Project ID `256363`, region **EU Cloud** (`https://eu.posthog.com`).
- The SDK was originally set up by a previous coding agent run. The exact integration method (npm package vs raw HTML snippet) is **not confirmed** — Phase 0 below checks this before anything else changes.
- PostHog's own **Health** page currently shows:
  - 🔴 **Critical**: "No pageview events detected recently"
  - 🟡 **Warning**: "No authorized URLs configured"
- Session replay recordings and retention data did exist as of a few days ago, so the SDK has worked at some point. The pageview issue is likely a known Next.js App Router gotcha (see Phase 1), not a total outage — Phase 0/1 will confirm which it is.
- **Sentry** already handles error tracking. Do not enable PostHog's Error Tracking product — it would duplicate Sentry for no benefit.
- **Hotjar** has an account created but was never actually installed in the site's code (confirmed — no "hotjar" string found in page source). **Decision: do not install Hotjar.** Use PostHog's own Heatmaps feature instead — it's already visible in the PostHog sidebar and needs no separate SDK.
- **Payment gateway**: PhonePe Payment Gateway integration is in progress and may still change. Revenue tracking in this plan is deliberately **gateway-agnostic** — it captures a business event from your own order-confirmation code, not from the gateway itself, so it keeps working even if the gateway changes later.

## Order of operations

1. Shreya: Part A, step 1 (live test) + step 2 (authorized URLs) — ~10 minutes
2. Agent: Phase 0 (audit) — report findings back to Shreya before continuing
3. Agent: Phase 1 (fix pageview capture)
4. Shreya: repeat the live test to confirm the fix worked
5. Agent: Phase 2 → Phase 3 → Phase 4
6. Phase 5 and Phase 6 — whenever you're ready later, not urgent now

---

## Part A — Manual steps on posthog.com (Shreya does these, no code involved)

### 1. Live test (do this first, right now)
- Open the Ruhvi Jewels website in a new browser tab, browse 3-4 different pages.
- In PostHog, go to **Activity** and watch for new `$pageview` events appearing in real time.
- If only **one** pageview shows up (your first page load) and nothing for the other pages → confirms the Next.js App Router gotcha in Phase 1.
- If **no** pageviews show up at all → something more basic is broken, and Phase 0's audit will find why.

### 2. Set Authorized URLs
- Go to **Settings → Project → General** (or search "Authorized URLs" in the settings search box).
- Add your production domain. Based on your existing subdomains (`support.ruhvi.in`, `crm.support.ruhvi.in`), this is likely `ruhvi.in` and/or `www.ruhvi.in` — confirm your exact live domain and add whichever ones are actually live.
- If you also want heatmaps/toolbar to work on Vercel preview deployments, add that pattern too, if your plan supports it — otherwise skip.

### 3. Heatmaps
- Should start populating automatically once Authorized URLs are set, using the SDK that's already installed. No separate install needed. Check back after a day of real traffic.

### 4. Revenue data source — skip for now
- Once PhonePe (or whichever gateway you land on) is finalized, you can optionally connect it directly under **Revenue Analytics** settings. Not required — the event-based tracking in Part C already covers the essentials.

### 5. Marketing Analytics ad connections (Google Ads / Meta Ads) — skip for now
- Only relevant once you're running paid campaigns.

---

## Part B — Environment variables

Add to `.env.local` locally **and** to your Vercel project's environment variables:

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_uSmXss7Gj7WyrgD5vWJMzD7KdV75XE6UFAX4W2rR4aTq
NEXT_PUBLIC_POSTHOG_HOST=https://eu.posthog.com
```

⚠️ Double-check the key above against **Settings → Project → General → Project token** in PostHog — copy it fresh from there if there's any mismatch. This is a write-only key and is safe to expose in client-side code (PostHog's own docs confirm this explicitly).

---

## Part C — Instructions for your coding agent

> Read all phases before starting anything. Do them **in order**. Do not skip Phase 0.

### Phase 0 — Audit (required first step — do not change any code yet)

1. Search the repository for existing PostHog usage:
   ```bash
   grep -ril "posthog" --exclude-dir=node_modules .
   ```
2. Check `package.json` for a `posthog-js` dependency and note its version.
3. Check whether a file named `instrumentation-client.ts` (or `.js`) exists at the project root.
4. Check whether a custom `PostHogProvider` component exists anywhere (search for "PostHogProvider").
5. Check whether the current `posthog.init(...)` call sets `capture_pageview` to anything, or uses a `defaults` option.
6. **Report back what you found before proceeding** — specifically, which integration method is used, and whether pageview-on-navigation is handled at all today.

### Phase 1 — Fix pageview tracking (likely cause of the Health page error)

**Background:** Next.js App Router navigates between pages client-side (no full browser reload). A basic `posthog.init()` only captures one `$pageview` event, on the very first load — every later in-app navigation is invisible to PostHog unless the app explicitly re-fires `$pageview` on route changes. This is a well-documented PostHog + Next.js App Router gotcha and matches exactly what the Health page is reporting.

**Target setup** (current official PostHog recommendation, for Next.js 15.3+):

Create `instrumentation-client.ts` at the project root (same level as `next.config.js`):

```typescript
import posthog from 'posthog-js'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  defaults: '2026-01-30',
})
```

If the project's Next.js version is **older than 15.3**, use this fallback pattern instead (skip `instrumentation-client.ts`; add to the root layout):

```tsx
// app/providers.tsx
'use client'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    capture_pageview: false, // sent manually below to avoid double-counting
  })
}

function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  useEffect(() => {
    if (!pathname) return
    let url = window.origin + pathname
    if (searchParams?.toString()) url += `?${searchParams.toString()}`
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </PHProvider>
  )
}
```

Then wrap `{children}` in `app/layout.tsx` with `<Providers>`.

**Do not use both patterns at once** — pick ONE based on the actual Next.js version, or pageviews will be double-counted.

After deploying, repeat the Part A live test — a new `$pageview` should now appear for every page visited, not just the first.

### Phase 2 — Identify logged-in users

When a customer logs in successfully (wherever that logic currently lives — likely a Supabase auth callback or client-side login handler):

```typescript
posthog.identify(supabaseUser.id, {
  email: supabaseUser.email,
})
```

Use the **Supabase user UUID** as the identify ID, not raw email — consistent with the `espo_user_id` / `espo_contact_id` mapping pattern already used elsewhere in this project.

On logout:

```typescript
posthog.reset()
```

This stops the next person on the same device from being merged into the previous customer's profile.

### Phase 3 — Session replay privacy check

PostHog already masks all `<input>` fields by default — no action needed there, unless `maskAllInputs: false` is found anywhere in the current init config (remove it if so).

What is **not** masked by default is plain text/divs showing sensitive info outside of inputs. Add the `ph-no-capture` class to:
- Any element displaying a full shipping address
- Any element displaying a phone number
- Order confirmation screens showing payment details (last 4 digits, UPI ID, etc.)

```html
<div className="ph-no-capture">
  {customer.address}, {customer.phone}
</div>
```

### Phase 4 — E-commerce funnel events

Add `posthog.capture()` calls at these points. Naming convention: **snake_case, past tense for completed actions** — use these exact names, don't invent alternatives:

| Event name | Fire when | Key properties |
|---|---|---|
| `product_viewed` | Product detail page loads | `product_id`, `name`, `category`, `price` |
| `product_added_to_cart` | "Add to cart" clicked | `product_id`, `name`, `price`, `quantity` |
| `product_added_to_wishlist` | Wishlist icon clicked | `product_id`, `name` |
| `checkout_started` | Checkout page loads with items in cart | `cart_value`, `item_count` |
| `purchase_completed` | Order confirmed as paid (regardless of gateway) | `revenue`, `currency`, `order_id`, `product`, `coupon` |
| `signup_completed` | New account created | `method` (`"email"`, `"google"`, `"phone"`) |

Most important one — example:

```typescript
posthog.capture('purchase_completed', {
  revenue: orderTotal,
  currency: 'INR',
  order_id: order.id,
  product: order.items.map(i => i.name).join(', '),
  coupon: order.couponCode ?? undefined,
})
```

Fire this ideally **server-side** — in the API route / server action that marks the order as paid in Supabase — so it fires exactly once per real order, regardless of which payment gateway processed it underneath.

### Phase 5 — Later, not urgent yet (Feature Flags & Surveys)

Skip for now. When you want to A/B test something (e.g. two checkout button designs) or run an in-app survey (e.g. post-purchase feedback), come back — flags and surveys are created in the PostHog UI first, then referenced from code with `posthog.getFeatureFlag('flag-key')` or the Surveys SDK. Revisit this once you have a concrete flag or survey in mind.

### Phase 6 — Later, not urgent yet (Pulling PostHog data into your Marketing/Ops/Support dashboards)

Do this only after Phases 0–4 are live and you've had at least a couple of weeks of real traffic.

When ready: create a **Personal API Key** (different from the project token in Part B!) under PostHog → your avatar → **Personal API Keys**. This key can *read* data and must **never** be exposed client-side — no `NEXT_PUBLIC_` prefix, store it as a plain server-only env var (e.g. `POSTHOG_PERSONAL_API_KEY`), and only call it from a Next.js API route or server action, never from browser code.

From that server-side route, query PostHog's HogQL query API with this key in an `Authorization: Bearer` header, and return the result to your dashboard's frontend. Have the agent check PostHog's current query API docs for the exact endpoint/request format at implementation time — this is a low-priority phase and details are more likely to have shifted by the time you get here.

---

## A note on Revenue Analytics specifically

PostHog's Revenue Analytics product is currently in beta and is explicitly positioned as working best for subscription-style businesses. For one-off purchases like jewelry orders, PostHog's own docs note it "may feel less useful, slower, or provide less insight than expected." It's still worth capturing `purchase_completed` above — it powers ordinary funnels, conversion rates, and per-product performance just fine — just don't expect the dedicated Revenue Analytics tab to be the most useful view for this business model. Plain Insights/Trends built on `purchase_completed` will likely serve marketing better day to day.
