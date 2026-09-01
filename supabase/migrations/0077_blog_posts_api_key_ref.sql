-- =============================================================================
-- 0077_blog_posts_api_key_ref.sql
--
-- Adds a nullable `created_by_api_key` column to `blog_posts` so that posts
-- created via POST /api/external/blog can be traced back to the originating
-- API key (its UUID, not the hash).
--
-- Safety contract (additive only):
--   * One new nullable column on an existing table.
--   * No existing column, index, policy, or row is changed.
--   * Idempotent: ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
-- =============================================================================

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS created_by_api_key uuid
    REFERENCES public.api_keys (id) ON DELETE SET NULL;
