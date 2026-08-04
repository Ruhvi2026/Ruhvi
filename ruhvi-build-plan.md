# Ruhvi.in — Full Build Plan (v1)

**Stack:** Next.js (React + TypeScript) · Supabase (Postgres + Auth + Storage) · Vercel (hosting) · Razorpay (payments) · Capacitor (Android, later)
**Builder:** Solo, using Google Antigravity as the AI coding agent
**Approach:** 8 phases. Each phase ends in something you can actually click through and test with friends before moving on.

---

## How to use this doc with Antigravity

Work one phase at a time. For each phase:
1. Open a **new Antigravity Project** scoped to that part of the app (keeps the agent's context clean).
2. Paste the "Antigravity prompt" for that phase.
3. Let it plan → build → test with its browser subagent.
4. Test it yourself + with friends before starting the next phase.
5. Come back and adjust later prompts if earlier decisions changed (e.g., schema field names).

Don't paste all 8 phases into one giant prompt — large, vague scope is exactly where agentic tools drift or produce half-working features.

---

## Phase 0 — Foundation
*Nothing user-facing yet. Everything else depends on this being right.*

### What to build
- Supabase project + Postgres schema (below)
- Next.js app skeleton, deployed to Vercel from day one (deploy empty, deploy often)
- Auth: Sign up, Login, Forget password (Supabase Auth)
- Role-based access: Admin, Manager, Staff roles on the users table
- SKU generation logic (a function, not just a manual field)

### Core DB schema (starting point — Antigravity will refine this)

```
users
 - id (uuid, pk, from Supabase auth)
 - full_name, email, phone
 - role (enum: customer, staff, manager, admin)
 - wallet_balance (numeric, default 0)
 - reward_coins (integer, default 0)
 - created_at

addresses
 - id, user_id (fk)
 - label, full_name, phone, line1, line2, city, state, pincode, is_default

categories
 - id, name, slug, parent_id (nullable, for subcategories)

products
 - id, sku (unique), name, slug, description
 - category_id (fk)
 - price, mrp, gst_rate
 - stock_quantity, low_stock_threshold
 - status (enum: active, hidden, out_of_stock)
 - is_new_arrival, is_best_seller (booleans)
 - created_at, updated_at

product_images
 - id, product_id (fk), url, type (enum: model, still, zoom, 360), sort_order

wishlists
 - id, user_id (fk), product_id (fk), created_at

carts / cart_items
 - cart: id, user_id
 - cart_items: id, cart_id, product_id, quantity, price_at_add

orders
 - id, user_id, order_number
 - status (enum: pending, confirmed, shipped, delivered, cancelled, returned)
 - subtotal, shipping_charge, cod_charge, coupon_discount, wallet_used, coins_redeemed, gst_amount, total
 - payment_method (enum: razorpay, cod), payment_status
 - gift_wrap, gift_message
 - shipping_address_id (fk), created_at

order_items
 - id, order_id, product_id, sku, quantity, price_at_purchase

coupons
 - id, code, discount_type, discount_value, min_order_value
 - usage_limit_total, usage_limit_per_user, applicable_to (all/category/product)
 - expiry_date, cod_charge_waiver (bool), active

reward_coin_ledger
 - id, user_id, order_id (nullable), amount, type (earned/redeemed/expired/cashback), expiry_date, created_at

wallet_ledger
 - id, user_id, order_id (nullable), amount, type (credit/debit/cashback), created_at

referrals
 - id, referrer_user_id, referred_user_id, status, coins_awarded, created_at

returns
 - id, order_id, reason, status, refund_method, requested_at, resolved_at
```

### Antigravity prompt — Phase 0

```
Build the foundation for a jewellery e-commerce app called Ruhvi.

Stack: Next.js (App Router, TypeScript), Supabase (Postgres + Auth + Storage),
deployed to Vercel.

Tasks:
1. Set up a Next.js project with TypeScript and Tailwind CSS.
2. Connect Supabase. Create the database schema for: users (with a role enum:
   customer, staff, manager, admin), addresses, categories, products,
   product_images, wishlists, carts, cart_items, orders, order_items, coupons,
   reward_coin_ledger, wallet_ledger, referrals, returns. [Paste the schema
   above, or attach it as a file.]
3. Implement Supabase Auth: sign up, login, forget/reset password pages.
4. Add role-based access control — middleware that restricts admin/manager/
   staff routes based on the user's role.
5. Write a SKU generation function: format is a category prefix + zero-padded
   sequential number (e.g. RNG-000123 for rings). Make it a reusable server
   function, not something typed manually per product.
6. Deploy to Vercel and confirm the empty app loads with working sign up/login.

Use your browser subagent to test: sign up a test user, log in, log out,
trigger forget password, and confirm a non-admin cannot reach an admin route.
```

---

## Phase 1 — Product Catalog
*Testable outcome: you can browse a real catalog, even with placeholder products.*

### What to build
- Admin panel: add / edit / delete product, hide product, mark out of stock
- Home page, All Products page, category pages (Rings, Necklaces, Earrings, Bracelets, Bangles, Pendants, Chains, Anklets, Nose Pins, Mangalsutra, Bridal, Men's, Kids'), New Arrivals, Best Sellers
- Filters
- Product detail page: 6+ images (2 model, 3+ still with zoom, 1 for 360° — placeholder the 360° viewer for now, it's the hardest one), product sharing option, recently viewed, product suggestions, "Notify me when back in stock"
- Search with auto-suggestions, search by SKU (skip voice search for v1 — low value, high complexity)
- Size Guide, About Us, Contact Us, Policy pages (static content is fine for now)

### Antigravity prompt — Phase 1

```
Building on the existing Ruhvi schema and auth, build the product catalog.

1. Admin panel (restricted to admin/manager/staff roles):
   - Add/edit/delete products, with fields matching the products table
   - Upload multiple images per product, tagged by type (model/still/zoom/360)
   - Toggle hidden / out_of_stock status
   - Auto-generate SKU on creation using the existing function

2. Customer-facing pages:
   - Home page with featured sections (New Arrivals, Best Sellers)
   - All Products page with category navigation: Rings, Necklaces, Earrings,
     Bracelets, Bangles, Pendants, Chains, Anklets, Nose Pins, Mangalsutra,
     Bridal Jewellery, Men's Jewellery, Kids' Jewellery
   - Filters by category, price range, and stock status
   - Product detail page showing all images (grouped by type), a zoom
     interaction on still images, a share button (copy link + native share
     sheet), a "recently viewed" row (store in local state/cookies for now),
     and simple related-product suggestions (same category)
   - If a product is out_of_stock, show a "Notify me when back in stock"
     button that stores the request (email + product_id) in a new
     `stock_notifications` table
   - Search bar with auto-suggestions as you type, and support searching
     directly by SKU
   - Static pages: Size Guide, About Us, Contact Us, Privacy Policy, Terms &
     Conditions, Shipping Policy, Return & Refund Policy, Cancellation Policy,
     Warranty Policy (placeholder content, structured so I can edit the text
     later)

Skip the 360° image viewer for now — just store the image and show a
"360° view coming soon" placeholder where it would go.

Test with the browser subagent: add a product as admin, confirm it appears
correctly on the home page, category page, and search, and that hiding a
product removes it from customer-facing views.
```

---

## Phase 2 — Purchase Flow
*Testable outcome: you and friends can place a real (test-mode) order start to finish.*

### What to build
- Cart, Wishlist (+ sharing)
- Checkout page, with gift wrap + gift message option
- Razorpay integration (test mode)
- Order confirmation via email
- Invoice generation with GST breakup
- Order history, cancel order (only before shipped), reorder, download invoice

### Antigravity prompt — Phase 2

```
Building on the existing Ruhvi catalog and auth, build the purchase flow.

1. Cart: add/remove/update quantity, persists per logged-in user (use the
   carts/cart_items tables).
2. Wishlist: add/remove products, with a "share my wishlist" link (public
   read-only view of a user's wishlist by a shareable token/slug).
3. Checkout page:
   - Select/add a shipping address
   - Gift wrap toggle and optional gift message field
   - Order summary showing subtotal, shipping charge (₹49, waived above
     ₹500 order value), COD charge (₹49, only if COD selected), and total
   - Payment method: Razorpay (test mode) or Cash on Delivery
4. Integrate Razorpay in test mode: create order, handle payment success/
   failure callbacks, update order status accordingly.
5. On successful order: send an order confirmation email (use Supabase +
   Resend or similar free-tier email service) and generate a PDF invoice
   with GST breakup (use the gst_rate stored per product).
6. Order history page: list past orders, view details, download invoice PDF,
   cancel order (only allowed while status is "pending" or "confirmed", not
   after "shipped"), and a "reorder" button that repopulates the cart with
   the same items.

Test with the browser subagent end-to-end: add products to cart, check out
with a test Razorpay payment, confirm the order appears in order history,
confirm the invoice PDF has correct GST math, and confirm cancel is blocked
once you manually set an order's status to "shipped" in the database.
```

---

## Phase 3 — Post-Purchase & Account
*Testable outcome: full customer lifecycle works, not just the happy path.*

- My Account, saved addresses, manage devices/sessions, delete account
- Return request page + return policy logic (7-day window, tag-condition dependent)
- Tracking page (manual status updates for now; courier API comes in Phase 5)
- Notifications center (in-app list of updates)

*(Prompt available on request once you're ready for this phase — schema and earlier decisions may shift slightly after Phases 1-2, so it's worth re-checking before locking this prompt in.)*

---

## Phase 4 — Money Features
*Build carefully. Test heavily. This is where bugs cost you real money.*

- Wallet (balance, 5% cashback when paid via wallet, non-withdrawable)
- Reward coins (10% of product value, credited after return window closes, 10 coins = ₹1, expire after 100 days, excluded from shipping/COD/tax/redeemed-coin amounts)
- Coupons (one per order, stackable with coins and wallet, usage limits, expiry, min order ₹250 for coin redemption)
- Referral program (500 coins after first order's return period expires, min order ₹100)

**Before building this phase:** write out every combination of payment method × coupon × coins × wallet as a table and check the math by hand. This is the single most bug-prone part of the whole spec — an agent will happily generate plausible-looking logic that's subtly wrong (e.g., calculating cashback on the pre-discount total instead of post-discount).

---

## Phase 5 — Courier & Real Shipping
- Shiprocket/Delhivery (or similar) integration
- Shipping label generation, real tracking numbers, real-time tracking sync

*Can't be meaningfully tested until you have real inventory to ship — sequence this after you're close to actually launching.*

---

## Phase 6 — Marketing & Growth
- Offers/Sale page, Gift Guide, Festival/Wedding/Anniversary/Birthday/Corporate collection pages
- Blog, Testimonials + UGC videos with verified-purchase badge
- Push notifications (email/WhatsApp/SMS), Newsletter
- Coupon/discount campaign management in admin
- Social media integration

## Phase 7 — Admin Analytics & Ops
- Sales dashboard, revenue reports, best-sellers, customer insights
- Inventory reports, abandoned cart tracking
- Bulk import/export (Excel/CSV), bulk price update
- Order status timeline, staff activity logs
- All items under "Reports" (daily/monthly sales, pending orders, return/refund requests, low-stock, top customers, coupon performance, referral stats)

*Build once you have real order data — analytics against zero real orders just means testing against fake data, which tells you little.*

## Phase 8 — Security Hardening & Android App
- 2FA for admin/manager/staff, audit logs, rate limiting, input validation, backup strategy
- Capacitor Android wrap
- Chatbot

*Do the security hardening pass before going live with real customer payments — not before that.*

---

## Cost checkpoints (recap)

| When | Cost |
|---|---|
| Phases 0–4 (building + testing with friends) | ~₹0 (Supabase/Vercel free tiers, Razorpay test mode) |
| Business registration + GST | Already in progress |
| Going live: Razorpay transaction fees | ~2%+ per order |
| Going live: SMS/WhatsApp notifications | Small per-message cost |
| Phase 5: courier integration | Per-shipment cost, only once shipping real orders |
| Product photography | Your own spend — budget for this, don't skimp |

---

## Notes for future phases
- Re-verify field names/schema against what Antigravity actually built in Phase 0 before pasting later prompts — agents sometimes rename fields for their own reasons.
- Keep a running `SCHEMA.md` or similar in your repo that reflects the *actual* current database, not just this plan, so future prompts stay accurate.
