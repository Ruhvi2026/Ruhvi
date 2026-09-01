-- =============================================================================
-- 0079_blog_likes.sql
--
-- Blog Likes: lets storefront visitors like a blog post (guest-friendly,
-- no login required). One row per (post, visitor). See BLOG_CREATION_MODULE_SPEC.md.
--
-- Safety contract (additive only):
--   * Creates one NEW table `blog_likes`. Does not alter any existing table.
--   * Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
--     DROP POLICY IF EXISTS before CREATE POLICY.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.blog_likes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  visitor_key text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  -- One like per visitor per post
  CONSTRAINT blog_likes_post_visitor_key UNIQUE (post_id, visitor_key)
);

CREATE INDEX IF NOT EXISTS idx_blog_likes_post ON public.blog_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_blog_likes_visitor ON public.blog_likes (visitor_key);

ALTER TABLE public.blog_likes ENABLE ROW LEVEL SECURITY;

-- Public can read like counts (aggregates) — no visitor identity is exposed.
DROP POLICY IF EXISTS "public can read blog_likes" ON public.blog_likes;
CREATE POLICY "public can read blog_likes"
  ON public.blog_likes
  FOR SELECT
  USING (true);

-- Admins / staff can manage likes (cleanup, moderation).
DROP POLICY IF EXISTS "admins can manage blog_likes" ON public.blog_likes;
CREATE POLICY "admins can manage blog_likes"
  ON public.blog_likes
  FOR ALL
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());
