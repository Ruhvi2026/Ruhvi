-- =============================================================================
-- 0073_operations_dashboard_core.sql
-- Operations Dashboard: extend products table, create Section 4 tables,
-- apply RLS, seed packaging variants, config thresholds, and 3 test products.
-- =============================================================================

-- ============================================================================
-- 1. EXTEND existing products table with Section 4 fields
-- ============================================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS collection text,
  ADD COLUMN IF NOT EXISTS sku_prefix text,
  ADD COLUMN IF NOT EXISTS cost_price numeric not null default 0,
  ADD COLUMN IF NOT EXISTS base_selling_price numeric not null default 0,
  ADD COLUMN IF NOT EXISTS packaging_cost numeric not null default 0,
  ADD COLUMN IF NOT EXISTS base_metal text,
  ADD COLUMN IF NOT EXISTS plating_type text,
  ADD COLUMN IF NOT EXISTS plating_thickness_microns numeric,
  ADD COLUMN IF NOT EXISTS metal_weight_grams numeric,
  ADD COLUMN IF NOT EXISTS durability_claim text,
  ADD COLUMN IF NOT EXISTS care_instructions text,
  ADD COLUMN IF NOT EXISTS stone_type text,
  ADD COLUMN IF NOT EXISTS stone_weight_carats numeric,
  ADD COLUMN IF NOT EXISTS stone_count integer,
  ADD COLUMN IF NOT EXISTS design_pattern text,
  ADD COLUMN IF NOT EXISTS finish_type text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS weight_grams numeric,
  ADD COLUMN IF NOT EXISTS length_cm numeric,
  ADD COLUMN IF NOT EXISTS width_cm numeric,
  ADD COLUMN IF NOT EXISTS height_cm numeric,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS seo_keywords text[],
  ADD COLUMN IF NOT EXISTS image_alt_text text,
  ADD COLUMN IF NOT EXISTS warranty_info text,
  ADD COLUMN IF NOT EXISTS return_window_days integer default 7,
  ADD COLUMN IF NOT EXISTS gift_wrap_available boolean default false;

-- ============================================================================
-- 2. product_variants — one row per sellable variant (size/metal/stone combo)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text unique not null,
  size text,
  metal_type text,
  stock_quantity integer not null default 0,
  reorder_point integer not null default 5,
  cost_price_override numeric,
  selling_price_override numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- 3. inventory_movements — every stock change, logged at variant level
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  movement_type text not null check (movement_type in ('stock_in', 'stock_out', 'adjustment', 'return')),
  quantity integer not null,
  reason text,
  reference_order_id text,
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);

-- ============================================================================
-- 4. suppliers
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  lead_time_days integer,
  quality_rating numeric check (quality_rating >= 1 and quality_rating <= 5),
  notes text,
  created_at timestamptz default now()
);

-- ============================================================================
-- 5. product_supplier_costs — cost history per product per supplier
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_supplier_costs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_id uuid references public.suppliers(id),
  cost_price numeric not null,
  effective_date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================================
-- 6. quality_control_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quality_control_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id),
  variant_id uuid references public.product_variants(id),
  batch_reference text,
  issue_type text check (issue_type in ('plating_uneven', 'stone_loose', 'size_mismatch', 'packaging_damage', 'other')),
  notes text,
  checked_by uuid references public.users(id),
  checked_at timestamptz default now()
);

-- ============================================================================
-- 7. packaging_variants
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.packaging_variants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cost numeric not null default 0,
  description text
);

-- ============================================================================
-- 8. rto_records — manual RTO entry until Orders table fully linked
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rto_records (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  variant_id uuid references public.product_variants(id),
  order_reference text,
  reason text,
  recorded_by uuid references public.users(id),
  recorded_at timestamptz default now()
);

-- ============================================================================
-- 9. competitor_prices — manual entry only, no scraping
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.competitor_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  competitor_name text not null,
  competitor_price numeric,
  url text,
  checked_at timestamptz default now()
);

-- ============================================================================
-- 10. production_batches
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.production_batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  quantity integer not null,
  target_completion_date date,
  status text default 'planned' check (status in ('planned', 'in_production', 'completed', 'delayed')),
  notes text,
  created_at timestamptz default now()
);

-- ============================================================================
-- 11. ENABLE RLS on all new tables
-- ============================================================================
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_supplier_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_control_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packaging_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rto_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 12. RLS POLICIES — all follow the existing is_admin_or_staff() pattern
-- ============================================================================

-- product_variants: staff/admin full CRUD, customers read active products
CREATE POLICY "Staff can manage product variants"
  ON public.product_variants FOR ALL
  USING (public.is_admin_or_staff());

CREATE POLICY "Customers can view variants of active products"
  ON public.product_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_variants.product_id
      AND products.status = 'active'
    )
  );

-- inventory_movements: staff/admin only
CREATE POLICY "Staff can view inventory movements"
  ON public.inventory_movements FOR SELECT
  USING (public.is_admin_or_staff());

CREATE POLICY "Staff can insert inventory movements"
  ON public.inventory_movements FOR INSERT
  WITH CHECK (public.is_admin_or_staff());

-- suppliers: staff/admin full CRUD
CREATE POLICY "Staff can manage suppliers"
  ON public.suppliers FOR ALL
  USING (public.is_admin_or_staff());

-- product_supplier_costs: staff/admin full CRUD
CREATE POLICY "Staff can manage product supplier costs"
  ON public.product_supplier_costs FOR ALL
  USING (public.is_admin_or_staff());

-- quality_control_logs: staff/admin full CRUD
CREATE POLICY "Staff can manage quality control logs"
  ON public.quality_control_logs FOR ALL
  USING (public.is_admin_or_staff());

-- packaging_variants: readable by everyone, staff/admin manage
CREATE POLICY "Packaging variants are viewable by everyone"
  ON public.packaging_variants FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage packaging variants"
  ON public.packaging_variants FOR ALL
  USING (public.is_admin_or_staff());

-- rto_records: staff/admin full CRUD
CREATE POLICY "Staff can manage rto records"
  ON public.rto_records FOR ALL
  USING (public.is_admin_or_staff());

-- competitor_prices: staff/admin full CRUD
CREATE POLICY "Staff can manage competitor prices"
  ON public.competitor_prices FOR ALL
  USING (public.is_admin_or_staff());

-- production_batches: staff/admin full CRUD
CREATE POLICY "Staff can manage production batches"
  ON public.production_batches FOR ALL
  USING (public.is_admin_or_staff());

-- ============================================================================
-- 13. SEED packaging_variants — starter rows (idempotent)
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_packaging_variants_name ON public.packaging_variants(name);

INSERT INTO public.packaging_variants (name, cost, description) VALUES
  ('Standard', 25, 'Standard velvet pouch with brand card'),
  ('Premium', 75, 'Premium rigid box with magnetic closure, satin lining, and care card'),
  ('Gift Wrap', 50, 'Gift-wrapped box with ribbon and personalized message card')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 14. SEED operations config thresholds in settings table
-- ============================================================================
INSERT INTO public.settings (key, value) VALUES
(
  'operations_thresholds',
  '{
    "low_stock_multiplier": 1.0,
    "high_stock_multiplier": 5.0,
    "dead_stock_days": 60,
    "margin_go_ahead": 25.0,
    "margin_reconsider_min": 12.0,
    "margin_reconsider_max": 24.99,
    "margin_dont_sell": 12.0,
    "cost_variance_flag_pct": 10.0,
    "rto_rate_warning_pct": 15.0
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 15. SEED test products, variants, and initial inventory
-- ============================================================================

-- Helper: grab category IDs by slug
DO $$
DECLARE
  v_rings_id uuid;
  v_necklaces_id uuid;
  v_earrings_id uuid;

  v_etr_id uuid;
  v_mln_id uuid;
  v_tbe_id uuid;

  v_etr_v6_id uuid;
  v_etr_v7_id uuid;
  v_etr_v8_id uuid;
  v_mln_v40_id uuid;
  v_mln_v45_id uuid;
  v_tbe_wp_id uuid;
  v_tbe_np_id uuid;

  v_supplier_id uuid;
BEGIN

  SELECT id INTO v_rings_id FROM public.categories WHERE slug = 'rings';
  SELECT id INTO v_necklaces_id FROM public.categories WHERE slug = 'necklaces';
  SELECT id INTO v_earrings_id FROM public.categories WHERE slug = 'earrings';

  -- ====================================================================
  -- Product 1: Eternal Radiance Ring
  -- ====================================================================
  INSERT INTO public.products (
    name, slug, description, category_id, sku, sku_prefix, status,
    price, mrp, cost_price, base_selling_price, packaging_cost, gst_rate,
    stock_quantity, low_stock_threshold,
    base_metal, plating_type, plating_thickness_microns, metal_weight_grams,
    durability_claim, care_instructions,
    stone_type, stone_weight_carats, stone_count,
    design_pattern, finish_type, color,
    weight_grams, length_cm, width_cm, height_cm,
    collection,
    meta_title, meta_description, seo_keywords, image_alt_text,
    warranty_info, return_window_days, gift_wrap_available,
    is_new_arrival, is_best_seller
  ) VALUES (
    'Eternal Radiance Ring', 'eternal-radiance-ring',
    'A timeless solitaire-style ring featuring a brilliant cubic zirconia stone set in premium 24K gold-plated brass. The polished shiny finish catches light from every angle, making it the perfect accessory for both daily wear and special occasions.',
    v_rings_id, 'ETR-GLD-7', 'ETR', 'active',
    2999.00, 4999.00, 1200.00, 2999.00, 50.00, 3.00,
    25, 5,
    'Brass', '24K Gold Plated', 2.5, 1.8,
    '12 months with proper care',
    'Avoid contact with water, perfumes, and chemicals. Store in a dry place. Clean with a soft dry cloth.',
    'Cubic Zirconia', 0.5, 1,
    'Solitaire', 'Shiny', 'Gold',
    4.5, 2.0, 2.0, 0.5,
    'Signature Collection',
    'Eternal Radiance Ring - 24K Gold Plated Cubic Zirconia Ring',
    'Shop the Eternal Radiance Ring from Ruhvi. A stunning 24K gold-plated solitaire ring with cubic zirconia stone. Perfect for engagements and daily wear.',
    ARRAY['gold ring', 'solitaire ring', 'cubic zirconia ring', '24k gold plated ring', 'engagement ring', 'women jewelry', 'gold plated jewelry'],
    'Eternal Radiance Ring - 24K Gold Plated Cubic Zirconia Solitaire Ring',
    '6 months warranty against plating wear', 7, true,
    true, false
  ) RETURNING id INTO v_etr_id;

  -- Variants: sizes 6, 7, 8
  INSERT INTO public.product_variants (product_id, sku, size, metal_type, stock_quantity, reorder_point, selling_price_override)
  VALUES
    (v_etr_id, 'ETR-GLD-6', '6', 'Gold', 8, 3, 2999.00),
    (v_etr_id, 'ETR-GLD-7', '7', 'Gold', 12, 5, 2999.00),
    (v_etr_id, 'ETR-GLD-8', '8', 'Gold', 5, 3, 2999.00);

  SELECT id INTO v_etr_v6_id FROM public.product_variants WHERE sku = 'ETR-GLD-6';
  SELECT id INTO v_etr_v7_id FROM public.product_variants WHERE sku = 'ETR-GLD-7';
  SELECT id INTO v_etr_v8_id FROM public.product_variants WHERE sku = 'ETR-GLD-8';

  -- Initial stock-in movements for Eternal Radiance
  INSERT INTO public.inventory_movements (variant_id, movement_type, quantity, reason, created_at)
  SELECT id, 'stock_in', stock_quantity, 'Initial stock', now() FROM public.product_variants WHERE product_id = v_etr_id;

  -- ====================================================================
  -- Product 2: Moonlit Elegance Necklace
  -- ====================================================================
  INSERT INTO public.products (
    name, slug, description, category_id, sku, sku_prefix, status,
    price, mrp, cost_price, base_selling_price, packaging_cost, gst_rate,
    stock_quantity, low_stock_threshold,
    base_metal, plating_type, plating_thickness_microns, metal_weight_grams,
    durability_claim, care_instructions,
    stone_type, stone_weight_carats, stone_count,
    design_pattern, finish_type, color,
    weight_grams, length_cm, width_cm, height_cm,
    collection,
    meta_title, meta_description, seo_keywords, image_alt_text,
    warranty_info, return_window_days, gift_wrap_available,
    is_new_arrival, is_best_seller
  ) VALUES (
    'Moonlit Elegance Necklace', 'moonlit-elegance-necklace',
    'A graceful cable chain necklace with a delicate teardrop pendant, finished in premium rose gold plating. The matte surface gives it a subtle, modern elegance that transitions effortlessly from day to evening wear.',
    v_necklaces_id, 'MLN-RG-45', 'MLN', 'active',
    5999.00, 8999.00, 2800.00, 5999.00, 80.00, 3.00,
    18, 4,
    'Copper', 'Rose Gold Plated', 3.0, 3.5,
    '12 months with proper care',
    'Remove before showering or swimming. Avoid direct contact with perfumes and lotions. Store in the provided pouch.',
    NULL, NULL, NULL,
    'Cable chain with teardrop pendant', 'Matte', 'Rose Gold',
    8.2, 45.0, 1.0, 0.3,
    'Moonlit Collection',
    'Moonlit Elegance Necklace - Rose Gold Plated Teardrop Pendant Necklace',
    'Discover the Moonlit Elegance Necklace from Ruhvi. A rose gold-plated chain with teardrop pendant, matte finish. Crafted on copper for lasting beauty.',
    ARRAY['rose gold necklace', 'teardrop pendant', 'gold plated chain', 'women necklace', 'rose gold jewelry', 'matte finish necklace', 'copper jewelry'],
    'Moonlit Elegance Necklace - Rose Gold Plated Matte Finish Teardrop Pendant',
    '6 months warranty against plating wear', 7, true,
    true, true
  ) RETURNING id INTO v_mln_id;

  -- Variants: 40cm and 45cm
  INSERT INTO public.product_variants (product_id, sku, size, metal_type, stock_quantity, reorder_point, selling_price_override)
  VALUES
    (v_mln_id, 'MLN-RG-40', '40', 'Rose Gold', 6, 3, 5499.00),
    (v_mln_id, 'MLN-RG-45', '45', 'Rose Gold', 12, 5, 5999.00);

  SELECT id INTO v_mln_v40_id FROM public.product_variants WHERE sku = 'MLN-RG-40';
  SELECT id INTO v_mln_v45_id FROM public.product_variants WHERE sku = 'MLN-RG-45';

  INSERT INTO public.inventory_movements (variant_id, movement_type, quantity, reason, created_at)
  SELECT id, 'stock_in', stock_quantity, 'Initial stock', now() FROM public.product_variants WHERE product_id = v_mln_id;

  -- ====================================================================
  -- Product 3: Twilight Blooms Earrings
  -- ====================================================================
  INSERT INTO public.products (
    name, slug, description, category_id, sku, sku_prefix, status,
    price, mrp, cost_price, base_selling_price, packaging_cost, gst_rate,
    stock_quantity, low_stock_threshold,
    base_metal, plating_type, plating_thickness_microns, metal_weight_grams,
    durability_claim, care_instructions,
    stone_type, stone_weight_carats, stone_count,
    design_pattern, finish_type, color,
    weight_grams, length_cm, width_cm, height_cm,
    collection,
    meta_title, meta_description, seo_keywords, image_alt_text,
    warranty_info, return_window_days, gift_wrap_available,
    is_new_arrival, is_best_seller
  ) VALUES (
    'Twilight Blooms Earrings', 'twilight-blooms-earrings',
    'Intricately designed floral drop earrings with an antique gold finish, accented with genuine freshwater pearls. Each earring features a handcrafted bloom motif, giving them a vintage heirloom feel that pairs beautifully with both traditional and contemporary outfits.',
    v_earrings_id, 'TBE-AG-P', 'TBE', 'active',
    3999.00, 6499.00, 1800.00, 3999.00, 65.00, 3.00,
    20, 4,
    'Alloy', '24K Gold Plated', 2.0, 2.2,
    '12 months with proper care',
    'Handle with care. Store separately to avoid scratches. Clean with a soft, dry cloth. Keep away from moisture.',
    'Freshwater Pearl', 0.3, 2,
    'Floral drop', 'Antique', 'Antique Gold',
    6.8, 3.5, 1.5, 0.3,
    'Heritage Collection',
    'Twilight Blooms Earrings - Antique Gold Floral Drop Earrings with Pearl',
    'Shop Twilight Blooms Earrings from Ruhvi. Antique gold-plated floral drop earrings with genuine freshwater pearls. Vintage design for bridal and festive wear.',
    ARRAY['antique earrings', 'floral earrings', 'pearl drop earrings', 'bridal jewelry', 'gold plated earrings', 'vintage earrings', 'festive jewelry'],
    'Twilight Blooms Earrings - Antique Gold Floral Drop Earrings with Freshwater Pearls',
    '6 months warranty against plating wear', 7, true,
    true, false
  ) RETURNING id INTO v_tbe_id;

  -- Variants: with pearl, without pearl
  INSERT INTO public.product_variants (product_id, sku, size, metal_type, stock_quantity, reorder_point, selling_price_override)
  VALUES
    (v_tbe_id, 'TBE-AG-P', NULL, 'Antique Gold', 10, 4, 3999.00),
    (v_tbe_id, 'TBE-AG-NP', NULL, 'Antique Gold', 10, 4, 3299.00);

  SELECT id INTO v_tbe_wp_id FROM public.product_variants WHERE sku = 'TBE-AG-P';
  SELECT id INTO v_tbe_np_id FROM public.product_variants WHERE sku = 'TBE-AG-NP';

  INSERT INTO public.inventory_movements (variant_id, movement_type, quantity, reason, created_at)
  SELECT id, 'stock_in', stock_quantity, 'Initial stock', now() FROM public.product_variants WHERE product_id = v_tbe_id;

  -- ====================================================================
  -- Seed a supplier for demonstration
  -- ====================================================================
  INSERT INTO public.suppliers (name, contact_person, phone, email, lead_time_days, quality_rating, notes)
  VALUES (
    'Arihant Jewel Craft',
    'Rakesh Mehta',
    '+91-9876543210',
    'rakesh@arihantjewelcraft.in',
    14,
    4.5,
    'Preferred supplier for gold-plated brass and copper jewelry. Reliable quality and consistent lead times.'
  ) RETURNING id INTO v_supplier_id;

  -- Seed product supplier costs for the 3 products
  INSERT INTO public.product_supplier_costs (product_id, supplier_id, cost_price, effective_date, notes)
  VALUES
    (v_etr_id, v_supplier_id, 1200.00, current_date, 'Initial cost for Eternal Radiance Ring'),
    (v_mln_id, v_supplier_id, 2800.00, current_date, 'Initial cost for Moonlit Elegance Necklace'),
    (v_tbe_id, v_supplier_id, 1800.00, current_date, 'Initial cost for Twilight Blooms Earrings');

END $$;

-- ============================================================================
-- 16. INDEXES for operations queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_variant ON public.inventory_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON public.inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rto_records_product ON public.rto_records(product_id);
CREATE INDEX IF NOT EXISTS idx_competitor_prices_product ON public.competitor_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_production_batches_product ON public.production_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_supplier_costs_product ON public.product_supplier_costs(product_id);
CREATE INDEX IF NOT EXISTS idx_quality_control_logs_product ON public.quality_control_logs(product_id);