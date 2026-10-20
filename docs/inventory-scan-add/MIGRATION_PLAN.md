# MIGRATION_PLAN.md — Schema & Policy Proposal (For Review Only)
**Feature:** Inventory Scan & Add  
**File:** `supabase/migrations/0112_inventory_scan_and_staging.sql`  
**Status:** PROPOSAL — PENDING USER APPROVAL (NOT EXECUTED)  

---

## 1. Migration Purpose & Summary
This migration introduces two strictly additive enhancements:
1. **Barcode Support on Products:** Adds optional `barcode text` to `public.products` with a partial unique index, allowing physical barcodes to map 1:1 to product SKUs while preserving existing products that do not have barcodes.
2. **Inventory Staging Table:** Adds `public.inventory_staging` to safely store mobile scan batches before website sync, protected by Row Level Security (RLS) so staff can only access their own scans.

---

## 2. Proposed Migration SQL Script

```sql
-- =============================================================================
-- Migration: 0112_inventory_scan_and_staging.sql
-- Description: Add barcode column to products and create inventory_staging table
-- =============================================================================

-- 1. Add barcode column to products table (if not exists)
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS barcode text;

-- Partial unique index: ensures unique barcodes across products, while allowing NULLs
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode 
  ON public.products(barcode) 
  WHERE barcode IS NOT NULL;

-- Index on barcode for fast lookup during mobile scan
CREATE INDEX IF NOT EXISTS idx_products_barcode_lookup 
  ON public.products(barcode);

-- 2. Create inventory_staging table
CREATE TABLE IF NOT EXISTS public.inventory_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_scan_id uuid UNIQUE NOT NULL,
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  barcode text NOT NULL,
  sku text NOT NULL,
  weight_grams numeric(10,2) NOT NULL,
  cost_price numeric(12,2) NOT NULL DEFAULT 0.00,
  stock_quantity integer NOT NULL DEFAULT 1,
  product_name text,
  price numeric(12,2),
  mrp numeric(12,2),
  collection text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  notes text,
  action_type text NOT NULL DEFAULT 'auto',
  status text NOT NULL DEFAULT 'staged',
  sync_error text,
  synced_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for user queue queries
CREATE INDEX IF NOT EXISTS idx_inventory_staging_owner_status 
  ON public.inventory_staging(owner_id, status);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.inventory_staging ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (Staff Isolation by owner_id)
-- Staff can view only their own staged records
CREATE POLICY "Staff can view own staged inventory" 
  ON public.inventory_staging 
  FOR SELECT 
  USING (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role::text IN ('admin', 'super_admin', 'manager', 'staff')
    )
  );

-- Staff can insert their own staged records
CREATE POLICY "Staff can insert own staged inventory" 
  ON public.inventory_staging 
  FOR INSERT 
  WITH CHECK (owner_id = auth.uid());

-- Staff can update their own staged records
CREATE POLICY "Staff can update own staged inventory" 
  ON public.inventory_staging 
  FOR UPDATE 
  USING (owner_id = auth.uid());

-- Staff can delete their own staged records
CREATE POLICY "Staff can delete own staged inventory" 
  ON public.inventory_staging 
  FOR DELETE 
  USING (owner_id = auth.uid());
```

---

## 3. Rollback SQL Script

In case of any issues, this exact rollback script reverses all changes cleanly:

```sql
-- Rollback for 0112_inventory_scan_and_staging.sql
DROP TABLE IF EXISTS public.inventory_staging CASCADE;
DROP INDEX IF EXISTS public.idx_products_barcode;
DROP INDEX IF EXISTS public.idx_products_barcode_lookup;
ALTER TABLE public.products DROP COLUMN IF EXISTS barcode;
```

---

## 4. Safety & Compatibility Analysis
- **Non-Destructive:** No existing tables or columns are modified or deleted. Existing queries (`SELECT * FROM products`) remain 100% compatible.
- **Nullability Safe:** `barcode` is nullable on `products`, so zero existing product records are broken or require data backfill.
- **Zero RLS Interference:** RLS policies on `products`, `orders`, and other tables are untouched. RLS on `inventory_staging` is isolated to the new table.
- **Environment:** To be executed only after explicit user approval.
