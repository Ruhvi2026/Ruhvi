# RUHVI — Critical User and Staff Regression Journeys

**Document Version:** 1.0  
**Phase:** Track H — Phase 39  
**Status:** Canonical Reference & Operational Contract  
**Environment:** Next.js Storefront, Customer Portal, Admin Operations  

---

## 1. Executive Summary & Purpose

This document establishes the canonical registry of critical regression journeys for Project Ruhvi. As part of **Track H — Automated QA Guardian**, these journeys serve as the authoritative standard for all continuous verification, Playwright end-to-end tests, synthetic health probes, and release readiness gates.

Every journey defines:
1. **Preconditions**: Exact state requirements (session, database records, roles, feature flags).
2. **Trajectory**: Step-by-step navigation and mutation sequences.
3. **Invariants**: Unbreakable business rules, data integrity constraints, and security boundaries.
4. **Expected Behaviors**: Target DOM elements, API payloads, and status codes.
5. **Failure Thresholds**: Explicit limits for timeouts, HTTP error codes, and functional regressions.
6. **Execution Target**: Automated Playwright E2E, synthetic background probe, or human verification.

---

## 2. Journey Index

| Journey ID | Title | Actor | Category | Target Routes | Automation Type |
|---|---|---|---|---|---|
| `J-GUEST-01` | Catalog Browsing & Filter/Search | Guest | Storefront | `/`, `/products`, `/categories/*` | Synthetic Probe & E2E |
| `J-GUEST-02` | PDP & Variant Selection | Guest | Storefront | `/products/[slug]` | Synthetic Probe & E2E |
| `J-CUST-01` | Cart Mutations & Persistence | Customer/Guest | Commerce | `/cart`, `/api/cart/*` | E2E |
| `J-CUST-02` | Checkout, Coupon & Payment | Customer | Commerce | `/checkout`, `/api/checkout/*` | E2E (Staging/Mock) |
| `J-CUST-03` | Order Confirmation & Tracking | Customer | Post-Purchase | `/order-success/*`, `/orders/*` | E2E & Synthetic Probe |
| `J-CUST-04` | Return & Cancellation Lifecycle | Customer | Service | `/orders/[id]/return`, `/portal-orders` | E2E |
| `J-CUST-05` | GIA Shopping Concierge AI | Customer/Guest | AI Commerce | `/api/support/chat`, Floating GIA widget | Synthetic Probe |
| `J-STAFF-01` | Admin Authentication & RBAC | Staff / Admin | Security | `/admin/login`, `/admin/*` | E2E Security Probe |
| `J-STAFF-02` | Executive Dashboard & Radar | Admin | Intelligence | `/admin/dashboard`, `/admin/business-radar` | E2E & Synthetic Probe |
| `J-STAFF-03` | Order Fulfillment State Progression | Staff / Ops | Operations | `/admin/orders`, `/admin/orders/[id]` | E2E |
| `J-STAFF-04` | Return Inspection & Refund Authorization | Manager / Admin | Finance | `/admin/orders/[id]`, `/api/orders/refund` | E2E |
| `J-STAFF-05` | Action Center Proposal Approval | Admin | Governance | `/admin/action-center`, `/api/action-center/*` | E2E |
| `J-STAFF-06` | Customer 360 & Support Triage | Staff / Admin | Support | `/admin/customer-360`, `/admin/support` | E2E |
| `J-STAFF-07` | Inventory Restock & Safety Buffer | Ops / Manager | Supply Chain | `/admin/inventory`, `/api/intelligence/*` | E2E |

---

## 3. Customer & Storefront Journeys

### J-GUEST-01: Catalog Browsing & Filter/Search
- **Actor:** Guest (Unauthenticated)
- **Preconditions:** Active network connection, production or staging CDN active, products seeded in catalog.
- **Trajectory:**
  1. Navigate to `/`. Verify Hero banner, navigation links, and category carousels render.
  2. Click "Shop" or a category card (e.g., `/products?category=necklaces`).
  3. Apply filters: Price range (₹10,000–₹50,000), Sort by "Price: Low to High".
  4. Perform text search for "Gold" in top search bar.
- **Invariants:**
  - Inactive (`status !== 'active'`) products must NEVER appear in search or category listings.
  - Out-of-stock items must display an explicit "Out of Stock" badge or be ranked below available inventory.
  - Pricing must render accurately in Indian Rupees (`₹`) with valid Indian numbering commas.
- **Expected API/DOM Behaviors:**
  - Route returns `200 OK`.
  - DOM contains `[data-testid="product-card"]` or `.product-card`.
  - Filter state reflects in URL query params without page reload (client-side routing).
- **Failure Thresholds:**
  - Response time > 2,500ms for SSR route.
  - Zero products displayed when valid matching items exist in database.
  - Any 4xx or 5xx client/server errors.

---

### J-GUEST-02: Product Detail Page (PDP) & Variant Selection
- **Actor:** Guest / Customer
- **Preconditions:** Active product with multiple images and inventory stock exists.
- **Trajectory:**
  1. Navigate to `/products/[slug]`.
  2. Inspect high-resolution photo gallery and thumbnail switching.
  3. Switch product variants (metal purity, diamond size, ring size).
  4. Verify real-time stock indicator updates.
  5. Check hallmark certifications, BIS Hallmark authenticity badge, and GST inclusion note.
- **Invariants:**
  - Price and SKU must update synchronously upon variant selection.
  - If variant stock is 0, "Add to Cart" button must switch to disabled / "Out of Stock" state.
  - Secret cost prices or supplier metadata must NEVER leak in DOM or JSON payloads.
- **Expected API/DOM Behaviors:**
  - `GET /products/[slug]` returns `200 OK`.
  - DOM contains product title `<h1>`, price `[data-testid="pdp-price"]`, and `[data-testid="add-to-cart-button"]`.
- **Failure Thresholds:**
  - Missing product images (broken image 404s).
  - Unresponsive variant selector.
  - Page load time > 2,000ms.

---

### J-CUST-01: Cart Mutations & Persistence
- **Actor:** Customer / Guest
- **Preconditions:** Product has available sellable stock (`stockQuantity >= 2`).
- **Trajectory:**
  1. On PDP, click "Add to Cart". Verify floating drawer / badge updates.
  2. Navigate to `/cart`.
  3. Increase quantity from 1 to 2. Verify subtotal updates.
  4. Decrease quantity or click "Remove".
  5. Close browser tab, re-open `/cart`, verify cart persistence (LocalStorage / DB cart).
- **Invariants:**
  - Cart item quantity cannot exceed available stock (`stockQuantity`).
  - Total must mathematically equal `sum(item.quantity * item.price)`.
  - Cart must gracefully reconcile if an item is purchased by another user while in cart.
- **Expected API/DOM Behaviors:**
  - Cart drawer opens or updates counter.
  - `/api/cart` or client state returns status `200`.
- **Failure Thresholds:**
  - Quantity allowed to be set to `<= 0` or `NaN`.
  - Total discrepancy > ₹0.00.
  - Cart loss on page refresh.

---

### J-CUST-02: Checkout, Coupon & Payment Execution
- **Actor:** Logged-in Customer / Guest with verified phone
- **Preconditions:** Items in cart, test user credentials, payment gateway sandbox enabled (or COD).
- **Trajectory:**
  1. From `/cart`, click "Proceed to Checkout" -> `/checkout`.
  2. Enter or select delivery address (PIN code, City, State, Phone).
  3. Apply coupon code (e.g. `WELCOME10`). Verify discount calculation.
  4. Toggle Wallet Balance / Reward Coins redemption (if customer has balance).
  5. Select Payment Method: Prepaid (PhonePe / Paytm) or Cash on Delivery (COD).
  6. Submit order.
- **Invariants:**
  - Cannot place order with empty address or invalid 6-digit Indian PIN code.
  - Coupon discount cannot exceed order subtotal.
  - Wallet deduction cannot exceed total or customer wallet balance.
  - Orders cannot be finalized with unverified payment states.
- **Expected API/DOM Behaviors:**
  - `POST /api/checkout` or payment initialization returns `200 OK` with transaction token / redirect URL.
  - Redirects to `/order-success/[orderId]`.
- **Failure Thresholds:**
  - Payment double-charge or race condition allowing duplicate order creation.
  - Checkout submit button remaining disabled indefinitely without validation error display.
  - Total charge mismatch between UI and payment gateway intent.

---

### J-CUST-03: Order Confirmation & Real-Time Tracking
- **Actor:** Customer
- **Preconditions:** Valid order created with `order_number`.
- **Trajectory:**
  1. Land on `/order-success/[orderId]`. Verify Order ID, delivery address, and invoice summary.
  2. Navigate to Customer Portal -> `/orders` -> `/orders/[id]`.
  3. Click "Download Invoice" (PDF generation).
  4. Inspect shipment tracking timeline (Ordered -> Confirmed -> Shipped -> Out for Delivery -> Delivered).
- **Invariants:**
  - Users can ONLY view their own orders (`auth.uid() === order.user_id`).
  - Invoices must reflect final price paid, GST breakdown, and legal company details.
  - Sensitive payment tokens or raw credit card data must NEVER appear.
- **Expected API/DOM Behaviors:**
  - `GET /orders/[id]` returns `200 OK` for authorized customer, `403/404` for unauthorized users.
  - DOM contains order timeline progress tracker.
- **Failure Thresholds:**
  - Invoice generation failure (500 Internal Server Error).
  - Unauthenticated access allowed to another customer's order.

---

### J-CUST-04: Customer Return & Cancellation Lifecycle
- **Actor:** Customer
- **Preconditions:** Delivered order within return window (e.g. 7 days) or processing order eligible for cancellation.
- **Trajectory:**
  1. Navigate to `/orders/[id]/return`.
  2. Select items to return, reason category (size mismatch, damaged, not as described), and upload evidence photo.
  3. Submit return request.
  4. Verify order state updates to `return_requested` and support ticket is logged.
- **Invariants:**
  - Cannot request return outside statutory return window.
  - Cannot return already returned items.
  - Cancelled order inventory must be safely returned to sellable stock.
- **Expected API/DOM Behaviors:**
  - `POST /api/orders/[id]/return` returns `200 OK`.
  - UI displays return reference tracking number.
- **Failure Thresholds:**
  - Return allowed without valid reason or item selection.
  - Stock count double-incremented upon cancellation.

---

### J-CUST-05: GIA (Golden Concierge) Conversational AI Interaction
- **Actor:** Guest / Customer
- **Preconditions:** AI concierge route `/api/support/chat` accessible.
- **Trajectory:**
  1. Click floating GIA chat bubble on storefront.
  2. Submit query: "Show me lightweight gold earrings under ₹25,000 for daily wear."
  3. Inspect response: polite tone, product recommendations with images/prices, and add-to-cart link.
  4. Ask follow-up in conversational English or Hinglish.
- **Invariants:**
  - GIA must NEVER invent non-existent products or promise unapproved discounts.
  - Out-of-stock items must not be enthusiastically recommended without availability caveat.
  - Prohibits sensitive profiling or personal data collection without explicit consent.
- **Expected API/DOM Behaviors:**
  - Streaming response or JSON response within 3,000ms.
  - Emits clickable product card recommendations.
- **Failure Thresholds:**
  - AI hallucination creating fake order status or unauthorized coupon code.
  - Unhandled 500 error on chat endpoint.

---

## 4. Staff & Operations Journeys

### J-STAFF-01: Admin Authentication & RBAC Route Guarding
- **Actor:** Unauthenticated Visitor vs Staff vs Super Admin
- **Preconditions:** Firebase Auth / Custom JWT authentication enabled.
- **Trajectory:**
  1. Unauthenticated visitor attempts to navigate to `/admin/dashboard` -> redirected to `/admin/login`.
  2. Staff member logs in -> grants access to `/admin/orders` and `/admin/support`.
  3. Staff member attempts to access `/admin/action-center` or execute high-impact financial mutations -> blocked with `403 Forbidden`.
  4. Super Admin logs in -> full access granted across `/admin/*`.
- **Invariants:**
  - Zero leakage of admin DOM components before server-side authentication verification.
  - Passwords and private API keys are never transmitted in URL or logged.
- **Expected API/DOM Behaviors:**
  - `401 Unauthorized` or redirect for unauthenticated requests.
  - `403 Forbidden` for role mismatch.
- **Failure Thresholds:**
  - Privilege escalation allowing staff role to access super-admin endpoints.
  - Session hijacking or unexpired token bypass.

---

### J-STAFF-02: Executive Dashboard & Business Radar Metric Inspection
- **Actor:** Executive / Super Admin
- **Preconditions:** Authoritative order and anomaly ledgers populated.
- **Trajectory:**
  1. Navigate to `/admin/dashboard`.
  2. Verify top-level KPIs: Gross Sales, Net Revenue, Orders, AOV, Cancellation Rate.
  3. Navigate to `/admin/business-radar`.
  4. Inspect active anomalies (payment drop-offs, inventory stock-outs, conversion drops).
  5. Filter by severity (`CRITICAL`, `WARNING`, `INFO`).
- **Invariants:**
  - Metrics must reconcile to authoritative Supabase orders ledger (no invented figures).
  - Anomaly status transitions (`detected` -> `acknowledged` -> `investigating` -> `resolved`) must be audit-logged.
- **Expected API/DOM Behaviors:**
  - `GET /api/business-radar` returns `200 OK` with canonical metrics and anomaly array.
  - UI displays live data freshness timestamp.
- **Failure Thresholds:**
  - NaN or null displayed in financial KPI cards.
  - Page load timeout > 3,000ms.

---

### J-STAFF-03: Order Fulfillment State Progression
- **Actor:** Operations Staff
- **Preconditions:** Confirmed order awaiting shipment.
- **Trajectory:**
  1. Navigate to `/admin/orders/[id]`.
  2. Generate shipping label / assign AWB courier.
  3. Transition status from `confirmed` to `processing` -> `shipped`.
  4. Input tracking URL and courier name.
  5. Verify automated notification dispatch to customer.
- **Invariants:**
  - Order cannot skip logical progression (e.g. cannot transition directly from `pending` to `delivered`).
  - State changes are recorded in immutable `order_status_history` audit trail.
- **Expected API/DOM Behaviors:**
  - `PATCH /api/admin/orders/[id]` returns `200 OK`.
  - DOM updates status badge color and text.
- **Failure Thresholds:**
  - Dispatched shipment without valid tracking or fulfillment record.
  - Corrupted order items or altered line totals.

---

### J-STAFF-04: Return Inspection & Refund Authorization
- **Actor:** Manager / Admin
- **Preconditions:** Order with status `return_requested` and received physical item.
- **Trajectory:**
  1. Navigate to `/admin/orders/[id]`.
  2. Inspect return reason, customer photos, and warehouse QA inspection checkbox.
  3. Click "Approve Return" -> prompt for refund type (Original Payment Gateway or Store Wallet).
  4. Authorize refund.
  5. Verify inventory restoration flag (restock to sellable or mark as damaged sample).
- **Invariants:**
  - Refund amount cannot exceed original amount paid for the returned items.
  - Financial mutations require explicit manager/admin role.
  - Duplicate refund requests are blocked idempotently.
- **Expected API/DOM Behaviors:**
  - `POST /api/orders/refund` returns `200 OK`.
  - Order state transitions to `refunded` or `partially_refunded`.
- **Failure Thresholds:**
  - Double-refund processed on payment gateway.
  - Unauthorized staff executing refund without approval.

---

### J-STAFF-05: Action Center Proposal Approval & Execution
- **Actor:** Super Admin
- **Preconditions:** Pending proposal in Action Center (e.g. `update_inventory_safety_buffer`).
- **Trajectory:**
  1. Navigate to `/admin/action-center`.
  2. View pending proposal card: action type, target entity, parameters, dry-run simulation diff.
  3. Click "Approve Proposal" -> enter required approval payload confirmation.
  4. Click "Execute Approved Action".
  5. Verify live database mutation, readback verification, and transition to `completed`.
- **Invariants:**
  - Non-allowlisted actions cannot execute.
  - Tampered proposal payloads (hash mismatch) are rejected.
  - Actions execute with strict server-side timeouts and readback verification.
- **Expected API/DOM Behaviors:**
  - `POST /api/action-center/approve` returns `200 OK`.
  - `POST /api/action-center/execute` returns `200 OK` with execution audit ID.
- **Failure Thresholds:**
  - Action executed without approval token or by insufficient role.
  - Proposal state stuck in `executing` indefinitely without timeout cleanup.

---

### J-STAFF-06: Customer 360 Timeline Inspection & Support Triage
- **Actor:** Staff / Customer Support
- **Preconditions:** Customer record exists with orders, wishlist, and support tickets.
- **Trajectory:**
  1. Navigate to `/admin/customer-360`.
  2. Search customer by UUID or email.
  3. Inspect chronological activity stream (Orders, Wishlist, Cart, Support).
  4. Filter by category pills (`Orders`, `Support`).
  5. Inspect support ticket details.
- **Invariants:**
  - Staff role views must have PII masked (`+919830••••11`, `a•••@example.com`, `Alice R.`).
  - Street address lines must be stripped (only City/State/PIN).
  - Commercial spend totals must be hidden from staff and visible only to managers/admins.
- **Expected API/DOM Behaviors:**
  - `GET /api/customer-360/[id]` returns masked profile for staff, unmasked for admin.
  - Category filters update activity stream synchronously.
- **Failure Thresholds:**
  - PII leakage in staff network response.
  - Unauthorized customer lookup permitted to guest users.

---

### J-STAFF-07: Inventory Restock & Safety Buffer Workflow
- **Actor:** Operations / Store Manager
- **Preconditions:** Inventory catalog seeded with stock counts and threshold levels.
- **Trajectory:**
  1. Navigate to `/admin/inventory` or inventory intelligence view.
  2. Review restock recommendations generated from Phase 38 engine.
  3. Filter by urgency: `CRITICAL` (stocked out) vs `HIGH` (safety buffer breached).
  4. Inspect suggested restock quantity, MOQ adjustments, and procurement cost estimate.
  5. Export draft purchase review sheet.
- **Invariants:**
  - System must NEVER automatically dispatch purchase orders or mutate inventory without staff action.
  - Formulas and caveats (lead time, MOQ) must be clearly displayed in UI.
- **Expected API/DOM Behaviors:**
  - Inventory view returns calculated restock suggestions with `isDraftReviewOnly: true`.
- **Failure Thresholds:**
  - Automated unauthorized inventory quantity mutations.
  - Crashing on zero-demand or uncatalogued items.

---

## 5. Verification Matrix & Failure Threshold Summary

| Parameter | Normal Threshold | Warning Threshold | Critical Failure Threshold |
|---|---|---|---|
| **API Response Latency** | < 800ms | 800ms – 2,500ms | > 3,000ms (Probe Timeout) |
| **HTTP Status Code** | 200 OK (or 201/204) | 400 Bad Request (Validation) | 500 Internal Error / 502 / 504 |
| **Checkout Success Rate** | > 95% | 85% – 95% | < 85% (Triggers Anomaly) |
| **Price / Total Discrepancy**| ₹0.00 | N/A | > ₹0.00 (Immediate Blocker) |
| **PII Masking Breach** | 0 leaks | N/A | 1 leak (Immediate Blocker) |
| **Payment Idempotency** | 100% deduplicated | N/A | Double-charge or duplicate order |

---

## 6. Maintenance & Governance Rule

This document is governed by **Antigravity Rule [PROJECT_SYSTEM_TOOLS_AND_SERVICES.md]** and the **Master Phased Implementation Plan**. Under no circumstances may any automated routine alter these journeys without explicit human review and sign-off.
