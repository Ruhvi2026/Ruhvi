# Admin Panel Issues Report

Deep analysis of the Ruhvi admin panel (`src/app/admin/**` and `src/app/api/admin/**`), cross-checked against the schema in `supabase/migrations/*.sql`. **45 issues found: 10 critical, 15 major, 20 minor.**

---

## Critical

### 1. Unauthenticated WhatsApp broadcast endpoint
`src/app/api/admin/whatsapp/campaign/route.ts:4-11`
The admin authorization check is commented out. Any anonymous caller can POST `templateName` + `phoneNumbers` and send WhatsApp marketing messages at the store's expense, with no rate limiting or phone validation.

### 2. All `/api/admin/ai/*` routes never verify the admin role
`src/app/api/admin/ai/{settings,credentials,models,logs,diagnostics,test-connection,discover-models,simulate,generate,playground,audit}/route.ts`
Every route's `verifyAdmin()` only checks that the session JWT has a `sub` claim — it never checks `users.role`. Any logged-in customer can access all AI admin endpoints (read logs, wipe diagnostics, run generation on the store's AI budget).

### 3. AI settings endpoint allows arbitrary settings writes (incl. API keys)
`src/app/api/admin/ai/settings/route.ts:349-362`
POST upserts arbitrary client-supplied `{ key, value }` pairs into the `settings` table with no whitelist, including `ai_providers` which stores raw provider API keys.

### 4. AI credentials endpoint allows replacing stored API keys
`src/app/api/admin/ai/credentials/route.ts:26-37,301-348`
PATCH can overwrite `encrypted_key` of any credential; DELETE removes them; POST creates new ones. Combined with issue #2, any logged-in customer can hijack AI credentials.

### 5. SSRF via client-supplied base URL
`src/app/api/admin/ai/test-connection/route.ts:207`, `src/app/api/admin/ai/discover-models/route.ts:187-205`
Routes fetch `provider.baseUrl` / `baseUrl` and `customHeaders` taken directly from the request body, letting an authenticated attacker issue server-side requests to internal network endpoints (metadata services, internal dashboards).

### 6. Server actions can reset any user's password without authorization
`src/app/admin/actions/auth.ts:26-60`
`setAuthPassword` and `sendPasswordResetLink` run with the service-role key and have no authorization check of their own; they rely solely on middleware gating `/admin`.

### 7. `/api/admin/export` is unusable (broken auth + wrong columns)
`src/app/api/admin/export/route.ts:26-49`
Auth reads `sb-access-token` / `supabase-auth-token` cookies, which this Firebase-based app never sets → always 401. Even if fixed, queries use wrong columns (`title`/`stock`/`total_amount` vs `name`/`stock_quantity`/`total`).

### 8. `ai/simulate` queries a non-existent table
`src/app/api/admin/ai/simulate/route.ts:80-84`
Queries `.from('ai_providers')` — no such table exists (providers live in `settings.key='ai_providers'`). Every request hits PGRST205 and the endpoint always reports "No enabled providers found".

### 9. Refunds page queries a non-existent table
`src/app/admin/refunds/page.tsx:45-51`
Queries `return_requests`; the schema table is `returns` (`0001_phase0_foundation.sql:191`). Errors are swallowed, so the page always shows an empty table. Statuses/columns also mismatch (`created_at`/`updated_at`/`admin_notes` vs `requested_at`/`resolved_at`/`refund_method`).

### 10. Coupons page CRUD is completely broken against the schema
`src/app/admin/coupons/page.tsx:10-19,65-76,92,198-232`
Reads/writes non-existent columns `type`/`value`/`is_active`/`uses_count`/`max_discount`/`max_uses`/`valid_until`. Schema uses `discount_type`/`discount_value`/`active`/`usage_limit_total`/`usage_limit_per_user`/`expiry_date` (`0001:144-157`). Also no INSERT/UPDATE/DELETE RLS policy exists on `coupons` (`0005:73-74` only has SELECT), so even correct columns would be blocked from the browser client.

---

## Major

### 11. Users page is RLS-blocked
`src/app/admin/users/page.tsx:70-73,90-93,115-122`
Queries `users` with the browser client; RLS only allows `auth.uid() = id` (`0001:241-242`), so an admin sees only their own row, and role/balance updates silently affect 0 rows. Should use RPCs `admin_get_all_users` / `admin_update_user_role` / `admin_update_user_balance` (`0019_admin_users_rpc.sql`).

### 12. Wallet & Coins page is RLS-blocked
`src/app/admin/wallet/page.tsx:30-33,46-50`
Same problem as #11 — only the admin's own row is visible/editable.

### 13. Orders page uses invalid `processing` status
`src/app/admin/orders/page.tsx:23,39-73,313-334`
`processing` is not in the `order_status` enum (`0001:5` = pending/confirmed/shipped/delivered/cancelled/returned). Selecting it fails the DB update. `confirmed`/`returned` orders have no tab/badge/option and render as "Pending".

### 14. Orders detail "Generate Shipping Label" is a mock
`src/app/admin/orders/[id]/page.tsx:57-93`
Calls `/api/admin/orders/status` instead of the real `/api/admin/shiprocket/create-order`, then fabricates `awb_code`/`courier_name`/`shiprocket_*` in local state only — nothing persists. Print Label / Manifest buttons (246-251) have no handlers.

### 15. Products list is a static demo shell
`src/app/admin/products/page.tsx:10,13-35`
Seeded from `DEMO_PRODUCTS` (`src/lib/products.ts:19`); no DB fetch. `toggleStatus`/`toggleStock` mutate local state only, and `toggleStock` wrongly keys off the `status` field instead of `stock_quantity`.

### 16. All four report pages are static demo shells
`sales:7-15`, `inventory:7-13`, `coupons-referrals:7-11`, `abandoned-carts:7-38` under `src/app/admin/reports/`
Hardcoded arrays presented as real data; Export / Send Reminder buttons only call `alert()`.

### 17. Bulk management tool is fake
`src/app/admin/tools/bulk-management/page.tsx:11-43`
CSV export emits hardcoded rows; CSV import simulates success via `setTimeout`. Never touches the DB.

### 18. SEO suite is demo-driven
`src/app/admin/seo/page.tsx:18,36-64,370-377`
Audits `DEMO_PRODUCTS`, not real products. "Save Meta Settings" only toggles a success banner; Image Alt Text inputs do nothing; Edit links point to demo product ids.

### 19. Settings page mock saves (8 of 11 sections)
`src/app/admin/settings/page.tsx:251-255`
Only Banner and Homepage persist; store/shipping/loyalty/returns/integrations/security/payment/notifications show a fake "Saved!". Store identity fields (126-130) are hardcoded and never loaded/saved.

### 20. Operations dashboard selects a non-existent column
`src/app/admin/dashboard/OperationsDashboard.tsx:12-14`
Selects `stock` on `products`; the schema column is `stock_quantity` (`0001:62`). Query errors → all three KPIs are 0.

### 21. Mock Shiprocket silently ships real orders
`src/lib/shiprocket.ts:26-29,66-78,108-118`
Returns `'mock_token_123'` and mock order/shipment/AWB when credentials are missing. `shiprocket/create-order/route.ts:116-197` then marks the real order `status: 'shipped'`, stores `AWB-MOCK-*`, logs events, and emails a fake tracking link.

### 22. Order timeline events are never persisted
`src/lib/order-events.ts:79-99`
`logOrderEvent` uses the anon `createClient()`; with Firebase + custom-JWT there is no Supabase session, so RLS blocks the role query and it always returns `Forbidden`. `shiprocket/create-order/route.ts:146-171` calls it and ignores the failure — LABEL_CREATED/SHIPPED events are silently dropped.

### 23. Marketing RBAC is broken for every role except SUPER_ADMIN
`promotions/route.ts`, `promotions/[id]/route.ts`, `coupons/route.ts`, `campaigns/route.ts`
Require `promotions.*` / `marketing.*` permissions that no migration seeds (only `coupons.*`/`campaigns.*` exist in `0040`), and `hasPermission` (`src/lib/auth/rbac.ts:38-43`) returns `false` whenever `role_id` is NULL — locking out plain `admin`/`manager`/`staff`.

### 24. `push_campaigns.sent_by` FK mismatch silently drops history
`src/app/api/admin/notifications/route.ts:92`
`sent_by` references `auth.users(id)` (`0022:10`), but this app's Firebase-synced users don't exist in `auth.users` → FK violation, logged and ignored. Campaign history is never recorded.

### 25. Support-analytics route is admin-only
`src/app/api/admin/support-analytics/route.ts:44-47`
Role check is `user?.role === 'admin'` only — denies `super_admin`, `manager`, and `staff` who should have access per the role model.

---

## Minor

### 26. Wrong address columns in order status emails
`src/app/api/admin/orders/status/route.ts:77-83`
Email template reads `address_line1`/`postal_code`/`country`; the `addresses` table has `line1`/`pincode` and no `country` column (`0001:27-40`). All three fields are always empty.

### 27. `out_for_delivery` not a valid order status
`src/app/api/admin/orders/status/route.ts:100`
Handled for email dispatch but not in the `order_status` enum → the DB update throws and the email branch is unreachable.

### 28. Order status update lacks validation
`src/app/api/admin/orders/status/route.ts:42-47,5,88-94`
No existence check on `orderId` (updating a missing order "succeeds"); `sendShippingUpdateEmail` imported but never used.

### 29. Hardcoded demo values in Shiprocket payload
`src/app/api/admin/shiprocket/create-order/route.ts:87,103-112`
Fixed HSN `71131930`, dimensions 15×15×10 / 0.5kg, `billing_email: 'customer@example.com'`, `billing_phone: '9999999999'`, item name `Product ${product_id}`.

### 30. Support-analytics fallback misses new statuses
`src/app/api/admin/support-analytics/route.ts:105-116`
Fallback grouping omits `waiting_for_team` and `reopened` added in `0043`; those tickets are uncounted.

### 31. PUT endpoints update the whole body without a field whitelist
`coupons/[id]/route.ts:28-36`, `promotions/[id]/route.ts:28-36`
A client can attempt to overwrite `id`, `created_at`, etc.

### 32. AI logs crash on invalid date param
`src/app/api/admin/ai/logs/route.ts:50,68`
`new Date(from).toISOString()` throws on an invalid query value → 500. No input validation.

### 33. AI provider keys stored in plaintext
`src/lib/ai/credentials.ts:167-170`
The "encryption" of `encrypted_key` is a stub; keys are stored at rest in plaintext.

### 34. Notification broadcast has no rate limiting
`src/app/api/admin/notifications/route.ts`
No rate limit on OneSignal broadcasts; `audience` default `'Subscribed Users'` diverges from the DB default `'All Users'` (`0022:8`).

### 35. WhatsApp campaign loop has no queue/rate limit/validation
`src/app/api/admin/whatsapp/campaign/route.ts:23-32`
Synchronous loop over all numbers; no queue, no rate limit, no phone format validation.

### 36. Leftover debug page
`src/app/admin/test/page.tsx`
Dumps `{ user, cookies }` as JSON, with hardcoded Supabase URL/anon-key fallbacks. Should be removed from production.

### 37. Payments page reads a non-existent column
`src/app/admin/payments/page.tsx:35,44`
Reads `transaction_id` on `orders`; schema uses `phonepe_*` fields (`0013`). `gateway_ref` is always null.

### 38. `razorpay` orders mislabeled "PhonePe"
`src/app/admin/orders/page.tsx:302-309`
Payment filter only covers phonepe/cod; `razorpay` (still in enum `0001:6`) renders as "PhonePe".

### 39. Audit-logs dead fallback + missing RLS function
`src/app/admin/audit-logs/page.tsx:86-108`
Fallback synthesizing logs from orders is dead code (`audit_logs` exists in `0020`). Several policies reference `public.is_admin_or_staff()`, which no repo migration defines — if absent in the live DB, those queries fail.

### 40. Hardcoded dummy analytics charts
`src/app/admin/dashboard/DashboardCharts.tsx:30-35,217`
Hardcoded traffic/conversion/bounce data and a static 33% conversion ring, presented as real.

### 41. Hardcoded dashboard KPIs
`src/app/admin/dashboard/page.tsx:311,375,383`
"Open Refunds" = 0 and "Low Stock Alerts" = "—" ignore the real data the Operations tab computes.

### 42. Dashboard status badge map omits enum values
`src/app/admin/dashboard/page.tsx:235-241`
`confirmed` and `returned` orders have no badge mapping.

### 43. Product edit loses data
`src/app/admin/products/[id]/edit/page.tsx:25,34,99-150`
`tags` and `collectionSlug` states are never persisted; save deletes all `product_images` then re-inserts (destructive if the insert fails); a missing id silently leaves an empty form.

### 44. Marketing dashboard settings link ignored
`src/app/admin/dashboard/MarketingDashboard.tsx:230`
Links to `/admin/settings?tab=marketing`, but `settings/page.tsx` never reads the `tab` param — opens on Store.

### 45. Miscellaneous UI hygiene
- `src/app/admin/users/page.tsx:198-210` — renders its own full-screen shell inside the admin layout.
- `src/app/admin/settings/page.tsx:896-903` — misleading security copy about admin access.
- `src/app/admin/orders/page.tsx:171-174,359-363` — Export CSV button has no handler; no pagination.
- `src/app/admin/dashboard/SupportDashboard.tsx:29` — resolution rate defaults to `100.0` when there are no tickets.
- `src/app/admin/coupons/page.tsx:117-120` — "total discount" KPI counts only fixed-type coupons.

---

## Notes on auth (non-blocking)
Middleware (`src/middleware.ts:197-321`) does enforce RBAC for `/admin` UI routes (session cookie + role + portal allowlist), so non-admins don't see the admin UI. The gaps above are in the API routes (`/api/admin/*` is explicitly common-allowed in middleware) and server actions, which must do their own authorization — most don't.

## What works
Admin layout/navigation; dashboard overview (real data via service role); products new + edit (real writes, with caveat #43); categories & collections CRUD; notification sending; ai-settings UI wiring; orders list loading; audit-logs read.
