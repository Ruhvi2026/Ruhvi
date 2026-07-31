-- Add image_url to categories
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS image_url text;

-- Create collections table
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  subtitle text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Join table for products and collections
CREATE TABLE IF NOT EXISTS public.product_collections (
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES public.collections(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, collection_id)
);
