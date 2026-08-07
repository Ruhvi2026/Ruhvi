-- Add AI and SEO Metadata columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS seo_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ai_content JSONB DEFAULT '{}'::jsonb;

-- Comment for PostgREST
COMMENT ON COLUMN public.products.seo_metadata IS 'JSON storing generated SEO data (meta title, description, focus keywords, tags)';
COMMENT ON COLUMN public.products.ai_content IS 'JSON storing generated AI search assets (bullet points, buying reasons, FAQs, summary)';
