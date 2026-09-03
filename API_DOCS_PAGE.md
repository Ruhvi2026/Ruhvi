# Task: Add "API Documentation" Tab to API Keys Page

## Goal
Add a new tab/section called **"API Documentation"** inside the existing page at `admin.ruhvi.in/admin/api-keys`. This is a **read-only, static documentation page** (no new backend logic needed) that explains to any third-party developer how to use a Ruhvi API key to call the external API.

This page is what we hand to any third party (agency, freelancer, partner's dev, their AI coding agent) when we give them an API key — so they can self-serve and write their own integration code without needing us to explain anything manually.

---

## Where to add it

On `admin.ruhvi.in/admin/api-keys`, add a tab navigation at the top (or a toggle) with two tabs:
- **"Manage Keys"** — the existing UI (Generate New Key, key list table) — unchanged
- **"API Documentation"** — new tab, described below

Do not change any existing functionality on the "Manage Keys" tab. This is purely additive.

---

## Content for the "API Documentation" tab

Render this as clean, readable static content (headings, code blocks with syntax highlighting if the UI framework already supports it, e.g. using a `<pre><code>` block or existing code-block component in the codebase). Use a copy-to-clipboard button on every code block if that component already exists elsewhere in the admin panel; otherwise plain code blocks are fine.

### Section 1: Overview
Short paragraph:
> "The Ruhvi External API lets authorized third-party applications read data from Ruhvi. Every request requires an API key, generated from the 'Manage Keys' tab. Each key has fixed, per-resource permissions (Read Only / Write Only / Read & Write / Admin) that cannot be changed after creation — to change permissions, generate a new key and revoke the old one."

### Section 2: Base URL
```
https://ruhvi.vercel.app/api/external
```
Note below it: "Every resource is accessed by appending its name to this base URL, e.g. `/orders`, `/products`."

### Section 3: Authentication
Explain the header format:
```
Authorization: Bearer YOUR_API_KEY
```
Note: "Replace `YOUR_API_KEY` with the key generated for you. Keep this key secret — anyone with it can access the data scoped to it."

### Section 4: Available Resources
A table listing every resource path, matching exactly the resource list already used in the "Generate New Key" permission dropdown. Pull the canonical list from that existing dropdown component so this table never goes out of sync — do not hardcode a separate copy of the list. The resources are:

| Resource | Endpoint Path |
|---|---|
| Blog | `/blog` |
| Orders | `/orders` |
| Inventory | `/inventory` |
| Support Ticket | `/support-ticket` |
| Payment | `/payment` |
| Products | `/products` |
| Category | `/category` |
| Customer | `/customer` |
| Wallet | `/wallet` |
| Rewards Coin | `/rewards-coin` |
| Coupons | `/coupons` |
| Offers | `/offers` |
| Push Notifications | `/push-notifications` |
| WhatsApp | `/whatsapp` |
| Report & Analytics | `/report-analytics` |
| User Management | `/user-management` |
| Team Management | `/team-management` |
| Role Management | `/role-management` |
| Website Management | `/website-management` |
| Marketing Campaign | `/marketing-campaign` |

**IMPORTANT:** Verify the actual URL slugs against the real implemented routes before publishing this table — the slugs above are best guesses based on resource names. Use the exact slugs already defined in the external API route handlers. Do not guess or invent new slugs.

### Section 5: Permission Levels
Reuse the exact same legend already shown on the "Manage Keys" tab (Read Only = GET access only, Write Only = POST/PUT access without read, Read & Write = full read and write access, Admin = full CRUD including delete & admin actions). Do not duplicate this text manually — pull it from the same source/component used on the Manage Keys tab so the two stay in sync if wording changes later.

### Section 6: Example Request
Show ONE universal example using `curl` (works as a reference for any language/stack):

```bash
curl -X GET "https://ruhvi.vercel.app/api/external/orders" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Below it, add this note in plain text:
> "This is a generic example. If you're integrating with Node.js, PHP, Python, or any other stack, convert this curl command into your language's HTTP client (e.g. `fetch` in Node.js, `curl_init` in PHP, `requests` in Python). The URL, method, and header stay the same regardless of language."

### Section 7: Response Format
State plainly (confirm actual format from existing implemented endpoints before writing this — do not guess):
- All responses are JSON
- Success response shape: `{ ... }` (fill in actual shape from a real tested response, e.g. from the `/orders` GET call already tested in Postman)
- Error response shape: `{ error, code, message }` (confirm this matches what's actually implemented; if not implemented yet, note it as planned rather than stating it as current behavior)

### Section 8: Rate Limits
Leave a placeholder section:
> "Rate limit: [TO BE FILLED — per-key rate limit will be added and documented here]."

Do NOT invent a number. This will be filled in once rate limiting is implemented separately.

### Section 9: Support
> "For questions about API access or to request a new key with different permissions, contact [ruhvi_main@gmail.com or whatever the actual support contact is]."

---

## Technical notes for implementation

1. This is a **static content page** — no new API endpoints, no new database tables needed.
2. Match the existing visual style/theme of the admin panel (same dark theme, fonts, spacing already used on `admin.ruhvi.in`).
3. Pull the resource list and permission-level legend from the same source already used in the "Generate New Key" modal — do not hardcode a second, separate copy that could drift out of sync.
4. Do not touch, modify, or break any existing functionality on the "Manage Keys" tab, the key generation flow, or any existing API routes.
5. If a code-block / syntax-highlighting component already exists elsewhere in the codebase (e.g. used in another dev-facing page), reuse it here for consistency. Otherwise, a simple styled `<pre><code>` block is sufficient.
6. Before finalizing Section 4 (resource slugs) and Section 7 (response format), check the actual implemented external API route files to confirm exact URL paths and response shapes — do not publish guessed values as if they are confirmed facts.
