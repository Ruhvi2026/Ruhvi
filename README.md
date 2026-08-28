# Ruhvi — Fine Jewellery E-Commerce

Headless e-commerce storefront for Ruhvi Fine Jewellery. Server-side rendered storefront with multi-portal internal tools, custom JWT authentication, and an AI-first customer support concierge.

## Tech Stack

- **Next.js 15** (App Router, React 19, TypeScript)
- **Supabase** (PostgreSQL, storage, RLS) — with a **custom JWT** flow minted by the server, not Supabase Auth
- **Firebase Auth** (sole auth provider: OTP / Google / Email)
- **Cloudinary** (product image hosting & optimization)
- **Resend** (transactional email) · **Brevo** (marketing email & MCP AI tools)
- **PhonePe** (payments) · **Shiprocket** (logistics) · **Cloudflare Turnstile** (bot protection)
- **PostHog** (product analytics) · **Sentry** (error tracking) · **OneSignal** (push)
- **Google Gemini** AI with multi-credential failover (see `src/lib/ai/`)

## Local Setup

```bash
npm install

# Copy the local environment file (contains dev credentials)
# Ask a teammate or check your secret manager; .env.local is git-ignored.
# vercel.env documents every variable name used by the project.
cp .env.local .env.local  # if absent, recreate from vercel.env + your secret manager

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Scripts:** `npm run dev` · `npm run build` · `npm start` · `npm run lint` / `npm run lint:fix`. Linting and formatting run automatically on commit via Husky + lint-staged.

## Subdomain Map

The same app serves multiple portals, switched on the `Host` header (see `src/app/layout.tsx`). Local dev mirrors them as `*.localhost`.

| Subdomain | Purpose |
|-----------|---------|
| `ruhvi.in` | Public storefront (catalog, checkout, account) |
| `admin.ruhvi.in` | Admin & dashboard |
| `operations.ruhvi.in` | Operations (products, inventory) |
| `support.ruhvi.in` | Customer support console |
| `crm.support.ruhvi.in` | Self-hosted EspoCRM agent console (VPS, not this app) |
| `auth.ruhvi.in` | Authentication flows |
| `marketing.ruhvi.in` | Marketing campaigns & ad tracking |
| `orders.ruhvi.in` | Orders portal / logistics |

> **Support CRM:** Agents manage support tickets in EspoCRM at
> `crm.support.ruhvi.in` (deployed via `deploy/esporcrm/`). Supabase remains the
> source of truth; see [ESPOCRM_INTEGRATION.md](ESPOCRM_INTEGRATION.md).

## Environment Variables

Every environment variable is documented in `vercel.env` (name + purpose), with values in `.env.local` (dev) and the Vercel project dashboard (production). See [PROJECT_INTEGRATIONS_AUDIT.md](PROJECT_INTEGRATIONS_AUDIT.md) for the full integration matrix, env-variable ownership, and the source of truth for what each service does.

## Integrations

The authoritative integration reference lives in [PROJECT_INTEGRATIONS_AUDIT.md](PROJECT_INTEGRATIONS_AUDIT.md) — service-by-service status, file locations, and env vars. Read it before adding, changing, or removing an integration.
