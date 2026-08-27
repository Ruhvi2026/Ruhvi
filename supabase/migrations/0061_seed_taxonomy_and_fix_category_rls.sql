-- Migration: Seed empty categories & collections and fix category RLS for super_admin
-- Background: the categories and collections tables were empty in production while
-- products existed, and the categories RLS policies only allowed
-- ('admin','manager','staff'), which blocked super_admin client-side writes.

-- 1. Fix categories RLS so all admin roles (including super_admin) can manage them.
DROP POLICY IF EXISTS "Admin/Staff can insert categories" ON public.categories;
CREATE POLICY "Admin/Staff can insert categories"
  ON public.categories FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admin/Staff can update categories" ON public.categories;
CREATE POLICY "Admin/Staff can update categories"
  ON public.categories FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admin/Staff can delete categories" ON public.categories;
CREATE POLICY "Admin/Staff can delete categories"
  ON public.categories FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff', 'super_admin')
    )
  );

-- 2. Seed categories if empty (does not overwrite existing rows).
-- IDs match src/lib/products.ts INITIAL_CATEGORIES so code fallbacks stay consistent.
INSERT INTO public.categories (id, name, slug, image_url, is_hidden)
SELECT d.id, d.name, d.slug, d.image_url, false
FROM (VALUES
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Rings', 'rings', '/images/categories/rings.jpg'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Necklaces', 'necklaces', '/images/categories/necklaces.jpg'),
  ('a3333333-3333-3333-3333-333333333333'::uuid, 'Earrings', 'earrings', 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=400'),
  ('a4444444-4444-4444-4444-444444444444'::uuid, 'Bracelets', 'bracelets', 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=400'),
  ('a5555555-5555-5555-5555-555555555555'::uuid, 'Bangles', 'bangles', 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=400'),
  ('a6666666-6666-6666-6666-666666666666'::uuid, 'Pendants', 'pendants', '/images/categories/pendants.jpg'),
  ('a7777777-7777-7777-7777-777777777777'::uuid, 'Chains', 'chains', '/images/categories/chains.jpg'),
  ('a8888888-8888-8888-8888-888888888888'::uuid, 'Anklets', 'anklets', 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=400'),
  ('a9999999-9999-9999-9999-999999999999'::uuid, 'Nose Pins', 'nose-pins', 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=400'),
  ('b1111111-1111-1111-1111-111111111111'::uuid, 'Mangalsutra', 'mangalsutra', '/images/categories/mangalsutra.jpg'),
  ('b2222222-2222-2222-2222-222222222222'::uuid, 'Bridal Jewellery', 'bridal', '/images/categories/bridal.jpg'),
  ('b3333333-3333-3333-3333-333333333333'::uuid, 'Men''s Jewellery', 'mens', '/images/categories/mens.jpg'),
  ('b4444444-4444-4444-4444-444444444444'::uuid, 'Kids'' Jewellery', 'kids', 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=400')
) AS d(id, name, slug, image_url)
ON CONFLICT (slug) DO NOTHING;

-- 3. Seed collections if empty (does not overwrite existing rows).
INSERT INTO public.collections (id, title, slug, subtitle, image_url)
SELECT d.id, d.title, d.slug, d.subtitle, d.image_url
FROM (VALUES
  ('c1111111-1111-1111-1111-111111111111'::uuid, 'Gifts For Her', 'for-her', 'Timeless pieces designed to make her feel extraordinary.', '/images/categories/necklaces.jpg'),
  ('c2222222-2222-2222-2222-222222222222'::uuid, 'Gifts Under ₹15,000', 'under-15000', 'Beautiful 22K Gold jewellery that fits perfectly within budget.', 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80'),
  ('c3333333-3333-3333-3333-333333333333'::uuid, 'Anniversary Specials', 'anniversary', 'Celebrate your beautiful journey with the timeless elegance of gold and diamonds.', '/images/categories/rings.jpg'),
  ('c4444444-4444-4444-4444-444444444444'::uuid, 'Royal Bridal Collection', 'bridal', 'Handcrafted Kundan and Emerald sets for grand celebrations.', 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80')
) AS d(id, title, slug, subtitle, image_url)
ON CONFLICT (slug) DO NOTHING;
