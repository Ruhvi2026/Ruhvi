-- Migration 0047: SEO suite persistence
-- Adds per-image alt text for the Image Alt Text Manager and a
-- global seo_meta row so the SEO Control Suite saves against real data.

ALTER TABLE public.product_images
  ADD COLUMN IF NOT EXISTS alt TEXT;

COMMENT ON COLUMN public.product_images.alt IS
  'Accessibility/SEO alt text for the product image, managed in the admin SEO suite.';

-- Seed default global SEO meta settings
INSERT INTO public.settings (key, value)
VALUES (
  'seo_meta',
  '{
    "siteTitle": "Ruhvi — Exquisite Fine Jewellery & Certified Gold",
    "titleTemplate": "%s | Ruhvi Fine Jewellery",
    "metaDescription": "Discover handcrafted gold, diamond, and gemstone jewellery at Ruhvi. BIS hallmarked purity, lifetime warranty, and free insured shipping across India.",
    "ogImageUrl": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=1200&auto=format&fit=crop",
    "robotsIndex": true,
    "robotsFollow": true
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;
