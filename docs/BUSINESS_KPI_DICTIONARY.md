# Project Ruhvi — Canonical Business KPI Dictionary

**Document Version:** 1.0  
**Generated Date:** 26 October 2026  
**Status:** Canonical Standard Specification  
**Applicability:** Master Phased Implementation Plan — Phase 02 Deliverable  

---

## 1. Global Standards & Conventions

To prevent silent metric drift across the Admin Dashboard, Operations Portal, AI Co-Founder, and automated reports, all calculations MUST adhere to these global standards:

| Standard | Rule | Specification |
| :--- | :--- | :--- |
| **Standard Timezone** | `Asia/Kolkata` (IST, UTC+05:30) | All "Today", "Yesterday", "Last 7 Days", and "This Month" date boundaries MUST be truncated and calculated in Indian Standard Time (`+05:30`). |
| **Currency** | Indian Rupee (INR, `₹`) | Monetary values stored as numeric with 2 decimal places (`numeric(12,2)`). |
| **Test Exclusions** | Strict exclusion | Orders containing `is_test = true` or user accounts flagged with `role IN ('admin', 'super_admin')` during sandbox testing MUST be excluded from production KPI calculations. |
| **Timestamp Attribution** | Transaction Date vs Event Date | Order totals and conversions are attributed to `orders.created_at`. Refund and return amounts are attributed to `returns.resolved_at` or `order_events.created_at`. |
| **Zero Division Guard** | Explicit fallback | Any calculation where the denominator is 0 must evaluate to `0.00` or return an explicit `INSUFFICIENT_DATA` flag, never `NaN` or `Infinity`. |

---

## 2. Core E-Commerce & Financial Metrics

### 2.1 Gross Sales (Gross Revenue)
* **Definition:** Total monetary value of all legitimate orders placed by customers before deducting cancellations, returns, discounts, or refunds. Includes product price, shipping fees, COD charges, and GST.
* **Source of Truth:** `public.orders.total`
* **Status Filter & Inclusions:**
  - Status: All orders where `orders.status != 'pending'` (includes `confirmed`, `packed`, `shipped`, `delivered`, `cancelled`, `returned`).
  - Pending/abandoned payment attempts are excluded.
* **Formula:**
  $$\text{Gross Sales} = \sum \text{orders.total}$$
* **Data Owner:** Finance / Super Admin.
* **Caveat:** Gross sales includes orders that were subsequently cancelled or returned. It measures top-line demand generation, not realized cash.

---

### 2.2 Net Sales (Net Realized Revenue)
* **Definition:** The actual realized revenue retained by Ruhvi after removing cancellations, completed customer returns, and courier Return-to-Origin (RTO).
* **Source of Truth:** `public.orders` joined with `public.returns` and `public.order_events`
* **Status Filter & Exclusions:**
  - Excludes `orders.status IN ('cancelled', 'returned')`.
  - Excludes orders with an `order_events` record where `event_type = 'RTO_RECEIVED'`.
* **Formula:**
  $$\text{Net Sales} = \sum_{\substack{\text{orders.status} \notin (\text{'cancelled'}, \text{'returned'}) \\ \land \text{no RTO}}} \text{orders.total} - \sum \text{approved\_refund\_amounts}$$
* **Data Owner:** Finance / Super Admin.
* **Caveat:** If an order placed in Month 1 is returned in Month 2, the return refund is attributed to Month 2's accounting ledger or adjusted retroactively depending on the accounting window.

---

### 2.3 Paid Orders & Order Volume
* **Definition:** Count of distinct customer orders that have achieved verified payment settlement or valid COD commitment.
* **Source of Truth:** `public.orders`
* **Calculation Rules:**
  - Online Pre-Paid: `orders.payment_status = 'paid'` (verified via PhonePe / Paytm).
  - Partial-COD: `orders.is_partial_cod = true` AND `orders.payment_status IN ('paid', 'partial_paid')`.
  - Pure COD: `orders.payment_method = 'cod'` AND `orders.status NOT IN ('pending', 'cancelled')`.
* **Formula:**
  $$\text{Paid Orders Count} = \text{COUNT}(\text{orders.id where criteria met})$$
* **Data Owner:** Orders & Logistics / Finance.

---

### 2.4 Average Order Value (AOV)
* **Definition:** The average gross revenue generated per confirmed customer order.
* **Source of Truth:** `public.orders`
* **Formula:**
  $$\text{AOV} = \frac{\text{Gross Sales of Confirmed Orders}}{\text{Total Confirmed Orders Count}}$$
* **Filter:**
  - Numerator: $\sum \text{orders.total}$ for orders where `status NOT IN ('pending', 'cancelled')`.
  - Denominator: $\text{COUNT}(\text{orders.id})$ where `status NOT IN ('pending', 'cancelled')`.
* **Zero Guard:** If Total Confirmed Orders $= 0$, $\text{AOV} = 0.00$.

---

## 3. Operational & Logistics Quality Metrics

### 3.1 Order Cancellation Rate
* **Definition:** Percentage of placed orders that were cancelled before dispatch, either by the customer or by system fraud/stockout rules.
* **Source of Truth:** `public.orders.status = 'cancelled'`
* **Formula:**
  $$\text{Cancellation Rate (\%)} = \left( \frac{\text{COUNT}(\text{orders where status} = \text{'cancelled'})}{\text{COUNT}(\text{all placed orders in time window})} \right) \times 100$$
* **Healthy Benchmark:** $< 10.0\%$.
* **Anomaly Alert Trigger:** $\ge 15.0\%$ with a minimum sample size of $\ge 5$ orders.

---

### 3.2 Return-to-Origin (RTO) Rate
* **Definition:** Percentage of dispatched shipments that could not be delivered to the customer and were returned back to Ruhvi warehouse by the courier.
* **Source of Truth:** `public.order_events` where `event_type IN ('RTO_INITIATED', 'RTO_RECEIVED')`
* **Formula:**
  $$\text{RTO Rate (\%)} = \left( \frac{\text{COUNT}(\text{orders with RTO event})}{\text{COUNT}(\text{orders shipped in time window})} \right) \times 100$$
* **Denominator:** Only orders that reached `shipped` or `out_for_delivery` status.
* **Warning Threshold:** $\ge 15.0\%$ (Configured in `settings.operations_thresholds`).
* **Data Owner:** Orders & Logistics.

---

### 3.3 Customer Return & Refund Rate
* **Definition:** Percentage of delivered orders where the customer initiated a return claim and received a refund or replacement.
* **Source of Truth:** `public.returns` joined with `public.orders`
* **Formula:**
  $$\text{Return Rate (\%)} = \left( \frac{\text{COUNT}(\text{distinct orders in public.returns where status} \in (\text{'approved'}, \text{'completed'}))}{\text{COUNT}(\text{orders where status} = \text{'delivered'})} \right) \times 100$$
* **Attribution Window:** Return eligibility is locked to 7 days post-delivery.

---

## 4. Storefront Funnel & Conversion Metrics

### 4.1 Checkout Conversion Rate
* **Definition:** Proportion of unique visitor checkout sessions that result in a confirmed paid order.
* **Source of Truth:** `PostHog` / `Meta CAPI` (Sessions) $\rightarrow$ `public.orders` (Completed Transactions).
* **Formula:**
  $$\text{Checkout Conversion Rate (\%)} = \left( \frac{\text{COUNT}(\text{orders with confirmed payment})}{\text{COUNT}(\text{unique checkout initiation events})} \right) \times 100$$
* **Caveat:** Client-only ad-blockers can depress analytics event counts. When computing internal operational conversion, use distinct `public.carts` transitioning to `public.orders`.

---

### 4.2 Cart Abandonment Rate
* **Definition:** Percentage of shopping carts created or modified that did not progress to a completed order within 24 hours.
* **Source of Truth:** `public.carts` and `public.cart_items` joined with `public.orders`
* **Formula:**
  $$\text{Cart Abandonment Rate (\%)} = \left( 1 - \frac{\text{COUNT}(\text{orders placed from carts})}{\text{COUNT}(\text{carts with active items created in window})} \right) \times 100$$
* **Attribution Window:** Carts idle for $> 24\text{ hours}$ trigger automated email recovery via Brevo.

---

### 4.3 Repeat Customer Rate
* **Definition:** Percentage of ordering customers who have placed two or more completed orders during their customer lifetime.
* **Source of Truth:** `public.orders` grouped by `user_id`
* **Formula:**
  $$\text{Repeat Customer Rate (\%)} = \left( \frac{\text{COUNT}(\text{distinct customers with} \ge 2 \text{ confirmed orders})}{\text{COUNT}(\text{distinct customers with} \ge 1 \text{ confirmed order})} \right) \times 100$$
* **Filter:** Excludes guest orders not linked to a unified identity in `customer_identities`.

---

## 5. Inventory & Supply Chain Intelligence Metrics

### 5.1 SKU Sales Velocity
* **Definition:** Average number of units sold per day for an individual SKU over a rolling observation window (default: 30 days).
* **Source of Truth:** `public.order_items` joined with `public.orders`
* **Formula:**
  $$\text{Sales Velocity (Units/Day)} = \frac{\sum \text{order\_items.quantity (confirmed orders)}}{\text{Observation Window Days (e.g. 30)}}$$
* **Status Exclusion:** Excludes items from cancelled orders.

---

### 5.2 Days of Inventory (DOI) / Stock Run-Out Time
* **Definition:** Estimated number of days remaining until current sellable on-hand stock reaches zero, assuming recent sales velocity persists.
* **Source of Truth:** `public.products.stock_quantity` $\div$ `SKU Sales Velocity`
* **Formula:**
  $$\text{Days of Inventory (DOI)} = \begin{cases} 
  \frac{\text{products.stock\_quantity}}{\text{Sales Velocity}}, & \text{if Sales Velocity} > 0 \\
  \infty \text{ (or 'DORMANT')}, & \text{if Sales Velocity} = 0 \land \text{Stock} > 0 \\
  0, & \text{if Stock} \le 0 
  \end{cases}$$
* **Urgency Tiers (from `catalog-intelligence.ts`):**
  - $\text{DOI} \le 7\text{ days}$: `CRITICAL`
  - $7 < \text{DOI} \le 14\text{ days}$: `ELEVATED`
  - $14 < \text{DOI} \le 45\text{ days}$: `HEALTHY`
  - $\text{DOI} > 60\text{ days}$: `OVERSTOCKED` / `DEAD_STOCK`

---

### 5.3 Stock-Out Rate
* **Definition:** Proportion of active catalog product variants that currently have 0 sellable units in inventory.
* **Source of Truth:** `public.products`
* **Formula:**
  $$\text{Stock-Out Rate (\%)} = \left( \frac{\text{COUNT}(\text{products where status} = \text{'active'} \land \text{stock\_quantity} \le 0)}{\text{COUNT}(\text{all products where status} = \text{'active'})} \right) \times 100$$
* **Data Owner:** Operations & Inventory.

---

## 6. Marketing & Ad Attribution Metrics

### 6.1 Return on Ad Spend (ROAS)
* **Definition:** Gross revenue generated directly attributable to paid advertising divided by the total advertising spend on that platform.
* **Source of Truth:** Meta Ads Remote MCP Server / Google Ads API Spend $\rightarrow$ `public.orders` attributed via UTM tags / Meta CAPI.
* **Formula:**
  $$\text{ROAS} = \frac{\text{Attributed Gross Order Revenue}}{\text{Total Ad Spend in Window}}$$
* **Data Constraints & Caveats:** ROAS is only computable when valid ad spend data is returned from the Meta Ads MCP integration. If API tokens are absent or expired, the metric MUST return `DATA_UNAVAILABLE` rather than estimated numbers.

---

### 6.2 Customer Acquisition Cost (CAC)
* **Definition:** Total marketing campaign expenditure divided by the number of new first-time customers acquired during the campaign window.
* **Formula:**
  $$\text{Blended CAC} = \frac{\text{Total Paid Ad Spend}}{\text{Count of First-Time Purchasing Customers}}$$

---

## 7. AI & Technical Infrastructure Metrics

### 7.1 Payment Gateway Failure Rate
* **Definition:** Percentage of customer payment checkout attempts that ended in failure or gateway error.
* **Source of Truth:** `public.orders.payment_status = 'failed'` and payment webhook error logs
* **Formula:**
  $$\text{Payment Failure Rate (\%)} = \left( \frac{\text{COUNT}(\text{payment attempts with status} = \text{'failed'})}{\text{COUNT}(\text{total payment attempts})} \right) \times 100$$
* **Anomaly Alert Trigger:** $\ge 20.0\%$ failure rate over a rolling 1-hour window.

---

### 7.2 AI Provider Failover Rate
* **Definition:** Frequency with which AI requests fail over from Primary Gemini Account 1 to Secondary Gemini Account 2 or Tertiary DeepSeek.
* **Source of Truth:** `public.ai_failure_diagnostics` (`0026`) and `public.ai_logs` (`0028`)
* **Formula:**
  $$\text{AI Failover Rate (\%)} = \left( \frac{\text{COUNT}(\text{diagnostics where recovery\_status} = \text{'recovered'})}{\text{COUNT}(\text{total AI invocations in ai\_logs})} \right) \times 100$$
* **Data Owner:** Tech / Developer Portal.

---

## 8. Summary KPI Reference Table

| Metric | Source Table | Numerator | Denominator | Benchmark |
| :--- | :--- | :--- | :--- | :--- |
| **Gross Sales** | `public.orders` | $\sum \text{orders.total}$ | N/A | Growth |
| **Net Sales** | `public.orders`, `returns` | $\sum \text{orders.total} - \text{Refunds}$ | N/A | Realized |
| **AOV** | `public.orders` | $\sum \text{valid orders.total}$ | $\text{Count valid orders}$ | Baseline |
| **Cancellation Rate** | `public.orders` | $\text{Count cancelled}$ | $\text{Count all placed}$ | $< 10\%$ |
| **RTO Rate** | `public.order_events` | $\text{Count RTO events}$ | $\text{Count shipped orders}$ | $< 15\%$ |
| **Return Rate** | `public.returns` | $\text{Count approved returns}$ | $\text{Count delivered orders}$ | $< 5\%$ |
| **Days of Inventory** | `products`, `order_items` | $\text{stock\_quantity}$ | $\text{daily units sold}$ | $14 - 45\text{ days}$ |
| **Stock-Out Rate** | `public.products` | $\text{Count active zero-stock}$ | $\text{Count active catalog}$ | $< 3\%$ |
| **Payment Failures** | `public.orders` | $\text{Count failed payments}$ | $\text{Total attempts}$ | $< 10\%$ |
| **AI Failover Rate** | `ai_diagnostics`, `ai_logs` | $\text{Count failovers}$ | $\text{Total AI calls}$ | $< 5\%$ |
