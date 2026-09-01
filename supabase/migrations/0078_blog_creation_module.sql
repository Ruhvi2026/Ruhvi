-- =============================================================================
-- 0078_blog_creation_module.sql
--
-- Blog Creation Module: create/extend blog_posts with SEO / author / workflow
-- fields, and create blog_media + blog_revisions tables. See
-- BLOG_CREATION_MODULE_SPEC.md.
--
-- IMPORTANT: this migration is SELF-CONTAINED. Some environments never applied
-- the original blog_posts schema (0007_phase6_marketing.sql), so this migration
-- first creates blog_posts (with the complete base + new schema) if it does not
-- exist, then safely applies any missing columns via ADD COLUMN IF NOT EXISTS
-- for environments where the table already exists.
--
-- Safety contract (additive only):
--   * Creates blog_posts if missing; otherwise only adds missing columns.
--   * Creates two NEW tables (blog_media, blog_revisions).
--   * Idempotent: CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS,
--     CREATE INDEX IF NOT EXISTS, DROP POLICY IF EXISTS before CREATE POLICY.
-- =============================================================================

-- ============================================================================
-- 1. blog_posts (create if missing — complete base + module schema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                   text NOT NULL,
  slug                    text NOT NULL UNIQUE,
  excerpt                 text,
  content                 text NOT NULL,
  cover_image             text,
  is_published            boolean DEFAULT false,
  published_at            timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  -- External API origin (0077)
  created_by_api_key      uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  -- Base editorial fields used by /api/external/blog + storefront
  tags                    text[] DEFAULT '{}',
  author                  text,
  -- SEO fields
  meta_title              text,
  meta_description        text,
  h1_tag                  text,
  seo_keywords            text[] DEFAULT '{}',
  canonical_url           text,
  -- Author & categorization
  author_id               uuid REFERENCES public.users(id) ON DELETE SET NULL,
  author_name             text,
  category                text,
  -- Media
  content_images          jsonb DEFAULT '[]'::jsonb,
  cover_image_alt         text,
  -- Workflow state
  status                  text NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'review', 'published', 'scheduled')),
  submitted_for_review_at timestamptz,
  reviewed_by             uuid REFERENCES public.users(id) ON DELETE SET NULL,
  review_notes            text,
  scheduled_publish_at    timestamptz
);

-- ============================================================================
-- 2. EXTEND blog_posts (no-ops when created above; adds columns to existing tables)
-- ============================================================================

-- SEO fields
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS h1_tag text,
  ADD COLUMN IF NOT EXISTS seo_keywords text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS canonical_url text;

-- Author & categorization
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS author_name text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS author text;

-- Media
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS content_images jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cover_image_alt text;

-- Workflow state (existing published rows roll forward as 'draft'; storefront
-- still shows them because is_published remains true)
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published', 'scheduled'));

-- Review / schedule timestamps
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz;

-- External API origin (no-op where 0077 already applied)
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS created_by_api_key uuid
    REFERENCES public.api_keys(id) ON DELETE SET NULL;

-- Useful index on workflow status + publish scheduling
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts (status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_scheduled ON public.blog_posts (scheduled_publish_at)
  WHERE status = 'scheduled';

-- ============================================================================
-- 3. RLS + policies for blog_posts
-- ============================================================================
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts (restores the 0007 policy for environments
-- where the base migration was never applied).
DROP POLICY IF EXISTS "Public can view published blog posts" ON public.blog_posts;
CREATE POLICY "Public can view published blog posts"
  ON public.blog_posts
  FOR SELECT
  USING (is_published = true);

-- Admin / staff sessions may read and manage blog posts. The external endpoint
-- and server actions use the service-role client, which bypasses RLS entirely.
DROP POLICY IF EXISTS "admins can manage blog_posts" ON public.blog_posts;
CREATE POLICY "admins can manage blog_posts"
  ON public.blog_posts
  FOR ALL
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- ============================================================================
-- 4. blog_media
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.blog_media (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         uuid REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  url             text NOT NULL,
  public_id       text NOT NULL DEFAULT '',
  alt_text        text NOT NULL DEFAULT '',
  width           integer,
  height          integer,
  file_size_bytes integer,
  mime_type       text DEFAULT 'image/webp',
  sort_order      integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_media_post ON public.blog_media (post_id);

ALTER TABLE public.blog_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins can manage blog_media" ON public.blog_media;
CREATE POLICY "admins can manage blog_media"
  ON public.blog_media
  FOR ALL
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- ============================================================================
-- 5. blog_revisions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.blog_revisions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  content    text NOT NULL,
  title      text NOT NULL,
  excerpt    text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_revisions_post ON public.blog_revisions (post_id, created_at DESC);

ALTER TABLE public.blog_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins can manage blog_revisions" ON public.blog_revisions;
CREATE POLICY "admins can manage blog_revisions"
  ON public.blog_revisions
  FOR ALL
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- ============================================================================
-- 6. Seed blog permissions for existing roles
--    (ADMIN and SUPER_ADMIN already have '*', so they are covered)
-- ============================================================================

-- Operations Manager: add blog CMS permissions alongside existing cms.*
DO $$
DECLARE
  v_role_id uuid;
  p text;
  perms text[] := ARRAY[
    'cms.blog', 'cms.blog.review', 'cms.blog.publish'
  ];
BEGIN
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'operations_manager';
  IF v_role_id IS NOT NULL THEN
    FOREACH p IN ARRAY perms LOOP
      INSERT INTO public.role_permissions (role_id, permission) VALUES (v_role_id, p) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- MANAGER: blog viewing + editing
DO $$
DECLARE
  v_role_id uuid;
  p text;
  perms text[] := ARRAY[
    'cms.blog', 'cms.blog.review'
  ];
BEGIN
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'MANAGER';
  IF v_role_id IS NOT NULL THEN
    FOREACH p IN ARRAY perms LOOP
      INSERT INTO public.role_permissions (role_id, permission) VALUES (v_role_id, p) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- STAFF: blog viewing only
DO $$
DECLARE
  v_role_id uuid;
  p text;
  perms text[] := ARRAY[
    'cms.blog'
  ];
BEGIN
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'STAFF';
  IF v_role_id IS NOT NULL THEN
    FOREACH p IN ARRAY perms LOOP
      INSERT INTO public.role_permissions (role_id, permission) VALUES (v_role_id, p) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;
