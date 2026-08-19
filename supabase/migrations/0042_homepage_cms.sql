-- Migration 0042: Homepage CMS (Hero Slides)

CREATE TABLE public.hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text NOT NULL,
  button_text text,
  button_link text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view active hero slides"
  ON public.hero_slides FOR SELECT USING (is_active = true);

CREATE POLICY "Admin/Staff can view all hero slides"
  ON public.hero_slides FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff', 'super_admin', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admin/Staff with cms.edit can insert hero slides"
  ON public.hero_slides FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff', 'super_admin', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admin/Staff with cms.edit can update hero slides"
  ON public.hero_slides FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff', 'super_admin', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admin/Staff with cms.edit can delete hero slides"
  ON public.hero_slides FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff', 'super_admin', 'SUPER_ADMIN')
    )
  );

-- Seed Initial Slide
INSERT INTO public.hero_slides (title, subtitle, image_url, button_text, button_link, sort_order)
VALUES (
  'Timeless Elegance',
  'Discover our new collection of handcrafted diamond jewelry designed to last a lifetime.',
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=2000&auto=format&fit=crop',
  'Shop Collection',
  '/categories/bridal',
  1
) ON CONFLICT DO NOTHING;
