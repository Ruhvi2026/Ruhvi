-- Migration 0106: AI Co-Founder Competitor Intelligence & Catalog SEO Audits

CREATE TABLE IF NOT EXISTS public.co_founder_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  category TEXT DEFAULT 'Fine Jewellery',
  notes TEXT,
  last_analyzed_at TIMESTAMPTZ,
  latest_insights JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalog_seo_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_products INT DEFAULT 0,
  missing_meta_descriptions INT DEFAULT 0,
  missing_alt_text INT DEFAULT 0,
  low_word_count INT DEFAULT 0,
  health_score NUMERIC DEFAULT 100,
  findings JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.co_founder_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_seo_audits ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DROP POLICY IF EXISTS "Service role full access on co_founder_competitors" ON public.co_founder_competitors;
CREATE POLICY "Service role full access on co_founder_competitors" ON public.co_founder_competitors
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on catalog_seo_audits" ON public.catalog_seo_audits;
CREATE POLICY "Service role full access on catalog_seo_audits" ON public.catalog_seo_audits
  FOR ALL TO service_role USING (true) WITH CHECK (true);
