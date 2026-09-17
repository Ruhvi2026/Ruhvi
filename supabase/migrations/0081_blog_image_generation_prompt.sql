-- =============================================================================
-- 0081_blog_image_generation_prompt.sql
-- Add image_generation_prompt column to public.blog_posts table
-- =============================================================================

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS image_generation_prompt text;
