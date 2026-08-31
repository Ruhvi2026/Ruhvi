# Ruhvi Jewels — Operations Dashboard Implementation Plan

## 0. Context

Ruhvi Jewels is a gold-plated jewelry e-commerce brand, currently in **development phase** (not yet live). Expected volume at launch: roughly 100–200 orders/month.

Existing stack:
- Next.js App Router + TypeScript, deployed on Vercel
- Supabase (Postgres) as the backend database
- EspoCRM handles **support tickets only** (not general CRM)
- PostHog handles product analytics (already implemented, complete)
- A support dashboard already exists in this same app (e.g. `src/app/api/support/tickets/route.ts`, `src/app/support/...`)

This document specs a **new Operations Dashboard** inside the **same Next.js app** (do not create a separate app/repo). Confirmed: **no products, inventory, or catalog data exists anywhere yet** — this is a from-scratch build, both database and UI.

**Out of scope for this document** (owned by a separate workstream): the full Orders dashboard, checkout/payment flow, and the actual courier/shipping integration (Shiprocket or otherwise — not finalized yet). This doc only builds the operations-side pieces, and designs clean hooks so the Orders workstream can plug in later without rework.

---

## 1. How the agent should use this document

1. Read this entire document before writing any code.
2. **Do Phase 0 first.** It is an audit, not a build step. Report findings before touching Phase 1.
3. Work through Phases 1 → 7 in order. After each phase, stop and report: what was built, any deviation from this spec, any assumptions made. Wait for confirmation before starting the next phase.
4. If a later phase's instructions don't match what Phase 0 finds (e.g. a table already partially exists), stop and ask — do not silently improvise or silently skip the phase.
5. All numeric thresholds in this doc (stock levels, margin bands, RTO %, dead-stock days) are **starting defaults, not hardcoded rules** — store them as configurable values (a settings table or constants file), not magic numbers scattered in code.

---

## 2. Key decisions already made

- **AI content-generation provider**: left to the agent's judgment — pick whichever has the simplest server-side SDK to integrate (OpenAI and Anthropic both have simple single-endpoint chat APIs suitable for this). Report which one was used and why.
- **SKU-level tracking is required.** A single design (e.g. one ring) can have multiple variants (size, metal tone, stone) — each variant gets its own SKU and its own stock count.
- **Search** must work across product name, SKU, and other attributes (size, metal type, category) — not SKU-only.
- **Shipping cost** in the calculator is a manual/editable field for now (courier not finalized). Design it so a future "auto-calculate from courier API" can slot in without restructuring the schema.
- **Orders-dependent features** (RTO %, winning products, sales-linked analytics) are gated in Phase 5 behind what Phase 0 finds about the Orders workstream's schema.

---

## 3. Architecture: real-time vs. lazy-loaded

Per explicit requirement: the dashboard's main screen should stay fast. Only a small set of things auto-fetch on load; everything else fetches on-demand when the user opens that report.

**Real-time / auto-fetch on dashboard load:**
- Current stock levels for low-stock/flagged items
- Low-stock alert list
- Today's snapshot (new stock movements, RTOs recorded today)
- Top 5 performing products (once sales data exists)

**Lazy-loaded / fetch only when opened:**
- Inventory aging report
- Full valuation report
- Seasonal/trend forecasting
- Supplier performance report
- Cost variance history
- Quality control logs
- Competitor pricing
- Vendor scorecard
- Batch production planner
- Full stock movement history

Implementation note: these should be separate routes/components that fetch their own data on mount, not sections of one big query that runs on every dashboard load.

---

## 4. Database schema (Supabase / Postgres)

Run these in Phase 1, only after Phase 0 confirms none of these tables already exist. Match whatever RLS/auth pattern is already used on `support_tickets` / `staff` — Phase 0 should report that pattern so it's applied consistently here instead of inventing a new one.

```sql
-- Core product record (one row per design)
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  category text,              -- Ring, Necklace, Bracelet, Earring, etc.
  collection text,
  sku_prefix text,
  status text not null default 'draft',  -- draft | active | archived

  -- Gold-plated specific
  base_metal text,                       -- Brass, Copper, Alloy
  plating_type text,                     -- 24K Gold Plated, Rose Gold Plated, etc.
  plating_thickness_microns numeric,
  metal_weight_grams numeric,
  durability_claim text,                 -- e.g. "12 months with proper care"
  care_instructions text,

  -- Stone / design
  stone_type text,
  stone_weight_carats numeric,
  stone_count integer,
  design_pattern text,
  finish_type text,                      -- Matte, Shiny, Antique
  color text,

  -- Physical specs (also feed shipping cost estimate)
  weight_grams numeric,
  length_cm numeric,
  width_cm numeric,
  height_cm numeric,

  -- Pricing
  cost_price numeric not null default 0,
  base_selling_price numeric not null default 0,
  packaging_cost numeric not null default 0,

  -- SEO
  meta_title text,
  meta_description text,
  seo_keywords text[],
  image_alt_text text,

  -- Additional
  warranty_info text,
  return_window_days integer default 7,
  gift_wrap_available boolean default false,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- One row per sellable variant (size/metal/stone combination)
create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  sku text unique not null,
  size text,                    -- ring size / chain length — null if not applicable
  metal_type text,              -- overrides product-level if this variant differs
  stock_quantity integer not null default 0,
  reorder_point integer not null default 5,
  cost_price_override numeric,
  selling_price_override numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Every stock change, logged
create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants(id) on delete cascade,
  movement_type text not null,  -- stock_in | stock_out | adjustment | return
  quantity integer not null,
  reason text,
  reference_order_id text,      -- free text for now; convert to FK once Orders table exists
  created_by uuid,              -- references staff table
  created_at timestamptz default now()
);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  lead_time_days integer,
  quality_rating numeric,       -- 1–5
  notes text,
  created_at timestamptz default now()
);

-- Cost history per product per supplier (for cost variance tracking)
create table product_supplier_costs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  supplier_id uuid references suppliers(id),
  cost_price numeric not null,
  effective_date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

create table quality_control_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  variant_id uuid references product_variants(id),
  batch_reference text,
  issue_type text,   -- plating_uneven | stone_loose | size_mismatch | packaging_damage | other
  notes text,
  checked_by uuid,
  checked_at timestamptz default now()
);

create table packaging_variants (
  id uuid primary key default gen_random_uuid(),
  name text not null,   -- Standard, Premium, Gift Wrap
  cost numeric not null default 0,
  description text
);

-- Manual RTO/return entry until Orders table exists to link properly
create table rto_records (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  variant_id uuid references product_variants(id),
  order_reference text,   -- manual text entry for now
  reason text,
  recorded_by uuid,
  recorded_at timestamptz default now()
);

create table competitor_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  competitor_name text not null,
  competitor_price numeric,
  url text,
  checked_at timestamptz default now()
);

create table production_batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  quantity integer not null,
  target_completion_date date,
  status text default 'planned',  -- planned | in_production | completed | delayed
  notes text,
  created_at timestamptz default now()
);
```

---

## 5. Phase 0 — Audit (mandatory, do this first)

Report findings for all of these before writing any code:

1. Confirm none of the tables in Section 4 already exist in Supabase (expected: none do).
2. Check whether an `orders` or `order_items` table exists anywhere in Supabase (a separate workstream owns Orders — it may or may not have started). This directly gates Phase 5.
3. Check the `support_tickets` table structure — does it have (or could it easily get) a `product_id` or `order_id` reference column? This gates Phase 7.
4. Check how the existing support dashboard routes are structured (e.g. `src/app/support/...`, `src/app/api/support/...`) so the operations routes can mirror the same conventions (folder structure, auth middleware, RLS pattern).
5. Check `staff` table for existing `role_id` / `team` / `department_id` columns (memory says these already exist) — confirm, so operations access control can reuse the same pattern rather than inventing a new one.

---

## 6. Phase 1 — Core schema setup

- Create all tables from Section 4.
- Apply RLS policies matching the pattern found in Phase 0.
- Seed `packaging_variants` with a couple of starter rows (e.g. Standard, Premium) so Phase 4's calculator has something to select from immediately.

---

## 7. Phase 2 — Product listing UI + AI content generation

Build a product creation/edit form at (e.g.) `src/app/operations/products/...`, covering every field in Section 9's field reference table, grouped into sections: Basic Info, Gold-Plated Details, Physical Specs, Stone/Design, Pricing, SEO, Variants.

**Variants sub-section**: allow adding multiple size/metal combinations under one product; each generates its own SKU (pattern: `{sku_prefix}-{size}-{metal_type}`, e.g. `RNG-GLD-6`) and its own stock quantity field.

**AI "Generate" button**:
- New server-side route, e.g. `src/app/api/operations/generate-product-content/route.ts` (POST).
- Input: whatever fields are already filled (category, base_metal, plating_type, stone_type, design_pattern, finish_type, color, weight_grams).
- Calls the chosen AI provider server-side. API key stored as an env var **without** the `NEXT_PUBLIC_` prefix (e.g. `AI_CONTENT_API_KEY`) — never exposed client-side.
- Suggested prompt shape: *"You are a jewelry e-commerce copywriter. Given these product specs: {specs}, generate: 1) a compelling SEO-friendly product name (if not already given), 2) a 100–150 word product description, 3) a meta title under 60 characters, 4) a meta description under 160 characters, 5) 5–8 relevant SEO keywords. Return as JSON."*
- Output populates the relevant form fields as **editable suggestions** — user reviews/edits before saving, nothing auto-saves from the AI call directly.

---

## 8. Phase 3 — Inventory dashboard

**Real-time section** (see Section 3): low-stock list, today's stock movement snapshot.

**Search & filters**: by product name, SKU, category, metal type, size, and stock status (in stock / low stock / dead stock / out of stock).

**Stock status logic** (defaults, configurable):
- **Low stock**: `stock_quantity <= reorder_point`
- **Dead stock**: no `stock_out` movement in the last 60 days AND `stock_quantity > 0`
- **High stock**: `stock_quantity > reorder_point × 5` (rough heuristic — flag as a config value, not a fixed rule)

**Lazy-loaded reports** (Section 3 list): aging report, valuation report (`sum(stock_quantity × cost_price)` across variants), full movement history.

---

## 9. Phase 4 — Profit / rate calculator

**Auto-fetched when a product/variant is selected**: `cost_price` (or variant override), `weight_grams`, dimensions, `base_selling_price`, `packaging_cost`.

**Manual inputs**:
- Discount % (optional)
- Shipping cost (manual number field for now — see Section 0 note on courier not being finalized)
- Tax/GST %
- Batch quantity (only shown in batch mode)

**Two modes**: per-unit, and batch (same formula × quantity, for "if I make 100 pieces at this price" planning).

**Calculations**:
- Gross profit = Selling price − Cost price
- Net profit = Gross profit − (Packaging + Shipping + Tax)
- Profit margin % = Net profit / Selling price × 100
- Break-even price = Cost price + Packaging + Shipping + Tax
- ROI % = Net profit / Cost price × 100

**Recommendation** (default bands, configurable):
- Margin ≥ 25% → "✅ Go Ahead"
- Margin 12–24% → "⚠️ Reconsider — thin margin"
- Margin < 12% → "🔴 Don't Sell At This Price"

---

## 10. Phase 5 — Product performance & RTO tracking (gated by Phase 0)

Check Phase 0's finding on the Orders table before starting:

- **If `orders`/`order_items` exists**: build RTO rate as `rto_records count / order count for that product`, and "winning products" using a combined score of margin + sales volume + low RTO.
- **If it doesn't exist yet**: build the UI and the `rto_records`-based views now, but scope them honestly — show raw RTO counts and margin-based ranking only (no sales-volume weighting, since that data doesn't exist yet). Add a visible note in the UI like "full ranking will activate once order data is connected." Don't fake or estimate sales numbers.

**Trend analysis** (lazy-loaded): monthly/quarterly views — will show "insufficient data" until there's enough history; that's expected and fine for now.

---

## 11. Phase 6 — Supplementary features (all lazy-loaded)

- **Supplier management**: CRUD UI over `suppliers`.
- **Cost variance tracking**: view of `product_supplier_costs` over time per product; flag if latest cost is >10% above the previous entry (configurable).
- **Quality control checklist**: log entries against `quality_control_logs`, filterable by product/batch.
- **Packaging variants**: CRUD over `packaging_variants`, selectable in the Phase 4 calculator.
- **Competitor price monitoring**: manual entry only (no scraping) — simple CRUD over `competitor_prices`.
- **Vendor performance scorecard**: computed view combining `suppliers.lead_time_days`, `suppliers.quality_rating`, and cost trend from `product_supplier_costs`.
- **Batch production planning**: CRUD + simple list/calendar view over `production_batches`.

---

## 12. Phase 7 — Support ticket integration (gated by Phase 0)

Only build this if Phase 0 confirms `support_tickets` has (or can reasonably get) a `product_id` column. If so, add a "most-complained-about product" view joining `support_tickets` to `products`. If not, report back and this phase is deferred until that column exists.

---

## 13. Product listing — full field reference

| Group | Fields |
|---|---|
| Basic Info | Product Name, Description, Category, Collection, SKU Prefix |
| Gold-Plated Details | Base Metal, Plating Type, Plating Thickness (microns), Metal Weight (g), Durability Claim, Care Instructions |
| Physical Specs | Weight (g), Length/Width/Height (cm), Finish Type, Color |
| Stone / Design | Stone Type, Stone Weight (carats), Stone Count, Design Pattern |
| Pricing | Cost Price, Base Selling Price, Packaging Cost |
| SEO | Meta Title, Meta Description, SEO Keywords, Image Alt Text, Slug (auto-generated, editable) |
| Additional | Warranty Info, Return Window (days), Gift Wrap Available |
| Per-Variant | Size, Metal Type (if differs from base), SKU, Stock Quantity, Reorder Point, Cost/Selling Price Override |

---

## 14. Explicitly deferred (do not build unless asked)

- Barcode/QR code scanning (schema-ready via `sku`, but no scanning hardware/UI now)
- Multi-warehouse support (single-location assumed for now)
- Automated competitor price scraping (manual entry only)
- Automatic courier/shipping cost calculation (manual field until Shiprocket or another courier is finalized)
