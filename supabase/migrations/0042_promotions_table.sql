-- Migration: Create promotions table
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  discount_type text NOT NULL,
  discount_value numeric(12,2) NOT NULL,
  start_date timestamptz,
  end_date timestamptz,
  active boolean NOT NULL DEFAULT true,
  applicable_to text DEFAULT 'all',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public promotions are viewable by everyone"
  ON public.promotions FOR SELECT
  USING (true);

-- For mutations, relying on the service role / backend API
