-- =============================================================================
-- Migration: 0112_inventory_scan_and_staging.sql
-- Description: Add barcode to products and create inventory_staging with RLS
-- =============================================================================

-- 1. Add barcode column to products table
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

-- Index for fast user queue queries
CREATE INDEX IF NOT EXISTS idx_inventory_staging_owner_status 
  ON public.inventory_staging(owner_id, status);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.inventory_staging ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (Staff Isolation by owner_id)
DROP POLICY IF EXISTS "Staff can view own staged inventory" ON public.inventory_staging;
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

DROP POLICY IF EXISTS "Staff can insert own staged inventory" ON public.inventory_staging;
CREATE POLICY "Staff can insert own staged inventory" 
  ON public.inventory_staging 
  FOR INSERT 
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Staff can update own staged inventory" ON public.inventory_staging;
CREATE POLICY "Staff can update own staged inventory" 
  ON public.inventory_staging 
  FOR UPDATE 
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Staff can delete own staged inventory" ON public.inventory_staging;
CREATE POLICY "Staff can delete own staged inventory" 
  ON public.inventory_staging 
  FOR DELETE 
  USING (owner_id = auth.uid());
