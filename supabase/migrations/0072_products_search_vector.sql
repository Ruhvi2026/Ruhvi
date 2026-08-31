-- =============================================================================
-- 0072_products_search_vector.sql
-- Full-text search for the products catalog (Fix 9).
-- Replaces per-keystroke ilike queries with tsvector + GIN index.
-- =============================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(sku, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_products_search
  ON public.products USING GIN (search_vector);