-- H19: Product reviews/ratings on PDP (social proof)
-- Associate testimonials with products so the Product Detail Page can show
-- per-product reviews, average rating and verified-purchase badges.

-- Ensure the testimonials table exists (may not have been applied from 0007)
CREATE TABLE IF NOT EXISTS public.testimonials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    customer_name text NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text text NOT NULL,
    video_url text,
    is_verified_purchase boolean DEFAULT false,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Add column if the table already existed without it
ALTER TABLE public.testimonials
    ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_testimonials_product_id
    ON public.testimonials (product_id);

-- RLS: table-level
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Public read: anyone can read approved testimonials (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'testimonials'
        AND policyname = 'Public can view approved testimonials'
    ) THEN
        CREATE POLICY "Public can view approved testimonials"
            ON public.testimonials FOR SELECT
            USING (status = 'approved');
    END IF;
END $$;
