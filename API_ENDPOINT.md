# API Endpoint System — Planning Document (Ruhvi)

## ⚠️ Critical Rule for the Coding Agent

**Do not touch, refactor, or modify any existing feature, function, route, or file that isn't directly part of this plan.** This is a purely additive system. Nothing currently working (auth, orders, wallet, checkout, EspoCRM, existing pages, existing middleware, etc.) should be changed, moved, or "cleaned up" as a side effect of this work. If something existing needs to be touched to make this work (e.g. adding one new middleware rule), it must be the smallest possible change, clearly called out, and reversible.

---

## 1. Goal

Build a system that lets third-party tools (starting with **n8n**, but designed for any future tool) talk to the Ruhvi backend over HTTP, so external workflows can trigger actions on the site (starting with creating blog posts).

This is **machine-to-machine** communication — no human logs in through a browser to use these endpoints. Authentication is therefore key-based, not session/cookie-based.

---

## 2. Core Architecture Decisions (already made)

1. **One endpoint per function**, not one giant generic endpoint.
   - Example: `/api/external/blog` for blog posts, `/api/external/orders` for orders, `/api/external/inventory` for inventory — each is its own route with its own logic.
   - Reason: easier to debug, easier to secure individually, each has different data needs.

2. **Scoped API keys**, modeled on how Sentry does it.
   - Each key is generated with a fixed, named set of permissions (**scopes**) at creation time.
   - Scopes are **immutable after creation** — if permissions need to change, the old key is revoked and a new key is generated with the new scopes.
   - A request is only allowed to perform an action if its key has the matching scope.

3. **Key management UI** goes into the existing admin panels — no new standalone admin tool needed.
   - Appears in **admin.ruhvi.in** (master panel).
   - Appears in **tech.ruhvi.in** (tech panel) as well.
   - Both should read/write the same underlying data — they are two UIs to the same key store, not two separate systems.

4. **First endpoint to actually build:** blog post creation (for n8n to publish posts). Everything else (inventory sync, support ticket sync, product sync, order sync) is future scope — **do not build these yet**, just make sure the architecture doesn't block them later.

---

## 3. Database: API Keys Table (Supabase)

A new table, separate from all existing tables — does not touch existing schema.

**Suggested table: `api_keys`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | auto-generated |
| `name` | text | human-readable label, e.g. "n8n - blog publishing" |
| `key_hash` | text | store a hash of the key (e.g. SHA-256), never the raw key |
| `key_prefix` | text | first few characters of the key shown in the UI for identification (like `sk_live_ab12...`) |
| `scopes` | text[] or jsonb | list of permission strings, e.g. `["blog:write"]` |
| `created_at` | timestamptz | |
| `created_by` | text/uuid | which admin user generated it |
| `revoked_at` | timestamptz, nullable | null = active, set = revoked/disabled |
| `last_used_at` | timestamptz, nullable | updated on each successful use, for visibility |

**Important:** The raw key is shown to the admin **only once**, at generation time, in the admin UI. After that, only the hash is stored and the raw value cannot be retrieved again — same behavior as Sentry, Stripe, GitHub tokens, etc.

---

## 4. Defining Scopes

Scopes should be named as `resource:action`, so they're easy to extend later without redesigning anything.

Starting scope needed right now:
- `blog:write` — allowed to create blog posts

Scopes to reserve conceptually for later (not built now, just don't design anything that conflicts with adding these later):
- `blog:read`
- `orders:read`, `orders:write`
- `inventory:read`, `inventory:write`
- `support:read`, `support:write`

---

## 5. Request Authentication Flow

1. External tool (e.g. n8n) sends a request to an endpoint, e.g. `POST /api/external/blog`.
2. The API key is sent in a request header, e.g.:
   ```
   Authorization: Bearer <api_key>
   ```
3. The server:
   - Hashes the incoming key the same way keys are hashed at creation.
   - Looks up `api_keys` by `key_hash`.
   - Checks `revoked_at IS NULL` (key is active).
   - Checks the required scope for this endpoint (e.g. `blog:write`) is present in `scopes`.
   - If all checks pass → proceed with the request.
   - If any check fails → return `401 Unauthorized` or `403 Forbidden`, and do not leak details about why (don't reveal whether the key exists but lacks scope vs. doesn't exist at all).
4. Update `last_used_at` on successful authentication (best-effort, shouldn't block the response).

---

## 6. Admin Panel UI Requirements

A new section/page in both **admin.ruhvi.in** and **tech.ruhvi.in**, e.g. "API Keys":

- **List view:** name, key prefix, scopes, created date, last used, status (active/revoked), with a revoke button.
- **Create flow:**
  - Admin enters a name/label.
  - Admin selects one or more scopes from a checklist (e.g. checkboxes for `blog:write`, and future ones as they're added).
  - On submit, generate the key server-side, show the **full raw key once** in a copyable box with a clear "you won't see this again" warning, then store only the hash.
- **Revoke flow:** sets `revoked_at`, key stops working immediately. No "edit scopes" option — this is intentional, matches the Sentry-style immutable-key behavior.

---

## 7. First Endpoint to Build: Blog Post Creation

- Route: `POST /api/external/blog` (exact path can be adjusted to fit existing routing conventions).
- Required scope: `blog:write`.
- Note: exact request fields (title, content, images, author, tags, etc.) are **not decided yet** — this will be scoped separately when we're ready to implement this specific endpoint. This document only covers the surrounding key/auth architecture.

---

## 8. Step-by-Step Implementation Order

1. Create the `api_keys` table in Supabase (as above). No changes to any existing table.
2. Build the server-side helper/middleware that: takes a request, extracts the `Authorization` header, hashes it, looks it up, checks scope. This helper should be reusable by every future endpoint, not rewritten each time.
3. Build the "API Keys" admin UI section in **admin.ruhvi.in** (list, create, revoke).
4. Mirror the same UI (or link to the same underlying logic) in **tech.ruhvi.in**.
5. Build the actual `/api/external/blog` endpoint using the reusable auth helper from step 2, requiring `blog:write` scope.
6. Test end-to-end with a real n8n workflow hitting the endpoint with a generated key.
7. Only after this works cleanly, revisit future endpoints (inventory, support, orders, product sync) one at a time, each reusing the same key/scope system from step 2.

---

## 9. Explicitly Out of Scope for Now

- Do not build inventory sync, support ticket sync, product sync, or order sync endpoints yet.
- Do not change any existing authentication (Firebase Auth, customer login flows, OTP panel) — this new key system is completely separate and only for external/third-party machine access.
- Do not modify any existing admin panel features beyond adding this new section.
