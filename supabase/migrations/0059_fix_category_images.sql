-- Fix broken category & collection thumbnail images
-- Replaces dead Unsplash URLs with local category images served from /public.
UPDATE public.categories SET image_url = '/images/categories/rings.jpg' WHERE slug = 'rings';
UPDATE public.categories SET image_url = '/images/categories/necklaces.jpg' WHERE slug = 'necklaces';
UPDATE public.categories SET image_url = '/images/categories/pendants.jpg' WHERE slug = 'pendants';
UPDATE public.categories SET image_url = '/images/categories/chains.jpg' WHERE slug = 'chains';
UPDATE public.categories SET image_url = '/images/categories/mangalsutra.jpg' WHERE slug = 'mangalsutra';
UPDATE public.categories SET image_url = '/images/categories/bridal.jpg' WHERE slug = 'bridal';
UPDATE public.categories SET image_url = '/images/categories/mens.jpg' WHERE slug = 'mens';

UPDATE public.collections SET image_url = '/images/categories/necklaces.jpg' WHERE slug = 'for-her';
UPDATE public.collections SET image_url = '/images/categories/rings.jpg' WHERE slug = 'anniversary';
