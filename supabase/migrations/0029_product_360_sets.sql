-- Create product_360_sets table
CREATE TABLE IF NOT EXISTS public.product_360_sets (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  enabled boolean not null default true,
  frame_count integer not null,
  step_degrees numeric null,
  frames jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id)
);

-- RLS Policies
ALTER TABLE public.product_360_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to product_360_sets"
  ON public.product_360_sets
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated admin full access to product_360_sets"
  ON public.product_360_sets
  FOR ALL
  USING (auth.role() = 'authenticated' AND (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'is_admin' = 'true'))
  WITH CHECK (auth.role() = 'authenticated' AND (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'is_admin' = 'true'));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_product_360_sets_updated_at
BEFORE UPDATE ON public.product_360_sets
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();
