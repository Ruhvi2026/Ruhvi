-- Phase 6: Marketing & Growth
-- Create tables for Blogs, Testimonials, and Subscribers

-- 1. Blog Posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    slug text NOT NULL UNIQUE,
    excerpt text,
    content text NOT NULL,
    cover_image text,
    is_published boolean DEFAULT false,
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Testimonials
CREATE TABLE IF NOT EXISTS public.testimonials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    customer_name text NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text text NOT NULL,
    video_url text,
    is_verified_purchase boolean DEFAULT false,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Subscribers (Newsletter & WhatsApp)
CREATE TABLE IF NOT EXISTS public.subscribers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE,
    phone text UNIQUE,
    opted_in_whatsapp boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT must_have_contact CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- RLS Policies
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Blog Posts: Anyone can read published posts
CREATE POLICY "Public can view published blog posts"
    ON public.blog_posts FOR SELECT
    USING (is_published = true);

-- Testimonials: Anyone can read approved testimonials
CREATE POLICY "Public can view approved testimonials"
    ON public.testimonials FOR SELECT
    USING (status = 'approved');

-- Subscribers: Only admins can view subscribers
CREATE POLICY "Admins can view subscribers"
    ON public.subscribers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Subscribers: Anyone can insert (subscribe)
CREATE POLICY "Anyone can subscribe"
    ON public.subscribers FOR INSERT
    WITH CHECK (true);
