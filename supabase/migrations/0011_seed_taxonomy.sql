-- Seed Categories
INSERT INTO public.categories (id, name, slug, image_url) VALUES
('cat-1', 'Rings', 'rings', '/images/categories/rings.jpg'),
('cat-2', 'Necklaces', 'necklaces', '/images/categories/necklaces.jpg'),
('cat-3', 'Earrings', 'earrings', 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=400'),
('cat-4', 'Bracelets', 'bracelets', 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=400'),
('cat-5', 'Bangles', 'bangles', 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=400'),
('cat-6', 'Pendants', 'pendants', '/images/categories/pendants.jpg'),
('cat-7', 'Chains', 'chains', '/images/categories/chains.jpg'),
('cat-8', 'Anklets', 'anklets', 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=400'),
('cat-9', 'Nose Pins', 'nose-pins', 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=400'),
('cat-10', 'Mangalsutra', 'mangalsutra', '/images/categories/mangalsutra.jpg'),
('cat-11', 'Bridal Jewellery', 'bridal', '/images/categories/bridal.jpg'),
('cat-12', 'Men''s Jewellery', 'mens', '/images/categories/mens.jpg'),
('cat-13', 'Kids'' Jewellery', 'kids', 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=400')
ON CONFLICT (slug) DO UPDATE SET image_url = EXCLUDED.image_url;

-- Seed Collections
INSERT INTO public.collections (id, title, slug, subtitle, image_url) VALUES
('col-1', 'Gifts For Her', 'for-her', 'Timeless pieces designed to make her feel extraordinary.', '/images/categories/necklaces.jpg'),
('col-2', 'Gifts Under ₹15,000', 'under-15000', 'Beautiful 22K Gold jewellery that fits perfectly within budget.', 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80'),
('col-3', 'Anniversary Specials', 'anniversary', 'Celebrate your beautiful journey with the timeless elegance of gold and diamonds.', '/images/categories/rings.jpg')
ON CONFLICT (slug) DO UPDATE SET subtitle = EXCLUDED.subtitle, image_url = EXCLUDED.image_url;
